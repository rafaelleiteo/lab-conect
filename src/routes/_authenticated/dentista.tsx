import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  IconLogout,
  IconPackage,
  IconList,
  IconCopy,
  IconCheck,
  IconChevronDown,
  IconPlus,
  IconBuildingStore,
  IconBook2,
} from "@tabler/icons-react";
import { ParcLabsLogo } from "@/components/ParcLabsLogo";
import { LabAvatar } from "@/components/LabAvatar";
import { supabase } from "@/integrations/supabase/client";
import { createOrderPayment, getPaymentStatus } from "@/lib/payments.functions";

type PaymentInfo = {
  paymentId: string;
  status: string;
  invoiceUrl?: string;
  pixPayload?: string;
  pixQrImageBase64?: string;
};

type Product = { id: string; nome: string; preco: number; prazo_dias: number; lab_id: string };
type Dentist = { id: string; nome: string; email: string };
type Lab = {
  id: string;
  nome: string;
  subdominio: string;
  logo_url: string | null;
  visivel_diretorio: boolean;
};
type Order = {
  id: string;
  status: string;
  valor: number;
  paciente: string | null;
  criado_em: string;
  lab_id: string;
  products: { nome: string } | null;
};
type AcademyContent = {
  id: string;
  tipo: "ebook" | "curso" | "tutorial";
  titulo: string;
  descricao: string;
  url_conteudo: string;
  capa_url: string | null;
  criado_em: string;
};

export const Route = createFileRoute("/_authenticated/dentista")({
  component: DentistPortal,
});

const statusLabels: Record<string, string> = {
  recebido: "Recebido",
  producao: "Em produção",
  cq: "Controle de qualidade",
  pronto: "Pronto",
  entregue: "Entregue",
};

