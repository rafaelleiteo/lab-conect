import { useEffect, useMemo, useState } from "react";
import {
  IconAlertTriangle,
  IconCheck,
  IconEdit,
  IconPlus,
  IconPower,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentLab } from "@/hooks/useCurrentLab";
import { Switch } from "@/components/ui/switch";

type Product = {
  id: string;
  lab_id: string;
  nome: string;
  descricao?: string | null;
  preco: number;
  prazo_dias: number;
  ativo: boolean;
  arquivos_obrigatorios: string[];
  order_count: number;
};

type FormState = {
  id?: string;
  nome: string;
  descricao: string;
  preco: string;
  prazo_dias: string;
  ativo: boolean;
  arquivos_obrigatorios: string[];
};

type FormErrors = {
  nome?: string;
  preco?: string;
  prazo_dias?: string;
};

const DEFAULT_FILE_OPTIONS = [
  "STL superior",
  "STL inferior",
  "Escaneamento intraoral",
  "Fotos do paciente",
  "Receita / instruções clínicas",
];

const emptyForm: FormState = {
  nome: "",
  descricao: "",
  preco: "",
  prazo_dias: "5",
  ativo: true,
  arquivos_obrigatorios: [],
};

export function Produtos() {
  const { lab, loading } = useCurrentLab();
  const [items, setItems] = useState<Product[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [customFileText, setCustomFileText] = useState("");
  const [customOptions, setCustomOptions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const db = supabase as any;

  const activeCount = useMemo(() => items.filter((p) => p.ativo).length, [items]);

  useEffect(() => {
    if (lab) void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lab?.id]);

  async function loadProducts() {
    if (!lab) return;
    setBusy(true);
    const [{ data: productsData, error: productsErr }, { data: ordersData }] = await Promise.all([
      db
        .from("products")
        .select("id, lab_id, nome, descricao, preco, prazo_dias, ativo, arquivos_obrigatorios")
        .eq("lab_id", lab.id)
        .order("nome"),
      db.from("orders").select("product_id").eq("lab_id", lab.id),
    ]);
    setBusy(false);
    if (productsErr) {
      setError(productsErr.message);
      return;
    }
    const counts = new Map<string, number>();
    for (const order of ordersData ?? []) {
      counts.set(order.product_id, (counts.get(order.product_id) ?? 0) + 1);
    }
    setItems(
      (productsData ?? []).map((p: any) => ({
        id: p.id,
        lab_id: p.lab_id,
        nome: p.nome,
        descricao: p.descricao,
        preco: Number(p.preco),
        prazo_dias: Number(p.prazo_dias),
        ativo: p.ativo ?? true,
        arquivos_obrigatorios: p.arquivos_obrigatorios ?? [],
        order_count: counts.get(p.id) ?? 0,
      })),
    );
  }

  function startCreate() {
    setError(null);
    setNotice(null);
    setFormErrors({});
    setCustomFileText("");
    setCustomOptions([]);
    setForm(emptyForm);
  }

  function startEdit(product: Product) {
    setError(null);
    setNotice(null);
    setFormErrors({});
    setCustomFileText("");
    const nonDefault = (product.arquivos_obrigatorios ?? []).filter(
      (f) => !DEFAULT_FILE_OPTIONS.includes(f),
    );
    setCustomOptions(nonDefault);
    setForm({
      id: product.id,
      nome: product.nome,
      descricao: product.descricao || "",
      preco: String(product.preco).replace(".", ","),
      prazo_dias: String(product.prazo_dias),
      ativo: product.ativo,
      arquivos_obrigatorios: product.arquivos_obrigatorios ?? [],
    });
  }

  function parseMoney(value: string) {
    const normalized = value.replace(/\./g, "").replace(",", ".").trim();
    const number = Number(normalized);
    return Number.isFinite(number) ? number : NaN;
  }

  function handleAddCustomFile() {
    const trimmed = customFileText.trim();
    if (!trimmed || !form) return;
    if (!customOptions.includes(trimmed) && !DEFAULT_FILE_OPTIONS.includes(trimmed)) {
      setCustomOptions((prev) => [...prev, trimmed]);
    }
    if (!form.arquivos_obrigatorios.includes(trimmed)) {
      setForm({
        ...form,
        arquivos_obrigatorios: [...form.arquivos_obrigatorios, trimmed],
      });
    }
    setCustomFileText("");
  }

  function removeCustomFile(fileToRemove: string) {
    if (!form) return;
    setCustomOptions((prev) => prev.filter((f) => f !== fileToRemove));
    setForm({
      ...form,
      arquivos_obrigatorios: form.arquivos_obrigatorios.filter((f) => f !== fileToRemove),
    });
  }

  function toggleFile(file: string) {
    if (!form) return;
    const isSelected = form.arquivos_obrigatorios.includes(file);
    const next = isSelected
      ? form.arquivos_obrigatorios.filter((f) => f !== file)
      : [...form.arquivos_obrigatorios, file];
    setForm({ ...form, arquivos_obrigatorios: next });
  }

  async function saveProduct(force = false) {
    if (!lab || !form) return;
    setError(null);
    setNotice(null);

    const newErrors: FormErrors = {};
    if (!form.nome.trim() || form.nome.trim().length < 2) {
      newErrors.nome = "Informe um nome válido (mínimo 2 caracteres).";
    }

    const preco = parseMoney(form.preco);
    if (!form.preco || !Number.isFinite(preco) || preco <= 0) {
      newErrors.preco = "Informe um preço válido maior que zero.";
    }

    const prazo = Number(form.prazo_dias);
    if (!form.prazo_dias || !Number.isInteger(prazo) || prazo < 1) {
      newErrors.prazo_dias = "Informe um prazo válido em dias úteis (mínimo 1).";
    }

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }
    setFormErrors({});

    if (!force && form.arquivos_obrigatorios.length === 0) {
      setNotice("Nenhum arquivo obrigatório definido — o dentista poderá enviar o pedido sem anexos.");
      return;
    }

    setBusy(true);
    const payload = {
      lab_id: lab.id,
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      preco,
      prazo_dias: prazo,
      ativo: form.ativo,
      arquivos_obrigatorios: form.arquivos_obrigatorios,
    };
    const result = form.id
      ? await db.from("products").update(payload).eq("id", form.id).eq("lab_id", lab.id)
      : await db.from("products").insert(payload);
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setForm(null);
    await loadProducts();
  }

  async function toggleActive(product: Product) {
    setError(null);
    setNotice(null);
    setBusy(true);
    const { error: updateErr } = await db
      .from("products")
      .update({ ativo: !product.ativo })
      .eq("id", product.id)
      .eq("lab_id", product.lab_id);
    setBusy(false);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    await loadProducts();
  }

  async function deleteProduct(product: Product) {
    setError(null);
    if (product.order_count > 0) {
      setNotice(
        "Este produto já possui pedidos vinculados. A exclusão foi bloqueada; desative o produto para removê-lo da loja sem afetar o histórico.",
      );
      return;
    }
    setBusy(true);
    const { error: deleteErr } = await db
      .from("products")
      .delete()
      .eq("id", product.id)
      .eq("lab_id", product.lab_id);
    setBusy(false);
    if (deleteErr) {
      setError(deleteErr.message);
      return;
    }
    await loadProducts();
  }

  const allFileOptions = useMemo(() => {
    const list = [...DEFAULT_FILE_OPTIONS];
    for (const opt of customOptions) {
      if (!list.includes(opt)) list.push(opt);
    }
    return list;
  }, [customOptions]);

  if (loading) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  if (!lab) {
    return (
      <div className="rounded-2xl bg-surface-2 border border-border p-6 text-sm text-muted-foreground">
        Nenhum laboratório vinculado à sua conta.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Produtos e fluxos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} produto(s) cadastrados · {activeCount} ativo(s) na loja
          </p>
        </div>
        <button
          onClick={startCreate}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3.5 py-2 text-sm font-medium shadow-[var(--shadow-soft)] hover:bg-primary-hover transition"
        >
          <IconPlus size={16} />
          <span className="hidden sm:inline">Novo produto</span>
        </button>
      </header>

      {(error || notice) && !form && (
        <div
          className={`rounded-xl border p-3 text-sm ${
            error
              ? "border-error/30 bg-error/10 text-error"
              : "border-warning/30 bg-warning/10 text-foreground"
          }`}
        >
          <div className="flex items-start gap-2">
            <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error ?? notice}</span>
          </div>
        </div>
      )}

      {/* Modal / Painel com rodapé fixo */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-surface-2 border border-border shadow-2xl overflow-hidden">
            {/* Header fixo */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface-2">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {form.id ? "Editar produto" : "Novo produto"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Preencha as informações do produto para disponibilizá-lo aos dentistas.
                </p>
              </div>
              <button
                onClick={() => setForm(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-1 hover:text-foreground transition"
                aria-label="Fechar formulário"
              >
                <IconX size={18} />
              </button>
            </div>

            {/* Corpo rolável */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {(error || notice) && (
                <div
                  className={`rounded-xl border p-3 text-sm ${
                    error
                      ? "border-error/30 bg-error/10 text-error"
                      : "border-warning/30 bg-warning/10 text-foreground"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <span>{error ?? notice}</span>
                      {notice && !error && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => saveProduct(true)}
                            disabled={busy}
                            className="text-xs font-semibold underline hover:opacity-80"
                          >
                            Salvar mesmo assim sem arquivos obrigatórios
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Seção 1: Informações */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Informações Básicas
                </h3>

                <div>
                  <label className="block text-[12.5px] font-medium text-foreground mb-1.5">
                    Nome do produto <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={(e) => {
                      setForm({ ...form, nome: e.target.value });
                      if (formErrors.nome) setFormErrors({ ...formErrors, nome: undefined });
                    }}
                    placeholder="Ex: Coroa em Zircônia Translúcida"
                    className={`w-full rounded-lg border ${
                      formErrors.nome
                        ? "border-error focus:border-error focus:ring-error/20"
                        : "border-[#D7DAE5] focus:border-primary focus:ring-primary/20"
                    } bg-surface-1 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 transition`}
                  />
                  {formErrors.nome && (
                    <span className="text-xs text-error mt-1 block">{formErrors.nome}</span>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[12.5px] font-medium text-foreground">
                      Descrição do produto
                    </label>
                    <span className="text-xs text-muted-foreground">
                      {form.descricao.length}/500
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={form.descricao}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                    placeholder="Descreva detalhes do produto, indicações clínicas, material utilizado..."
                    className="w-full rounded-lg border border-[#D7DAE5] bg-surface-1 px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition resize-none"
                  />
                </div>
              </div>

              {/* Seção 2: Preço e Prazo */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Valores e Prazos
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12.5px] font-medium text-foreground mb-1.5">
                      Preço <span className="text-error">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-sm font-medium text-muted-foreground select-none pointer-events-none">
                        R$
                      </span>
                      <input
                        type="text"
                        value={form.preco}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^\d.,]/g, "");
                          setForm({ ...form, preco: val });
                          if (formErrors.preco) setFormErrors({ ...formErrors, preco: undefined });
                        }}
                        placeholder="0,00"
                        className={`w-full rounded-lg border ${
                          formErrors.preco
                            ? "border-error focus:border-error focus:ring-error/20"
                            : "border-[#D7DAE5] focus:border-primary focus:ring-primary/20"
                        } bg-surface-1 pl-10 pr-3 py-2 text-sm font-mono text-foreground outline-none focus:ring-2 transition`}
                      />
                    </div>
                    {formErrors.preco && (
                      <span className="text-xs text-error mt-1 block">{formErrors.preco}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[12.5px] font-medium text-foreground mb-1.5">
                      Prazo de entrega <span className="text-error">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="1"
                        value={form.prazo_dias}
                        onChange={(e) => {
                          setForm({ ...form, prazo_dias: e.target.value });
                          if (formErrors.prazo_dias)
                            setFormErrors({ ...formErrors, prazo_dias: undefined });
                        }}
                        placeholder="5"
                        className={`w-full rounded-lg border ${
                          formErrors.prazo_dias
                            ? "border-error focus:border-error focus:ring-error/20"
                            : "border-[#D7DAE5] focus:border-primary focus:ring-primary/20"
                        } bg-surface-1 pl-3 pr-20 py-2 text-sm text-foreground outline-none focus:ring-2 transition`}
                      />
                      <span className="absolute right-3 text-xs font-medium text-muted-foreground select-none pointer-events-none">
                        dias úteis
                      </span>
                    </div>
                    {formErrors.prazo_dias && (
                      <span className="text-xs text-error mt-1 block">{formErrors.prazo_dias}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Seção 3: Arquivos Obrigatórios */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Arquivos Obrigatórios
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Marque os arquivos que o dentista deve enviar com este serviço.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {allFileOptions.map((file) => {
                    const isSelected = form.arquivos_obrigatorios.includes(file);
                    const isCustom = !DEFAULT_FILE_OPTIONS.includes(file);
                    return (
                      <div
                        key={file}
                        onClick={() => toggleFile(file)}
                        className={`group flex items-center justify-between gap-2.5 rounded-lg border p-3 cursor-pointer select-none transition ${
                          isSelected
                            ? "border-primary bg-primary/5 text-primary shadow-sm"
                            : "border-[#D7DAE5] bg-surface-1 text-foreground hover:border-foreground/30"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${
                              isSelected
                                ? "bg-primary border-primary text-white"
                                : "border-[#D7DAE5] bg-surface-2"
                            }`}
                          >
                            {isSelected && <IconCheck size={12} stroke={3} />}
                          </div>
                          <span className="text-xs font-medium truncate">{file}</span>
                        </div>
                        {isCustom && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeCustomFile(file);
                            }}
                            className="text-muted-foreground hover:text-error p-1 rounded transition"
                            title="Remover arquivo customizado"
                          >
                            <IconX size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Input para arquivo customizado */}
                <div className="pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Outro arquivo (ex: Tomografia DICOM, Mockup...)"
                      value={customFileText}
                      onChange={(e) => setCustomFileText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomFile();
                        }
                      }}
                      className="flex-1 rounded-lg border border-[#D7DAE5] bg-surface-1 px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomFile}
                      disabled={!customFileText.trim()}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#D7DAE5] bg-surface-1 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2 transition disabled:opacity-50"
                    >
                      <IconPlus size={14} />
                      <span>Adicionar outro arquivo</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Seção 4: Visibilidade */}
              <div className="pt-2">
                <div className="flex items-start justify-between gap-4 rounded-xl border border-[#D7DAE5] bg-surface-1 p-4">
                  <div className="space-y-0.5">
                    <label
                      htmlFor="produto-ativo-switch"
                      className="text-sm font-medium text-foreground cursor-pointer"
                    >
                      Produto ativo na loja
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Quando desativado, o produto não aparece na vitrine pública nem no catálogo de
                      pedidos dos dentistas.
                    </p>
                  </div>
                  <Switch
                    id="produto-ativo-switch"
                    checked={form.ativo}
                    onCheckedChange={(checked) => setForm({ ...form, ativo: checked })}
                  />
                </div>
              </div>
            </div>

            {/* Rodapé fixo */}
            <div className="border-t border-border bg-surface-2 px-6 py-3.5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setForm(null)}
                disabled={busy}
                className="rounded-lg border border-[#D7DAE5] bg-surface-1 px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => saveProduct(false)}
                disabled={busy}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition shadow-[var(--shadow-soft)] disabled:opacity-50"
              >
                {busy ? "Salvando…" : "Salvar produto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid de produtos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <article
            key={p.id}
            className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-foreground">{p.nome}</h2>
                  <div className="mt-1 text-xs text-muted-foreground">Prazo: {p.prazo_dias} dias úteis</div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    p.ativo ? "bg-success/10 text-success" : "bg-surface-1 text-muted-foreground"
                  }`}
                >
                  {p.ativo ? "Ativo" : "Inativo"}
                </span>
              </div>

              {p.descricao && (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{p.descricao}</p>
              )}

              <div className="mt-4 font-mono text-2xl font-bold text-foreground">
                {p.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>

              <div className="mt-3 min-h-10 text-xs text-subtle-foreground">
                Arquivos:{" "}
                {p.arquivos_obrigatorios.length
                  ? p.arquivos_obrigatorios.join(" · ")
                  : "nenhum obrigatório"}
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {p.order_count} pedido(s) vinculados
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 pt-3 border-t border-border">
              <IconButton label="Editar" onClick={() => startEdit(p)}>
                <IconEdit size={16} />
              </IconButton>
              <IconButton
                label={p.ativo ? "Desativar" : "Ativar"}
                onClick={() => toggleActive(p)}
              >
                <IconPower size={16} />
              </IconButton>
              <IconButton label="Excluir" onClick={() => deleteProduct(p)}>
                <IconTrash size={16} />
              </IconButton>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid place-items-center rounded-lg border border-border bg-surface-1 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-surface-2 transition"
    >
      {children}
    </button>
  );
}
