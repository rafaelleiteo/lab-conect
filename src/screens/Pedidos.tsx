import { useEffect, useState } from "react";
import { IconPlus, IconSearch, IconUserCheck, IconUserExclamation, IconX, IconClock, IconUser } from "@tabler/icons-react";
import { useCurrentLab } from "@/hooks/useCurrentLab";
import { supabase } from "@/integrations/supabase/client";

type OrderStage = "recebido" | "producao" | "cq" | "pronto" | "entregue";

const stageOrder: OrderStage[] = ["recebido", "producao", "cq", "pronto", "entregue"];

const stageLabels: Record<OrderStage, string> = {
  recebido: "Recebido",
  producao: "Em produção",
  cq: "Controle de qualidade",
  pronto: "Pronto",
  entregue: "Entregue",
};

const stageAccent: Record<OrderStage, { bg: string; text: string; dot: string }> = {
  recebido: { bg: "bg-info-tint", text: "text-info", dot: "#2D6FDB" },
  producao: { bg: "bg-primary-tint", text: "text-primary-tint-foreground", dot: "#4C5FF5" },
  cq: { bg: "bg-warning-tint", text: "text-warning", dot: "#9A6710" },
  pronto: { bg: "bg-success-tint", text: "text-success", dot: "#28854F" },
  entregue: { bg: "bg-surface-1", text: "text-muted-foreground", dot: "#9497A6" },
};

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA",
  "PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

type Product = {
  id: string;
  nome: string;
  preco: number;
};

type OrderItem = {
  id: string;
  status: OrderStage;
  valor: number;
  paciente: string | null;
  criado_em: string;
  dentist_id: string | null;
  cro_pendente: string | null;
  uf_pendente: string | null;
  nome_dentista_pendente: string | null;
  dentists: { nome: string; cro: string | null; uf: string | null } | null;
  products: { nome: string } | null;
};

type FoundDentist = {
  id: string;
  nome: string;
  cro: string | null;
  uf: string | null;
  email: string;
};

const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary";

