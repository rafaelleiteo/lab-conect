import { useEffect, useState } from "react";
import { IconAlertTriangle, IconUsers, IconPhone, IconMail, IconCalendar, IconShare } from "@tabler/icons-react";
import { useCurrentLab } from "@/hooks/useCurrentLab";
import { supabase } from "@/integrations/supabase/client";

type LinkedDentist = {
  linkId: string;
  dentistId: string;
  nome: string;
  email: string;
  cro: string | null;
  uf: string | null;
  telefone: string | null;
  revisao_status: string;
  dataVinculo: string;
  origem: string | null;
  ordersCount: number;
};

export function Clientes() {
  const { lab, loading: labLoading } = useCurrentLab();
  const [dentistsList, setDentistsList] = useState<LinkedDentist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lab) return;

    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        // 1. Buscar vinculos do laboratorio com dados do dentista
        const { data: links, error: linkErr } = await supabase
          .from("dentist_lab_links")
          .select(`
            id,
            dentist_id,
            criado_em,
            origem,
            dentists (
              id,
              nome,
              email,
              cro,
              uf,
              telefone,
              revisao_status
            )
          `)
          .eq("lab_id", lab.id)
          .order("criado_em", { ascending: false });

        if (linkErr) {
          console.error("Erro ao carregar clientes do laboratorio:", linkErr);
          if (mounted) setLoading(false);
          return;
        }

        // 2. Contar pedidos reais (sem contar rascunhos)
        const { data: orderRows } = await supabase
          .from("orders")
          .select("dentist_id")
          .eq("lab_id", lab.id)
          .neq("status", "rascunho");

        const countsByDentist: Record<string, number> = {};
        for (const o of orderRows ?? []) {
          if (o.dentist_id) {
            countsByDentist[o.dentist_id] = (countsByDentist[o.dentist_id] || 0) + 1;
          }
        }

        const mapped: LinkedDentist[] = [];
        for (const item of (links ?? []) as any[]) {
          const d = item.dentists;
          if (!d) continue;

          mapped.push({
            linkId: item.id,
            dentistId: item.dentist_id,
            nome: d.nome || "Dentista sem nome",
            email: d.email || "",
            cro: d.cro,
            uf: d.uf,
            telefone: d.telefone,
            revisao_status: d.revisao_status || "pendente",
            dataVinculo: item.criado_em,
            origem: item.origem,
            ordersCount: countsByDentist[item.dentist_id] || 0,
          });
        }

        if (mounted) {
          setDentistsList(mapped);
          setLoading(false);
        }
      } catch (err) {
        console.error("Falha ao processar clientes:", err);
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [lab]);

  if (labLoading || loading) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Dentistas vinculados ao seu laboratório</p>
        </header>
        <div className="rounded-2xl bg-surface-2 border border-border p-8 text-center text-sm text-muted-foreground">
          Carregando clientes...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Dentistas vinculados ao seu laboratório</p>
        </div>
        <div className="text-xs text-muted-foreground font-medium bg-surface-2 border border-border px-3 py-1.5 rounded-lg w-fit">
          Total: <strong className="text-foreground">{dentistsList.length}</strong> {dentistsList.length === 1 ? "dentista" : "dentistas"}
        </div>
      </header>

      {dentistsList.length === 0 ? (
        <section className="rounded-2xl bg-surface-2 border border-border p-12 text-center shadow-[var(--shadow-soft)]">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary-tint text-primary flex items-center justify-center mb-3">
            <IconUsers size={24} />
          </div>
          <h3 className="text-base font-semibold text-foreground">Ainda não há dentistas vinculados.</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            Compartilhe o link da sua loja em Divulgue sua loja.
          </p>
        </section>
      ) : (
        <section className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] overflow-hidden">
          <ul className="divide-y divide-border">
            {dentistsList.map((d) => {
              const initials = (d.nome || "D")
                .replace(/^(Dr\.|Dra\.)\s+/i, "")
                .split(" ")
                .filter(Boolean)
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              const croFormatado = d.cro ? `CRO-${d.uf || ""} ${d.cro}`.trim() : "CRO não informado";
              const dataFormatada = d.dataVinculo
                ? new Date(d.dataVinculo).toLocaleDateString("pt-BR")
                : "";

              return (
                <li
                  key={d.linkId}
                  className="grid grid-cols-1 sm:grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-6 py-4 hover:bg-surface-1/50 transition"
                >
                  <div className="shrink-0 h-11 w-11 rounded-full bg-primary-tint text-primary-tint-foreground grid place-items-center text-sm font-bold">
                    {initials}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">{d.nome}</span>
                      <span className="text-xs font-mono font-medium text-muted-foreground bg-surface-1 border border-border px-2 py-0.5 rounded">
                        {croFormatado}
                      </span>
                      {d.revisao_status === "pendente" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-warning bg-warning-tint px-2 py-0.5 rounded-full">
                          <IconAlertTriangle size={12} />
                          CRO não verificado
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {d.email && (
                        <span className="inline-flex items-center gap-1 truncate">
                          <IconMail size={13} className="shrink-0 text-muted-foreground/70" />
                          {d.email}
                        </span>
                      )}
                      {d.telefone && (
                        <span className="inline-flex items-center gap-1">
                          <IconPhone size={13} className="shrink-0 text-muted-foreground/70" />
                          {d.telefone}
                        </span>
                      )}
                      {dataFormatada && (
                        <span className="inline-flex items-center gap-1">
                          <IconCalendar size={13} className="shrink-0 text-muted-foreground/70" />
                          Vínculo: {dataFormatada}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                    <span className="text-xs font-semibold font-mono text-foreground">
                      {d.ordersCount} {d.ordersCount === 1 ? "pedido" : "pedidos"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-surface-1 border border-border px-2 py-0.5 rounded-full">
                      <IconShare size={10} />
                      {d.origem || "direto"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
