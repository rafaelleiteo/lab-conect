import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listPendingReviews, setReviewStatus } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/revisoes")({
  component: AdminRevisoes,
});

function AdminRevisoes() {
  const fetchList = useServerFn(listPendingReviews);
  const setStatus = useServerFn(setReviewStatus);
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "revisoes"],
    queryFn: () => fetchList(),
  });

  async function act(kind: "lab" | "dentist", id: string, status: "confirmado" | "cancelado") {
    setBusy(`${kind}-${id}`);
    try {
      await setStatus({ data: { kind, id, status } });
      await refetch();
      router.invalidate();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Revisões pendentes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastros aguardando confirmação da ConnectLabs.
        </p>
      </header>

      <Section title="Laboratórios">
        {isLoading ? (
          <Empty>Carregando…</Empty>
        ) : (data?.labs.length ?? 0) === 0 ? (
          <Empty>Nenhum laboratório pendente.</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-1 text-xs uppercase text-muted-foreground">
              <tr>
                <Th>Nome</Th>
                <Th>Subdomínio</Th>
                <Th>Assinatura</Th>
                <Th>Criado em</Th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data!.labs.map((l: any) => (
                <tr key={l.id}>
                  <Td className="font-medium text-foreground">{l.nome}</Td>
                  <Td className="font-mono text-xs text-muted-foreground">{l.subdominio}</Td>
                  <Td className="text-xs">{l.assinatura_status}</Td>
                  <Td className="text-xs text-muted-foreground">
                    {new Date(l.criado_em).toLocaleDateString("pt-BR")}
                  </Td>
                  <Td className="text-right space-x-2">
                    <Btn
                      variant="primary"
                      disabled={busy === `lab-${l.id}`}
                      onClick={() => act("lab", l.id, "confirmado")}
                    >
                      Confirmar
                    </Btn>
                    <Btn
                      variant="ghost"
                      disabled={busy === `lab-${l.id}`}
                      onClick={() => act("lab", l.id, "cancelado")}
                    >
                      Cancelar
                    </Btn>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Dentistas">
        {isLoading ? (
          <Empty>Carregando…</Empty>
        ) : (data?.dentists.length ?? 0) === 0 ? (
          <Empty>Nenhum dentista pendente.</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-1 text-xs uppercase text-muted-foreground">
              <tr>
                <Th>Nome</Th>
                <Th>E-mail</Th>
                <Th>CRO</Th>
                <Th>Criado em</Th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data!.dentists.map((d: any) => (
                <tr key={d.id}>
                  <Td className="font-medium text-foreground">{d.nome}</Td>
                  <Td className="text-xs text-muted-foreground">{d.email}</Td>
                  <Td className="text-xs">
                    {d.cro ?? "—"}
                    {d.uf ? `/${d.uf}` : ""}
                  </Td>
                  <Td className="text-xs text-muted-foreground">
                    {new Date(d.criado_em).toLocaleDateString("pt-BR")}
                  </Td>
                  <Td className="text-right space-x-2">
                    <Btn
                      variant="primary"
                      disabled={busy === `dentist-${d.id}`}
                      onClick={() => act("dentist", d.id, "confirmado")}
                    >
                      Confirmar
                    </Btn>
                    <Btn
                      variant="ghost"
                      disabled={busy === `dentist-${d.id}`}
                      onClick={() => act("dentist", d.id, "cancelado")}
                    >
                      Cancelar
                    </Btn>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] overflow-hidden">
      <header className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="p-6 text-sm text-muted-foreground">{children}</div>;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-2 font-medium">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className ?? ""}`}>{children}</td>;
}
function Btn({
  children,
  onClick,
  disabled,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant: "primary" | "ghost";
}) {
  const base = "rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60";
  const cls =
    variant === "primary"
      ? `${base} bg-primary text-primary-foreground hover:bg-primary-hover`
      : `${base} border border-border text-muted-foreground hover:bg-surface-1`;
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}