export function Pedidos() {
  const { lab } = useCurrentLab();
  const [ordersList, setOrdersList] = useState<OrderItem[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [selectedProductId, setSelectedProductId] = useState("");
  const [paciente, setPaciente] = useState("");
  const [valor, setValor] = useState("");
  const [cro, setCro] = useState("");
  const [uf, setUf] = useState("SP");
  const [nomePendente, setNomePendente] = useState("");

  const [searchingDentist, setSearchingDentist] = useState(false);
  const [foundDentist, setFoundDentist] = useState<FoundDentist | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!lab) return;
    loadOrders();
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lab]);

  async function loadOrders() {
    if (!lab) return;
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("id, status, valor, paciente, criado_em, dentist_id, cro_pendente, uf_pendente, nome_dentista_pendente, dentists(nome, cro, uf), products(nome)")
      .eq("lab_id", lab.id)
      .order("criado_em", { ascending: false });

    setOrdersList((data ?? []) as unknown as OrderItem[]);
    setLoading(false);
  }

  async function loadProducts() {
    if (!lab) return;
    const { data } = await supabase
      .from("products")
      .select("id, nome, preco")
      .eq("lab_id", lab.id)
      .eq("ativo", true);

    const prods = (data ?? []) as Product[];
    setProductsList(prods);
    if (prods.length > 0 && !selectedProductId) {
      setSelectedProductId(prods[0].id);
      setValor(String(prods[0].preco));
    }
  }

  function handleProductChange(prodId: string) {
    setSelectedProductId(prodId);
    const p = productsList.find((x) => x.id === prodId);
    if (p) {
      setValor(String(p.preco));
    }
  }

  async function checkDentistByCro() {
    if (!cro.trim() || !uf) return;
    setSearchingDentist(true);
    setSearchAttempted(true);
    setFoundDentist(null);

    const { data } = await supabase
      .from("dentists")
      .select("id, nome, cro, uf, email")
      .ilike("cro", cro.trim())
      .ilike("uf", uf.trim())
      .maybeSingle();

    setSearchingDentist(false);
    if (data) {
      setFoundDentist(data as FoundDentist);
    }
  }

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!lab) return;
    setErrorMsg(null);

    if (!selectedProductId || !paciente.trim() || !valor.trim()) {
      setErrorMsg("Preencha todos os campos obrigatórios.");
      return;
    }

    if (!foundDentist && (!cro.trim() || !uf || !nomePendente.trim())) {
      setErrorMsg("Para criar um pedido órfão, informe o CRO, UF e Nome do Dentista.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("orders").insert({
        lab_id: lab.id,
        product_id: selectedProductId,
        dentist_id: foundDentist ? foundDentist.id : null,
        cro_pendente: foundDentist ? null : cro.trim().toUpperCase(),
        uf_pendente: foundDentist ? null : uf.toUpperCase(),
        nome_dentista_pendente: foundDentist ? null : nomePendente.trim(),
        paciente: paciente.trim(),
        valor: Number(valor),
        status: "recebido",
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setShowModal(false);
      resetForm();
      await loadOrders();
    } finally {
      setSaving(false);
    }
  }

  async function updateOrderStatus(orderId: string, newStatus: OrderStage) {
    await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    setOrdersList((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
  }

  function resetForm() {
    setPaciente("");
    setCro("");
    setUf("SP");
    setNomePendente("");
    setFoundDentist(null);
    setSearchAttempted(false);
    setErrorMsg(null);
    if (productsList.length > 0) {
      setSelectedProductId(productsList[0].id);
      setValor(String(productsList[0].preco));
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Pedidos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie o fluxo de produção e cadastre novos pedidos (com suporte a pedidos órfãos por CRO).
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95 shrink-0"
        >
          <IconPlus size={16} /> Novo Pedido
        </button>
      </header>

      {/* Modal Criar Pedido */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-surface-2 border border-border p-6 shadow-[var(--shadow-soft-lg)] space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">Cadastrar Novo Pedido</h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-1"
              >
                <IconX size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              {errorMsg && (
                <div className="rounded-lg bg-error/10 border border-error/30 p-3 text-xs text-error">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground">Produto / Serviço</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  required
                  className={INPUT_CLASS}
                >
                  {productsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} (R$ {Number(p.preco).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Paciente</label>
                  <input
                    value={paciente}
                    onChange={(e) => setPaciente(e.target.value)}
                    placeholder="Nome do paciente"
                    required
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    required
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              {/* Seção Identificação do Dentista */}
              <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-3">
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <IconUser size={15} /> Identificação do Dentista (CRO + UF)
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="text-[11px] font-medium text-muted-foreground">UF</label>
                    <select
                      value={uf}
                      onChange={(e) => {
                        setUf(e.target.value);
                        setSearchAttempted(false);
                        setFoundDentist(null);
                      }}
                      className={INPUT_CLASS}
                    >
                      {UFS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] font-medium text-muted-foreground">CRO do Dentista</label>
                    <div className="flex gap-1.5">
                      <input
                        value={cro}
                        onChange={(e) => {
                          setCro(e.target.value);
                          setSearchAttempted(false);
                          setFoundDentist(null);
                        }}
                        placeholder="Ex: 12345"
                        className={INPUT_CLASS}
                      />
                      <button
                        type="button"
                        onClick={checkDentistByCro}
                        disabled={searchingDentist || !cro.trim()}
                        className="mt-1 rounded-lg bg-surface-2 border border-border px-3 text-xs font-medium text-foreground hover:bg-primary-tint transition disabled:opacity-50 shrink-0"
                      >
                        {searchingDentist ? "..." : <IconSearch size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status da busca de dentista */}
                {searchAttempted && (
                  <div>
                    {foundDentist ? (
                      <div className="flex items-center gap-2 rounded-lg bg-success-tint p-2.5 text-xs text-success font-medium">
                        <IconUserCheck size={16} />
                        <span>Dentista Cadastrado: <strong>{foundDentist.nome}</strong> (CRO-{foundDentist.uf} {foundDentist.cro})</span>
                      </div>
                    ) : (
                      <div className="space-y-2 rounded-lg bg-warning-tint p-3 text-xs text-warning">
                        <div className="flex items-center gap-2 font-semibold">
                          <IconUserExclamation size={16} /> Dentista não cadastrado (Pedido Órfão)
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Nenhum dentista com o CRO <strong>{cro}-{uf}</strong> foi encontrado na base. Informe o nome abaixo para registrar o pedido órfão. Quando o dentista se cadastrar, o pedido será vinculado automaticamente!
                        </p>
                        <div>
                          <label className="text-[11px] font-medium text-foreground">Nome do Dentista</label>
                          <input
                            value={nomePendente}
                            onChange={(e) => setNomePendente(e.target.value)}
                            placeholder="Ex: Dr. João Silva"
                            required={!foundDentist}
                            className={INPUT_CLASS}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-surface-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-gradient-brand px-5 py-2 text-xs font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95 disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Criar Pedido"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista Kanban de Estágios */}
      {loading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Carregando pedidos...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {stageOrder.map((stage) => {
            const items = ordersList.filter((o) => o.status === stage);
            const a = stageAccent[stage];
            return (
              <div key={stage} className="flex flex-col rounded-2xl bg-surface-1 border border-border min-h-[350px]">
                <div className={`flex items-center justify-between rounded-t-2xl px-4 py-3 ${a.bg}`}>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a.dot }} />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${a.text}`}>{stageLabels[stage]}</span>
                  </div>
                  <span className={`text-xs font-mono font-bold ${a.text}`}>{items.length}</span>
                </div>
                <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                  {items.map((o) => {
                    const dentistName = o.dentists?.nome || o.nome_dentista_pendente || "Dentista N/D";
                    const isOrphan = !o.dentist_id;
                    const croDisplay = isOrphan
                      ? `${o.cro_pendente || "—"}-${o.uf_pendente || ""}`
                      : `${o.dentists?.cro || "—"}-${o.dentists?.uf || ""}`;

                    return (
                      <article
                        key={o.id}
                        className="rounded-xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-3 space-y-2"
                        style={{ borderTop: `2px solid ${a.dot}` }}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono text-subtle-foreground truncate">#{o.id.slice(0, 8)}</span>
                          {isOrphan && (
                            <span className="rounded bg-warning-tint px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                              ÓRFÃO
                            </span>
                          )}
                        </div>

                        <div className="text-sm font-semibold text-foreground leading-snug">
                          {o.products?.nome || "Serviço Prótese"}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{dentistName}</span>{" "}
                          <span className="text-[11px] text-subtle-foreground">(CRO {croDisplay})</span>
                        </div>

                        {o.paciente && (
                          <div className="text-xs text-muted-foreground font-mono">
                            Pac: <strong>{o.paciente}</strong>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                          <span className="font-mono font-bold text-foreground">
                            R$ {Number(o.valor).toFixed(2)}
                          </span>

                          <select
                            value={o.status}
                            onChange={(e) => updateOrderStatus(o.id, e.target.value as OrderStage)}
                            className="text-[11px] rounded bg-surface-1 border border-border px-1.5 py-0.5 outline-none font-medium"
                          >
                            {stageOrder.map((s) => (
                              <option key={s} value={s}>
                                {stageLabels[s]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </article>
                    );
                  })}

                  {items.length === 0 && (
                    <div className="py-8 text-center text-xs text-subtle-foreground">
                      Nenhum pedido nesta etapa.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