function DentistPortal() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"loja" | "pedidos" | "academy">("loja");
  const [dentist, setDentist] = useState<Dentist | null>(null);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [currentLabId, setCurrentLabId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [academy, setAcademy] = useState<AcademyContent[]>([]);
  const [academyLoading, setAcademyLoading] = useState(true);
  const [selected, setSelected] = useState<Product | null>(null);
  const [paciente, setPaciente] = useState("");
  const [creating, setCreating] = useState(false);
  const [paymentFor, setPaymentFor] = useState<Order | null>(null);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentErr, setPaymentErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);
  const [showLabPicker, setShowLabPicker] = useState(false);
  const createPayment = useServerFn(createOrderPayment);
  const fetchPaymentStatus = useServerFn(getPaymentStatus);

  const currentLab = useMemo(
    () => labs.find((l) => l.id === currentLabId) ?? null,
    [labs, currentLabId],
  );

  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data: dent } = await supabase
        .from("dentists")
        .select("id, nome, email")
        .eq("user_id", user.user.id)
        .maybeSingle();
      if (!dent) return;
      setDentist(dent as Dentist);
      await reloadLinks(dent.id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("academy_content")
        .select("id, tipo, titulo, descricao, url_conteudo, capa_url, criado_em")
        .order("criado_em", { ascending: false });
      setAcademy((data ?? []) as AcademyContent[]);
      setAcademyLoading(false);
    })();
  }, []);

  async function reloadLinks(dentistId: string) {
    const { data } = await supabase
      .from("dentist_lab_links")
      .select("lab_id, labs(id, nome, subdominio, logo_url, visivel_diretorio)")
      .eq("dentist_id", dentistId);
    const linked = (data ?? [])
      .map((r) => r.labs as unknown as Lab)
      .filter(Boolean);
    setLabs(linked);
    if (linked.length > 0 && !currentLabId) {
      setCurrentLabId(linked[0].id);
    }
    if (linked.length === 0) {
      setShowDirectory(true);
    }
  }

  useEffect(() => {
    if (!currentLabId || !dentist) return;
    (async () => {
      const { data: prods } = await supabase
        .from("products")
        .select("id, nome, preco, prazo_dias, lab_id")
        .eq("lab_id", currentLabId);
      setProducts((prods ?? []) as Product[]);
      const { data: ord } = await supabase
        .from("orders")
        .select("id, status, valor, paciente, criado_em, lab_id, products(nome)")
        .eq("dentist_id", dentist.id)
        .eq("lab_id", currentLabId)
        .order("criado_em", { ascending: false });
      setOrders((ord ?? []) as Order[]);
    })();
  }, [currentLabId, dentist]);

  async function loadOrders(dentistId: string, labId: string) {
    const { data } = await supabase
      .from("orders")
      .select("id, status, valor, paciente, criado_em, lab_id, products(nome)")
      .eq("dentist_id", dentistId)
      .eq("lab_id", labId)
      .order("criado_em", { ascending: false });
    setOrders((data ?? []) as Order[]);
  }

  async function openPayment(order: Order) {
    setPaymentFor(order);
    setPayment(null);
    setPaymentErr(null);
    setCopied(false);
    setPaymentLoading(true);
    try {
      const p = await createPayment({ data: { orderId: order.id } });
      setPayment(p);
    } catch (e) {
      setPaymentErr(e instanceof Error ? e.message : "Falha ao gerar cobrança");
    } finally {
      setPaymentLoading(false);
    }
  }

  async function refreshPaymentStatus(orderId: string) {
    try {
      const r = await fetchPaymentStatus({ data: { orderId } });
      setPayment((cur) => (cur ? { ...cur, status: r.status } : cur));
    } catch {
      // ignore
    }
  }

  async function submitOrder() {
    if (!dentist || !selected || !currentLabId) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("orders")
      .insert({
        dentist_id: dentist.id,
        lab_id: currentLabId,
        product_id: selected.id,
        valor: selected.preco,
        paciente: paciente || null,
      })
      .select("id, status, valor, paciente, criado_em, lab_id, products(nome)")
      .single();
    setCreating(false);
    if (error) {
      alert(error.message);
      return;
    }
    setSelected(null);
    setPaciente("");
    loadOrders(dentist.id, currentLabId);
    openPayment(data as Order);
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-[#0B0F1E] border-b border-[#0B0F1E] text-white">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <ParcLabsLogo variant="dark" />
            <span className="text-white/40">/</span>
            <button
              onClick={() => setShowLabPicker((v) => !v)}
              className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-white/10"
            >
              {currentLab ? (
                <>
                  <LabAvatar lab={currentLab} size={22} />
                  <span className="text-sm font-semibold text-white">{currentLab.nome}</span>
                </>
              ) : (
                <span className="text-sm font-semibold text-white">
                  {dentist?.nome ?? "Portal do dentista"}
                </span>
              )}
              <IconChevronDown size={14} className="text-white/60" />
            </button>
            {showLabPicker && (
              <div className="absolute top-14 left-40 z-50 w-64 rounded-xl bg-surface-2 border border-border shadow-[var(--shadow-soft-lg)] p-2">
                <p className="px-2 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Meus laboratórios
                </p>
                {labs.map((lab) => (
                  <button
                    key={lab.id}
                    onClick={() => {
                      setCurrentLabId(lab.id);
                      setShowLabPicker(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-1 ${
                      lab.id === currentLabId ? "bg-primary-tint text-primary-tint-foreground" : "text-foreground"
                    }`}
                  >
                    <LabAvatar lab={lab} size={22} />
                    <span className="truncate">{lab.nome}</span>
                  </button>
                ))}
                <button
                  onClick={() => {
                    setShowDirectory(true);
                    setShowLabPicker(false);
                  }}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-primary hover:bg-primary-tint"
                >
                  <IconPlus size={16} /> Encontrar laboratório
                </button>
              </div>
            )}
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white"
          >
            <IconLogout size={16} /> Sair
          </button>
        </div>
        <div className="flex gap-1 px-6 pb-2">
          {currentLab && (
            <>
              <TabButton active={tab === "loja"} onClick={() => setTab("loja")} icon={<IconPackage size={16} />}>
                Fazer pedido
              </TabButton>
              <TabButton active={tab === "pedidos"} onClick={() => setTab("pedidos")} icon={<IconList size={16} />}>
                Meus pedidos
              </TabButton>
            </>
          )}
          <TabButton active={tab === "academy"} onClick={() => setTab("academy")} icon={<IconBook2 size={16} />}>
            Academy
          </TabButton>
        </div>
      </header>

      <main className="mx-auto max-w-[900px] px-6 py-6">
        {tab === "academy" ? (
          <AcademySection items={academy} loading={academyLoading} />
        ) : !currentLab ? (
          <EmptyLabsState onOpenDirectory={() => setShowDirectory(true)} />
        ) : tab === "loja" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {products.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum produto disponível.</p>
            )}
            {products.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-5"
              >
                <h3 className="text-base font-semibold text-foreground">{p.nome}</h3>
                <p className="mt-1 text-xs text-muted-foreground">Prazo: {p.prazo_dias} dias úteis</p>
                <div className="mt-4 text-xl font-bold text-foreground">
                  R$ {p.preco.toFixed(2).replace(".", ",")}
                </div>
                <button
                  onClick={() => setSelected(p)}
                  className="mt-4 w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm font-semibold hover:bg-primary-hover"
                >
                  Fazer pedido
                </button>
              </div>
            ))}
          </div>
        ) : (
          <ul className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] divide-y divide-border">
            {orders.length === 0 && (
              <li className="p-6 text-sm text-muted-foreground">Nenhum pedido ainda.</li>
            )}
            {orders.map((o) => (
              <li key={o.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">
                    {o.products?.nome ?? "Produto"}
                    {o.paciente && <span className="text-muted-foreground"> · {o.paciente}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(o.criado_em).toLocaleDateString("pt-BR")} · R${" "}
                    {o.valor.toFixed(2).replace(".", ",")}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openPayment(o)}
                    className="rounded-lg border border-border bg-surface-1 px-3 py-1 text-xs font-semibold text-foreground hover:bg-surface-2"
                  >
                    Pagar
                  </button>
                  <span className="rounded-full bg-primary-tint px-2.5 py-1 text-xs text-primary-tint-foreground">
                    {statusLabels[o.status] ?? o.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {selected && (
        <Modal onClose={() => setSelected(null)}>
          <h2 className="text-lg font-semibold text-foreground">{selected.nome}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            R$ {selected.preco.toFixed(2).replace(".", ",")} · {selected.prazo_dias} dias úteis
          </p>
          <div className="mt-4">
            <label className="text-xs font-medium text-muted-foreground">Nome do paciente</label>
            <input
              value={paciente}
              onChange={(e) => setPaciente(e.target.value)}
              placeholder="Ex.: J.S."
              className="mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="mt-5 flex gap-2 justify-end">
            <button onClick={() => setSelected(null)} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-surface-1">
              Cancelar
            </button>
            <button
              onClick={submitOrder}
              disabled={creating || !paciente.trim()}
              className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary-hover disabled:opacity-60"
            >
              {creating ? "Criando…" : "Confirmar pedido"}
            </button>
          </div>
        </Modal>
      )}

      {paymentFor && (
        <Modal
          onClose={() => {
            setPaymentFor(null);
            setPayment(null);
          }}
        >
          <h2 className="text-lg font-semibold text-foreground">Pagamento via Pix</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Valor: <strong>R$ {paymentFor.valor.toFixed(2).replace(".", ",")}</strong>
          </p>
          {paymentLoading && (
            <div className="mt-4 rounded-lg bg-surface-1 border border-border p-6 text-center text-xs text-muted-foreground">
              Gerando cobrança…
            </div>
          )}
          {paymentErr && (
            <div className="mt-4 rounded-lg bg-error/10 border border-error/30 p-3 text-xs text-error">
              {paymentErr}
            </div>
          )}
          {payment && (
            <div className="mt-4 space-y-3">
              {payment.status !== "RECEIVED" && payment.status !== "CONFIRMED" ? (
                <>
                  {payment.pixQrImageBase64 && (
                    <div className="flex justify-center rounded-lg bg-white p-3 border border-border">
                      <img
                        src={`data:image/png;base64,${payment.pixQrImageBase64}`}
                        alt="QR Code Pix"
                        className="w-48 h-48"
                      />
                    </div>
                  )}
                  {payment.pixPayload && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Pix copia e cola</label>
                      <div className="mt-1.5 flex gap-2">
                        <input
                          readOnly
                          value={payment.pixPayload}
                          className="flex-1 rounded-lg border border-border bg-surface-1 px-3 py-2 text-xs font-mono outline-none"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(payment.pixPayload!);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                          }}
                          className="shrink-0 rounded-lg bg-surface-1 border border-border px-3 text-xs font-semibold hover:bg-surface-2 flex items-center gap-1"
                        >
                          {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                          {copied ? "Copiado" : "Copiar"}
                        </button>
                      </div>
                    </div>
                  )}
                  {payment.invoiceUrl && (
                    <a
                      href={payment.invoiceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-center text-xs text-primary hover:underline"
                    >
                      Abrir fatura no Asaas
                    </a>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Status: <strong className="text-foreground">{payment.status}</strong>
                    </span>
                    <button
                      onClick={() => refreshPaymentStatus(paymentFor.id)}
                      className="text-primary hover:underline"
                    >
                      Atualizar
                    </button>
                  </div>
                </>
              ) : (
                <div className="rounded-lg bg-success/10 border border-success/30 p-4 text-center text-sm text-success">
                  ✓ Pagamento confirmado!
                </div>
              )}
            </div>
          )}
          <div className="mt-5 flex justify-end">
            <button
              onClick={() => {
                setPaymentFor(null);
                setPayment(null);
                setTab("pedidos");
              }}
              className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary-hover"
            >
              Ver meus pedidos
            </button>
          </div>
        </Modal>
      )}

      {showDirectory && dentist && (
        <DirectoryModal
          dentistId={dentist.id}
          linkedIds={new Set(labs.map((l) => l.id))}
          onClose={() => setShowDirectory(false)}
          onLinked={async (labId) => {
            await reloadLinks(dentist.id);
            setCurrentLabId(labId);
            setShowDirectory(false);
          }}
        />
      )}
    </div>
  );
}

function AcademySection({ items, loading }: { items: AcademyContent[]; loading: boolean }) {
  const groups: Array<{ key: AcademyContent["tipo"]; title: string }> = [
    { key: "ebook", title: "Ebooks" },
    { key: "curso", title: "Cursos" },
    { key: "tutorial", title: "Tutoriais" },
  ];

  if (loading) {
    return (
      <div className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-6 text-sm text-muted-foreground">
        Carregando Academy…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-8 text-center">
        <IconBook2 size={40} className="mx-auto text-primary" />
        <h2 className="mt-3 text-lg font-semibold text-foreground">Academy</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Em breve: ebooks, cursos e tutoriais pra você evoluir sua prática.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Academy</h1>
        <p className="mt-1 text-sm text-muted-foreground">Conteúdos selecionados para o portal do dentista.</p>
      </header>
      {groups.map(({ key, title }) => {
        const groupItems = items.filter((item) => item.tipo === key);
        return (
          <section key={key} className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {groupItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface-1 px-4 py-5 text-sm text-muted-foreground">
                Nenhum conteúdo cadastrado nesta categoria.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {groupItems.map((item) => (
                  <article key={item.id} className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] overflow-hidden">
                    {item.capa_url && (
                      <img src={item.capa_url} alt={item.titulo} className="h-36 w-full object-cover bg-surface-1" />
                    )}
                    <div className="p-5">
                      <h3 className="text-base font-semibold text-foreground">{item.titulo}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{item.descricao}</p>
                      <a
                        href={item.url_conteudo}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95"
                      >
                        Abrir
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function EmptyLabsState({ onOpenDirectory }: { onOpenDirectory: () => void }) {
  return (
    <div className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-8 text-center">
      <IconBuildingStore size={40} className="mx-auto text-primary" />
      <h2 className="mt-3 text-lg font-semibold text-foreground">Nenhum laboratório vinculado</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Encontre um laboratório na LabConect e comece a fazer pedidos.
      </p>
      <button
        onClick={onOpenDirectory}
        className="mt-4 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary-hover"
      >
        Encontrar laboratório
      </button>
    </div>
  );
}

function DirectoryModal({
  dentistId,
  linkedIds,
  onClose,
  onLinked,
}: {
  dentistId: string;
  linkedIds: Set<string>;
  onClose: () => void;
  onLinked: (labId: string) => void | Promise<void>;
}) {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("labs")
        .select("id, nome, subdominio, logo_url, visivel_diretorio")
        .eq("visivel_diretorio", true)
        .eq("assinatura_status", "ativa")
        .neq("revisao_status", "cancelado")
        .order("nome");
      setLabs((data ?? []) as Lab[]);
    })();
  }, []);

  async function link(labId: string) {
    setBusy(labId);
    setErr(null);
    const { error } = await supabase
      .from("dentist_lab_links")
      .insert({ dentist_id: dentistId, lab_id: labId });
    setBusy(null);
    if (error) {
      setErr(error.message);
      return;
    }
    await onLinked(labId);
  }

  const filtered = q
    ? labs.filter((l) => l.nome.toLowerCase().includes(q.toLowerCase()))
    : labs;

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-semibold text-foreground">Encontrar laboratório</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Selecione um laboratório para começar a fazer pedidos.
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nome…"
        className="mt-3 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary"
      />
      {err && <p className="mt-2 text-xs text-error">{err}</p>}
      <ul className="mt-3 max-h-80 overflow-y-auto divide-y divide-border rounded-lg border border-border">
        {filtered.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">Nenhum laboratório encontrado.</li>
        )}
        {filtered.map((lab) => {
          const already = linkedIds.has(lab.id);
          return (
            <li key={lab.id} className="p-3 flex items-center gap-3">
              <LabAvatar lab={lab} size={36} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground truncate">{lab.nome}</div>
                <div className="text-xs text-muted-foreground font-mono truncate">
                  {lab.subdominio}.labconect.com.br
                </div>
              </div>
              {already ? (
                <span className="rounded-full bg-success-tint text-success px-2.5 py-1 text-xs">
                  Vinculado
                </span>
              ) : (
                <button
                  onClick={() => link(lab.id)}
                  disabled={busy === lab.id}
                  className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:bg-primary-hover disabled:opacity-60"
                >
                  {busy === lab.id ? "…" : "Solicitar acesso"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex justify-end">
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-surface-1">
          Fechar
        </button>
      </div>
    </Modal>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-white text-[#0B0F1E]" : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft-lg)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
