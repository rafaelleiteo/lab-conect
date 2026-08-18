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
  IconBook2,
  IconFileText,
  IconReceipt,
  IconTool,
  IconGift,
  IconUser,
  IconBuildingStore,
} from "@tabler/icons-react";
import { ParcLabsLogo } from "@/components/ParcLabsLogo";
import { LabAvatar } from "@/components/LabAvatar";
import { supabase } from "@/integrations/supabase/client";
import { createOrderPayment, getPaymentStatus } from "@/lib/payments.functions";
import { resolveLabSubdomain } from "@/lib/domain-context";

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
  asaas_payment_id?: string | null;
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
type Benefit = {
  id: string;
  titulo: string;
  descricao: string;
  tipo: string;
  parceiro: string;
  url_link: string | null;
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

type TabType = "produtos" | "solicitar" | "pedidos" | "faturas" | "academy" | "tools" | "beneficios";

function DentistPortal() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>("produtos");
  const [dentist, setDentist] = useState<Dentist | null>(null);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [currentLabId, setCurrentLabId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [academy, setAcademy] = useState<AcademyContent[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [academyLoading, setAcademyLoading] = useState(true);
  const [benefitsLoading, setBenefitsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [paciente, setPaciente] = useState("");
  const [creating, setCreating] = useState(false);
  const [paymentFor, setPaymentFor] = useState<Order | null>(null);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentErr, setPaymentErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);
  const [showLabPicker, setShowLabPicker] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const createPayment = useServerFn(createOrderPayment);
  const fetchPaymentStatus = useServerFn(getPaymentStatus);

  // Subdomain / URL parameter context resolution (Block 2)
  const labSubdomainFromUrl = useMemo(() => resolveLabSubdomain(), []);

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
      const { data: ac } = await supabase
        .from("academy_content")
        .select("id, tipo, titulo, descricao, url_conteudo, capa_url, criado_em")
        .order("criado_em", { ascending: false });
      setAcademy((ac ?? []) as AcademyContent[]);
      setAcademyLoading(false);

      const { data: ben } = await supabase
        .from("benefits")
        .select("id, titulo, descricao, tipo, parceiro, url_link, criado_em")
        .order("criado_em", { ascending: false });
      setBenefits((ben ?? []) as Benefit[]);
      setBenefitsLoading(false);
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

    // Context resolution: if subdomain is in URL, auto-select that lab
    if (labSubdomainFromUrl && linked.length > 0) {
      const matched = linked.find((l) => l.subdominio.toLowerCase() === labSubdomainFromUrl);
      if (matched) {
        setCurrentLabId(matched.id);
        return;
      }
    }

    if (linked.length > 0 && !currentLabId) {
      setCurrentLabId(linked[0].id);
    }
    if (linked.length === 0 && !labSubdomainFromUrl) {
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
        .select("id, status, valor, paciente, criado_em, lab_id, products(nome), asaas_payment_id")
        .eq("dentist_id", dentist.id)
        .eq("lab_id", currentLabId)
        .order("criado_em", { ascending: false });
      setOrders((ord ?? []) as Order[]);
    })();
  }, [currentLabId, dentist]);

  async function loadOrders(dentistId: string, labId: string) {
    const { data } = await supabase
      .from("orders")
      .select("id, status, valor, paciente, criado_em, lab_id, products(nome), asaas_payment_id")
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
    if (!dentist || !selectedProduct || !currentLabId) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("orders")
      .insert({
        dentist_id: dentist.id,
        lab_id: currentLabId,
        product_id: selectedProduct.id,
        valor: selectedProduct.preco,
        paciente: paciente || null,
      })
      .select("id, status, valor, paciente, criado_em, lab_id, products(nome)")
      .single();
    setCreating(false);
    if (error) {
      alert(error.message);
      return;
    }
    setSelectedProduct(null);
    setPaciente("");
    loadOrders(dentist.id, currentLabId);
    openPayment(data as Order);
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const academyItems = useMemo(() => academy.filter((a) => a.tipo !== "tutorial"), [academy]);
  const toolsItems = useMemo(() => academy.filter((a) => a.tipo === "tutorial"), [academy]);

  return (
    <div className="min-h-screen bg-background">
      {/* Block 3 & Block 7: Cabeçalho do Dentista */}
      <header className="sticky top-0 z-40 bg-[#0B0F1E] border-b border-[#0B0F1E] text-white">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Lado Esquerdo: Logo do Laboratório (se dentro do contexto de lab) */}
          <div className="flex items-center gap-3">
            {currentLab ? (
              <div className="flex items-center gap-2">
                <LabAvatar lab={currentLab} size={28} />
                <span className="text-sm font-bold text-white tracking-wide">{currentLab.nome}</span>
              </div>
            ) : (
              <ParcLabsLogo variant="dark" />
            )}

            {/* Selector de Laboratório (Aparece apenas no domínio raiz / se não houver contexto forçado - Passo 7) */}
            {!labSubdomainFromUrl && (
              <div className="relative">
                <button
                  onClick={() => setShowLabPicker((v) => !v)}
                  className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs text-white/80 hover:bg-white/20 transition"
                >
                  <span>{currentLab ? "Trocar lab" : "Selecionar lab"}</span>
                  <IconChevronDown size={12} />
                </button>
                {showLabPicker && (
                  <div className="absolute top-8 left-0 z-50 w-64 rounded-xl bg-surface-2 border border-border shadow-[var(--shadow-soft-lg)] p-2">
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
                    {/* Botão Encontrar laboratório só existe no domínio raiz (Passo 7) */}
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
            )}
          </div>

          {/* Lado Direito: Logo/Texto LabConect + Avatar do Perfil do Dentista (Bloco 3) */}
          <div className="flex items-center gap-4">
            <ParcLabsLogo variant="dark" size="sm" />
            
            {/* Avatar / Perfil do Dentista */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu((v) => !v)}
                className="flex items-center gap-2 rounded-full p-1 hover:bg-white/10 transition"
                title="Meu Perfil"
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs">
                  {dentist?.nome?.charAt(0).toUpperCase() ?? "D"}
                </div>
              </button>
              {showProfileMenu && (
                <div className="absolute top-10 right-0 z-50 w-56 rounded-xl bg-surface-2 border border-border shadow-[var(--shadow-soft-lg)] p-2 text-foreground">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-xs font-semibold truncate">{dentist?.nome}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{dentist?.email}</p>
                  </div>
                  <button
                    onClick={signOut}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-error hover:bg-surface-1 transition"
                  >
                    <IconLogout size={16} /> Sair do sistema
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bloco 8: Menu Padrão do Dentista dentro do Laboratório */}
        <div className="flex gap-1 px-6 pb-2 overflow-x-auto">
          <TabButton active={tab === "produtos"} onClick={() => setTab("produtos")} icon={<IconPackage size={16} />}>
            Produtos
          </TabButton>
          <TabButton active={tab === "solicitar"} onClick={() => setTab("solicitar")} icon={<IconPlus size={16} />}>
            Solicitar Pedido
          </TabButton>
          <TabButton active={tab === "pedidos"} onClick={() => setTab("pedidos")} icon={<IconList size={16} />}>
            Meus Pedidos
          </TabButton>
          <TabButton active={tab === "faturas"} onClick={() => setTab("faturas")} icon={<IconReceipt size={16} />}>
            Faturas
          </TabButton>
          <TabButton active={tab === "academy"} onClick={() => setTab("academy")} icon={<IconBook2 size={16} />}>
            Academy
          </TabButton>
          <TabButton active={tab === "tools"} onClick={() => setTab("tools")} icon={<IconWrench size={16} />}>
            Tools
          </TabButton>
          <TabButton active={tab === "beneficios"} onClick={() => setTab("beneficios")} icon={<IconGift size={16} />}>
            Benefícios
          </TabButton>
        </div>
      </header>

      {/* Conteúdo Principal por Aba */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Aba 1: Produtos (Catálogo do Laboratório) */}
        {tab === "produtos" && (
          <div className="space-y-6">
            <header>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Catálogo de Produtos e Serviços</h2>
              <p className="text-xs text-muted-foreground">Preços e prazos oficiais do {currentLab?.nome ?? "laboratório"}</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.length === 0 ? (
                <div className="col-span-full p-8 text-center text-sm text-muted-foreground rounded-2xl border border-border bg-surface-2">
                  Nenhum produto cadastrado por este laboratório no momento.
                </div>
              ) : (
                products.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-border bg-surface-2 p-5 flex flex-col justify-between shadow-[var(--shadow-soft)]">
                    <div>
                      <h3 className="font-semibold text-foreground text-base">{p.nome}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">Prazo médio: {p.prazo_dias} dias úteis</p>
                    </div>
                    <div className="mt-6 flex items-center justify-between pt-4 border-t border-border">
                      <span className="text-lg font-bold text-foreground">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.preco)}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedProduct(p);
                          setTab("solicitar");
                        }}
                        className="rounded-lg bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95"
                      >
                        Solicitar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Aba 2: Solicitar Pedido */}
        {tab === "solicitar" && (
          <div className="max-w-xl mx-auto space-y-6">
            <header>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Novo Pedido de Prótese</h2>
              <p className="text-xs text-muted-foreground">Envio direto para {currentLab?.nome}</p>
            </header>
            <div className="rounded-2xl border border-border bg-surface-2 p-6 shadow-[var(--shadow-soft)] space-y-5">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Produto / Serviço</label>
                <select
                  value={selectedProduct?.id ?? ""}
                  onChange={(e) => {
                    const p = products.find((pr) => pr.id === e.target.value);
                    setSelectedProduct(p ?? null);
                  }}
                  className="mt-1.5 w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="">Selecione um produto...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} — {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.preco)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Nome do Paciente</label>
                <input
                  type="text"
                  value={paciente}
                  onChange={(e) => setPaciente(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="mt-1.5 w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <button
                onClick={submitOrder}
                disabled={!selectedProduct || creating}
                className="w-full rounded-lg bg-gradient-brand py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95 disabled:opacity-60"
              >
                {creating ? "Enviando pedido..." : "Confirmar e Enviar Pedido"}
              </button>
            </div>
          </div>
        )}

        {/* Aba 3: Meus Pedidos */}
        {tab === "pedidos" && (
          <div className="space-y-6">
            <header>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Meus Pedidos</h2>
              <p className="text-xs text-muted-foreground">Histórico e acompanhamento de status</p>
            </header>
            <div className="rounded-2xl border border-border bg-surface-2 overflow-hidden shadow-[var(--shadow-soft)]">
              {orders.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Nenhum pedido realizado neste laboratório.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-surface-1 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Data</th>
                      <th className="text-left px-4 py-3 font-medium">Produto</th>
                      <th className="text-left px-4 py-3 font-medium">Paciente</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-right px-4 py-3 font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(o.criado_em).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{o.products?.nome ?? "Produto"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{o.paciente ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-primary-tint px-2 py-0.5 text-xs text-primary-tint-foreground font-medium">
                            {statusLabels[o.status] ?? o.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(o.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Aba 4: Faturas (Visão derivada de orders - Zero Mock - Bloco 8) */}
        {tab === "faturas" && (
          <div className="space-y-6">
            <header>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Faturas e Cobranças</h2>
              <p className="text-xs text-muted-foreground">Derivado dos pedidos realizados em {currentLab?.nome ?? "laboratório"}</p>
            </header>
            <div className="rounded-2xl border border-border bg-surface-2 overflow-hidden shadow-[var(--shadow-soft)]">
              {orders.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma fatura ou pedido registrado.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-surface-1 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Data</th>
                      <th className="text-left px-4 py-3 font-medium">Ref. Pedido</th>
                      <th className="text-left px-4 py-3 font-medium">Paciente</th>
                      <th className="text-left px-4 py-3 font-medium">Valor</th>
                      <th className="text-right px-4 py-3 font-medium">Pagamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(o.criado_em).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{o.products?.nome ?? "Pedido"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{o.paciente ?? "—"}</td>
                        <td className="px-4 py-3 font-bold text-foreground">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(o.valor)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => openPayment(o)}
                            className="rounded-lg border border-primary px-3 py-1 text-xs font-semibold text-primary hover:bg-primary-tint transition"
                          >
                            Ver Cobrança PIX
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Aba 5: Academy (Bloco 8 - Zero mock) */}
        {tab === "academy" && (
          <div className="space-y-6">
            <header>
              <h2 className="text-xl font-bold tracking-tight text-foreground">LabConect Academy</h2>
              <p className="text-xs text-muted-foreground">Cursos e ebooks para capacitação continuada</p>
            </header>
            {academyLoading ? (
              <div className="p-8 text-sm text-muted-foreground">Carregando conteúdos…</div>
            ) : academyItems.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface-2 p-12 text-center text-sm text-muted-foreground space-y-2">
                <IconBook2 size={36} className="mx-auto text-muted-foreground/40" />
                <p className="font-semibold text-foreground">Nenhum conteúdo da Academy cadastrado no momento.</p>
                <p className="text-xs">Novos materiais educativos serão publicados em breve pelo administrador.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {academyItems.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border bg-surface-2 p-5 flex flex-col justify-between shadow-[var(--shadow-soft)]">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary-tint px-2 py-0.5 rounded">
                        {item.tipo}
                      </span>
                      <h3 className="mt-2 font-semibold text-foreground text-base">{item.titulo}</h3>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{item.descricao}</p>
                    </div>
                    <a
                      href={item.url_conteudo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 block text-center rounded-lg bg-gradient-brand py-2 text-xs font-semibold text-white"
                    >
                      Acessar Conteúdo →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Aba 6: Tools (Bloco 8 - Zero mock) */}
        {tab === "tools" && (
          <div className="space-y-6">
            <header>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Ferramentas e Tutoriais (Tools)</h2>
              <p className="text-xs text-muted-foreground">Guias práticos e utilitários para seu consultório</p>
            </header>
            {academyLoading ? (
              <div className="p-8 text-sm text-muted-foreground">Carregando ferramentas…</div>
            ) : toolsItems.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface-2 p-12 text-center text-sm text-muted-foreground space-y-2">
                <IconWrench size={36} className="mx-auto text-muted-foreground/40" />
                <p className="font-semibold text-foreground">Nenhuma ferramenta cadastrada no momento.</p>
                <p className="text-xs">Tutoriais e ferramentas serão disponibilizados em breve pelo administrador.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {toolsItems.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border bg-surface-2 p-5 flex flex-col justify-between shadow-[var(--shadow-soft)]">
                    <div>
                      <h3 className="font-semibold text-foreground text-base">{item.titulo}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{item.descricao}</p>
                    </div>
                    <a
                      href={item.url_conteudo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-block text-xs font-semibold text-primary hover:underline"
                    >
                      Ver tutorial →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Aba 7: Benefícios (Bloco 8 - Estado Vazio Honesto "Em breve: descontos e parcerias pra você") */}
        {tab === "beneficios" && (
          <div className="space-y-6">
            <header>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Benefícios e Parcerias</h2>
              <p className="text-xs text-muted-foreground">Vantagens exclusivas para dentistas parceiros LabConect</p>
            </header>
            {benefitsLoading ? (
              <div className="p-8 text-sm text-muted-foreground">Carregando benefícios…</div>
            ) : benefits.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface-2 p-12 text-center text-sm text-muted-foreground space-y-2">
                <IconGift size={36} className="mx-auto text-muted-foreground/40" />
                <p className="font-semibold text-foreground">Em breve: descontos e parcerias pra você</p>
                <p className="text-xs">Estamos negociando condições especiais com fornecedores de insumos odontológicos.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {benefits.map((b) => (
                  <div key={b.id} className="rounded-2xl border border-border bg-surface-2 p-5 flex flex-col justify-between shadow-[var(--shadow-soft)]">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-success bg-success-tint px-2 py-0.5 rounded">
                        {b.tipo}
                      </span>
                      <h3 className="mt-2 font-semibold text-foreground text-base">{b.titulo}</h3>
                      <p className="text-xs font-medium text-primary mt-0.5">{b.parceiro}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{b.descricao}</p>
                    </div>
                    {b.url_link && (
                      <a
                        href={b.url_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 block text-center rounded-lg border border-border py-1.5 text-xs font-semibold text-foreground hover:bg-surface-1"
                      >
                        Resgatar Benefício →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
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
      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
        active
          ? "bg-white text-black shadow-sm"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
