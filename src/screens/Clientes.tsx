import { dentists } from "@/data/mock";

export function Clientes() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Clientes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dentistas vinculados ao seu laboratório</p>
      </header>

      <section className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)]">
        <ul className="divide-y divide-border">
          {dentists.map((d) => {
            const initials = d.name.replace(/^(Dr\.|Dra\.)\s+/, "").split(" ").map((w) => w[0]).join("").slice(0, 2);
            const badge = d.status === "ativo" ? "bg-success-tint text-success" : "bg-warning-tint text-warning";
            return (
              <li key={d.name} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 sm:grid-cols-[auto_minmax(0,1fr)_100px_auto]">
                <div className="shrink-0 h-10 w-10 rounded-full bg-primary-tint text-primary-tint-foreground grid place-items-center text-sm font-semibold">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{d.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{d.clinic}</div>
                </div>
                <div className="hidden text-sm text-muted-foreground sm:block font-mono">
                  {d.orders} pedidos
                </div>
                <span className={`justify-self-end inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize ${badge}`}>
                  {d.status}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
