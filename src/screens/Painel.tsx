import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentLab } from "@/hooks/useCurrentLab";
import { DivulgueLojaCard } from "@/components/DivulgueLojaCard";

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

interface OrderRow {
  id: string;
  status: string;
  valor: number | string | null;
  data_desejada: string | null;
  criado_em: string;
  dentist_id: string | null;
  cro_pendente?: string | null;
  uf_pendente?: string | null;
  nome_dentista_pendente?: string | null;
  dentists?: {
    nome?: string | null;
    cro?: string | null;
    uf?: string | null;
  } | null;
  products?: {
    nome?: string | null;
    prazo_dias?: number | null;
  } | null;
}

function addBusinessDays(startDate: Date, days: number): Date {
  const current = new Date(startDate);
  let added = 0;
  while (added < days) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }
  return current;
}

function isOrderOverdue(order: OrderRow): boolean {
  if (order.status === "entregue" || order.status === "rascunho") return false;
  const now = new Date();

  if (order.data_desejada) {
    const desired = new Date(`${order.data_desejada}T23:59:59`);
    return now > desired;
  }

  const prazo = order.products?.prazo_dias;
  if (prazo && prazo > 0) {
    const created = new Date(order.criado_em);
    const deadline = addBusinessDays(created, prazo);
    deadline.setHours(23, 59, 59, 999);
    return now > deadline;
  }

  return false;
}

function Metric({
  label,
  value,
  tone = "default",
  tooltip,
}: {
  label: string;
  value: string;
  tone?: "default" | "error";
  tooltip?: string;
}) {
  const bg = tone === "error" ? "bg-error-tint" : "bg-surface-1";
  const valueColor = tone === "error" ? "text-error" : "text-foreground";
  return (
    <div className={`${bg} rounded-2xl p-5 border border-border`} title={tooltip}>
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        {tooltip && (
          <span className="text-[10px] cursor-help lowercase text-muted-foreground underline decoration-dotted" title={tooltip}>
            info
          </span>
        )}
      </div>
      <div className={`mt-2 text-3xl font-bold ${valueColor}`}>{value}</div>
      {tooltip && (
        <div className="mt-1 text-[11px] text-muted-foreground truncate" title={tooltip}>
          {tooltip}
        </div>
      )}
    </div>
  );
}

export function Painel({
  onNavigateToMyParcLab,
}: {
  onNavigateToMyParcLab?: () => void;
}) {
  const { lab } = useCurrentLab();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [entreguesNoMes, setEntreguesNoMes] = useState(0);
  const [dentistasVinculados, setDentistasVinculados] = useState(0);

  useEffect(() => {
    if (!lab) return;
    loadDashboardData();
  }, [lab?.id]);

  async function loadDashboardData() {
    if (!lab) return;
    setLoading(true);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [ordersRes, linksRes, eventsRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id, status, valor, data_desejada, criado_em, dentist_id, cro_pendente, uf_pendente, nome_dentista_pendente, dentists(nome, cro, uf), products(nome, prazo_dias)")
        .eq("lab_id", lab.id)
        .neq("status", "rascunho")
        .order("criado_em", { ascending: false }),
      supabase
        .from("dentist_lab_links")
        .select("id", { count: "exact", head: true })
        .eq("lab_id", lab.id),
      supabase
        .from("order_events")
        .select("order_id")
        .eq("para_status", "entregue")
        .gte("criado_em", startOfMonth),
    ]);

    const labOrders = (ordersRes.data ?? []) as unknown as OrderRow[];
    setOrders(labOrders);
    setDentistasVinculados(linksRes.count ?? 0);

    const labOrderIds = new Set(labOrders.map((o) => o.id));
    const deliveredIds = new Set<string>();

    eventsRes.data?.forEach((ev: any) => {
      if (labOrderIds.has(ev.order_id)) {
        deliveredIds.add(ev.order_id);
      }
    });

    labOrders.forEach((o) => {
      if (o.status === "entregue" && o.criado_em >= startOfMonth) {
        deliveredIds.add(o.id);
      }
    });

    setEntreguesNoMes(deliveredIds.size);
    setLoading(false);
  }

  const emAndamentoCount = orders.filter((o) =>
    ["recebido", "producao", "cq", "pronto"].includes(o.status)
  ).length;

  const atrasadosCount = orders.filter((o) => isOrderOverdue(o)).length;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const valorMesTotal = orders
    .filter((o) => o.criado_em >= startOfMonth)
    .reduce((acc, o) => acc + (Number(o.valor) || 0), 0);

  const valorMesFmt = `R$ ${valorMesTotal.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Painel</h1>
        <p className="mt-1 text-sm text-muted-foreground">Visão geral da operação de hoje</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Metric
          label="Em andamento"
          value={loading ? "…" : String(emAndamentoCount)}
        />
        <Metric
          label="Entregues no mês"
          value={loading ? "…" : String(entreguesNoMes)}
        />
        <Metric
          label="Atrasados"
          value={loading ? "…" : String(atrasadosCount)}
          tone={atrasadosCount > 0 ? "error" : "default"}
          tooltip="Calculado em dias úteis, sem considerar feriados."
        />
        <Metric
          label="Valor dos pedidos no mês"
          value={loading ? "…" : valorMesFmt}
        />
        <Metric
          label="Dentistas vinculados"
          value={loading ? "…" : String(dentistasVinculados)}
        />
      </div>

      {/* Bloco compacto: Divulgue sua loja */}
      <DivulgueLojaCard
        lab={lab}
        variant="compact"
        onOpenFullSettings={onNavigateToMyParcLab}
      />

      <section className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)]">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Pedidos recentes</h2>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Carregando pedidos…</div>
        ) : recentOrders.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Ainda não há pedidos. Compartilhe o link da sua loja em Divulgue sua loja.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {recentOrders.map((o) => {
              const shortCode = `#${o.id.slice(0, 8)}`;
              const productName = o.products?.nome || "Serviço";
              const dentistName =
                o.dentists?.nome || o.nome_dentista_pendente || "Dentista";
              const badgeClass = stageBadge[o.status] || "bg-surface-1 text-muted-foreground";
              const badgeText = stageLabelShort[o.status] || o.status;

              return (
                <li
                  key={o.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 py-4 sm:grid-cols-[110px_minmax(0,1fr)_minmax(0,1fr)_auto]"
                >
                  <span className="font-mono text-sm text-muted-foreground">{shortCode}</span>
                  <span className="truncate text-sm font-medium text-foreground">{productName}</span>
                  <span className="hidden truncate text-sm text-muted-foreground sm:block">
                    {dentistName}
                  </span>
                  <span
                    className={`justify-self-end inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${badgeClass}`}
                  >
                    {badgeText}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
