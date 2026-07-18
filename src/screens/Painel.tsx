import { orders } from "@/data/mock";

const stageBadge: Record<string, string> = {
  recebido: "bg-info-tint text-info",
  producao: "bg-primary-tint text-primary-tint-foreground",
  cq: "bg-warning-tint text-warning",
  pronto: "bg-success-tint text-success",
  entregue: "bg-surface-1 text-muted-foreground",
};

const stageLabelShort: Record<string, string> = {
  recebido: "Recebido",
  producao: "Em produção",
  cq: "Controle de qualidade",
  pronto: "Pronto",
  entregue: "Entregue",
};

function Metric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "error" }) {
  const bg = tone === "error" ? "bg-error-tint" : "bg-surface-1";
  const valueColor = tone === "error" ? "text-error" : "text-foreground";
  return (
    <div className={`${bg} rounded-2xl p-5 border border-border`}>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 text-3xl font-bold ${valueColor}`}>{value}</div>
    </div>
  );
}

export function Painel() {
  const recent = orders.slice(0, 4);
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Painel</h1>
        <p className="mt-1 text-sm text-muted-foreground">Visão geral da operação de hoje</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Metric label="Em andamento" value="18" />
        <Metric label="Entregues no mês" value="64" />
        <Metric label="Atrasados" value="3" tone="error" />
        <Metric label="Faturamento" value="R$ 58.400" />
        <Metric label="Dentistas ativos" value="37" />
      </div>

      <section className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)]">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Pedidos recentes</h2>
        </div>
        <ul className="divide-y divide-border">
          {recent.map((o) => (
            <li key={o.code} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 py-4 sm:grid-cols-[110px_minmax(0,1fr)_minmax(0,1fr)_auto]">
              <span className="font-mono text-sm text-muted-foreground">{o.code}</span>
              <span className="truncate text-sm font-medium text-foreground">{o.product}</span>
              <span className="hidden truncate text-sm text-muted-foreground sm:block">{o.dentist}</span>
              <span className={`justify-self-end inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${stageBadge[o.stage]}`}>
                {stageLabelShort[o.stage]}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
