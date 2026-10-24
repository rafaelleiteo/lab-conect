import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentLab } from "@/hooks/useCurrentLab";

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

interface OrderItem {
  id: string;
  criado_em: string;
  valor: number | string | null;
  status: string;
  dentist_id: string | null;
  nome_dentista_pendente?: string | null;
  dentists?: {
    nome?: string | null;
  } | null;
  products?: {
    nome?: string | null;
  } | null;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatCurrency(val: number | string | null): string {
  const num = Number(val) || 0;
  return `R$ ${num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function Financeiro() {
  const { lab } = useCurrentLab();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [monthFilter, setMonthFilter] = useState<"current" | "previous" | "all">("current");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (!lab) return;
    loadFinanceOrders();
  }, [lab?.id]);

  async function loadFinanceOrders() {
    if (!lab) return;
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("id, criado_em, valor, status, dentist_id, nome_dentista_pendente, dentists(nome), products(nome)")
      .eq("lab_id", lab.id)
      .neq("status", "rascunho")
      .order("criado_em", { ascending: false });

    setOrders((data ?? []) as unknown as OrderItem[]);
    setLoading(false);
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = prevMonthDate.getMonth();

  // Valor dos pedidos no mês corrente
  const valorMesCorrente = orders
    .filter((o) => {
      const d = new Date(o.criado_em);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    })
    .reduce((sum, o) => sum + (Number(o.valor) || 0), 0);

  // Filtragem dos pedidos
  const filteredOrders = orders.filter((o) => {
    const d = new Date(o.criado_em);
    if (monthFilter === "current") {
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }
    if (monthFilter === "previous") {
      return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages);
  const pagedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Financeiro</h1>
        <p className="mt-1 text-sm text-muted-foreground">Faturamento e movimentação dos pedidos</p>
      </header>

      {/* Card de Faturamento do mês */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-surface-1 border border-border p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Valor dos pedidos no mês
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {loading ? "…" : formatCurrency(valorMesCorrente)}
          </div>
        </div>
      </div>

      {/* Tabela de pedidos */}
      <section className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Pedidos do laboratório</h2>

          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Período:</label>
            <select
              value={monthFilter}
              onChange={(e) => {
                setMonthFilter(e.target.value as any);
                setPage(1);
              }}
              className="rounded-lg border border-border bg-surface-1 px-2.5 py-1 text-xs text-foreground outline-none"
            >
              <option value="current">Mês atual</option>
              <option value="previous">Mês anterior</option>
              <option value="all">Todos os meses</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Carregando dados financeiros…</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhum pedido registrado para o período selecionado.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-1/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-6 py-3 font-medium">Data</th>
                    <th className="px-6 py-3 font-medium">Código</th>
                    <th className="px-6 py-3 font-medium">Dentista</th>
                    <th className="px-6 py-3 font-medium">Produto</th>
                    <th className="px-6 py-3 font-medium">Valor</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pagedOrders.map((o) => {
                    const shortCode = `#${o.id.slice(0, 8)}`;
                    const dentistName =
                      o.dentists?.nome || o.nome_dentista_pendente || "Dentista";
                    const productName = o.products?.nome || "Serviço";
                    const badgeClass = stageBadge[o.status] || "bg-surface-1 text-muted-foreground";
                    const badgeText = stageLabelShort[o.status] || o.status;

                    return (
                      <tr key={o.id} className="hover:bg-surface-1/50">
                        <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground">
                          {formatDate(o.criado_em)}
                        </td>
                        <td className="px-6 py-3.5 font-mono text-xs font-medium text-foreground">
                          {shortCode}
                        </td>
                        <td className="px-6 py-3.5 text-foreground truncate max-w-[180px]">
                          {dentistName}
                        </td>
                        <td className="px-6 py-3.5 text-foreground truncate max-w-[200px]">
                          {productName}
                        </td>
                        <td className="px-6 py-3.5 font-mono font-medium text-foreground">
                          {formatCurrency(o.valor)}
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}
                          >
                            {badgeText}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-border text-xs text-muted-foreground">
                <span>
                  Página {currentPage} de {totalPages} ({filteredOrders.length} pedidos)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded border border-border px-2.5 py-1 hover:bg-surface-1 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded border border-border px-2.5 py-1 hover:bg-surface-1 disabled:opacity-50"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Nota informativa fixa */}
      <div className="rounded-xl bg-surface-1 border border-border p-4 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Nota:</span> A conciliação de pagamentos será ativada junto com a cobrança pela plataforma.
      </div>
    </div>
  );
}
