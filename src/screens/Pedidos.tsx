import { orders, stageLabels, stageOrder, type OrderStage } from "@/data/mock";

const stageAccent: Record<OrderStage, { bg: string; text: string; dot: string }> = {
  recebido: { bg: "bg-info-tint", text: "text-info", dot: "#2D6FDB" },
  producao: { bg: "bg-primary-tint", text: "text-primary-tint-foreground", dot: "#4C5FF5" },
  cq: { bg: "bg-warning-tint", text: "text-warning", dot: "#9A6710" },
  pronto: { bg: "bg-success-tint", text: "text-success", dot: "#28854F" },
  entregue: { bg: "bg-surface-1", text: "text-muted-foreground", dot: "#9497A6" },
};

export function Pedidos() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Pedidos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Etapas configuráveis pelo laboratório</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stageOrder.map((stage) => {
          const items = orders.filter((o) => o.stage === stage);
          const a = stageAccent[stage];
          return (
            <div key={stage} className="flex flex-col rounded-2xl bg-surface-1 border border-border min-h-[300px]">
              <div className={`flex items-center justify-between rounded-t-2xl px-4 py-3 ${a.bg}`}>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a.dot }} />
                  <span className={`text-xs font-semibold uppercase tracking-wider ${a.text}`}>{stageLabels[stage]}</span>
                </div>
                <span className={`text-xs font-mono ${a.text}`}>{items.length}</span>
              </div>
              <div className="p-3 space-y-3 flex-1">
                {items.map((o) => (
                  <article
                    key={o.code}
                    className="rounded-xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-3"
                    style={{ borderTop: `2px dashed ${a.dot}` }}
                  >
                    <div className="font-mono text-xs text-muted-foreground">{o.code}</div>
                    <div className="mt-1 text-sm font-semibold text-foreground">{o.product}</div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {o.dentist} · <span className="font-mono">{o.patient}</span>
                    </div>
                    <div className="mt-2 text-xs text-subtle-foreground font-mono">Entrega {o.delivery}</div>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
