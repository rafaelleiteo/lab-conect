import { financeEntries } from "@/data/mock";

function fmt(n: number) {
  const abs = Math.abs(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? "−" : ""}R$ ${abs}`;
}

export function Financeiro() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Financeiro</h1>
        <p className="mt-1 text-sm text-muted-foreground">Recebimentos e comissões do mês</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-surface-1 border border-border p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Recebido no mês</div>
          <div className="mt-2 text-2xl font-bold text-foreground">R$ 52.100</div>
        </div>
        <div className="rounded-2xl bg-surface-1 border border-border p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">A receber</div>
          <div className="mt-2 text-2xl font-bold text-foreground">R$ 6.300</div>
        </div>
        <div className="rounded-2xl bg-primary-tint border border-border p-5">
          <div className="text-xs uppercase tracking-wider text-primary-tint-foreground font-medium">Comissão Parc Labs · 2%</div>
          <div className="mt-2 text-2xl font-bold text-primary-tint-foreground">R$ 1.042</div>
        </div>
      </div>

      <section className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)]">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Extrato recente</h2>
        </div>
        <ul className="divide-y divide-border">
          {financeEntries.map((e, i) => (
            <li key={i} className="grid grid-cols-[60px_minmax(0,1fr)_auto] items-center gap-4 px-6 py-3.5">
              <span className="font-mono text-xs text-muted-foreground">{e.date}</span>
              <span className="truncate text-sm text-foreground">{e.description}</span>
              <span className={`font-mono text-sm font-medium ${e.kind === "entrada" ? "text-success" : "text-muted-foreground"}`}>
                {fmt(e.amount)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
