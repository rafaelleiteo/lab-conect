import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type Lab = {
  id: string;
  nome: string;
  subdominio: string;
  modo_recebimento: string;
  asaas_wallet_id: string | null;
};

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminLabsList,
});

function AdminLabsList() {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("labs")
        .select("id, nome, subdominio, modo_recebimento, asaas_wallet_id")
        .order("criado_em", { ascending: false });
      setLabs((data ?? []) as Lab[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Laboratórios</h1>
        <p className="mt-1 text-sm text-muted-foreground">Laboratórios cadastrados na LabConect</p>
      </header>
      <section className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-1 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Nome</th>
                <th className="text-left px-4 py-2 font-medium">Subdomínio</th>
                <th className="text-left px-4 py-2 font-medium">Modo</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {labs.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-medium text-foreground">{l.nome}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {l.subdominio}.connectlabs.com.br
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-primary-tint px-2 py-0.5 text-xs text-primary-tint-foreground">
                      {l.modo_recebimento === "plataforma" ? "Via LabConect" : "Gestão própria"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {l.modo_recebimento === "plataforma" && !l.asaas_wallet_id ? (
                      <span className="text-xs text-warning">Wallet pendente</span>
                    ) : (
                      <span className="text-xs text-success">Ativo</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to="/admin/labs/$id"
                      params={{ id: l.id }}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Configurar →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
