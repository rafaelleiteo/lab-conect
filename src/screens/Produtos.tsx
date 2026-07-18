import { useEffect, useMemo, useState } from "react";
import { IconAlertTriangle, IconEdit, IconPlus, IconPower, IconTrash, IconX } from "@tabler/icons-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentLab } from "@/hooks/useCurrentLab";

type Product = {
  id: string;
  lab_id: string;
  nome: string;
  preco: number;
  prazo_dias: number;
  ativo: boolean;
  arquivos_obrigatorios: string[];
  order_count: number;
};

type FormState = {
  id?: string;
  nome: string;
  preco: string;
  prazo_dias: string;
  ativo: boolean;
  arquivos_obrigatorios: string[];
};

const FILE_OPTIONS = [
  "STL superior",
  "STL inferior",
  "Escaneamento intraoral",
  "Fotos do paciente",
  "Receita / instruções clínicas",
];

const emptyForm: FormState = {
  nome: "",
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
        .select("id, lab_id, nome, preco, prazo_dias, ativo, arquivos_obrigatorios")
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
    setForm(emptyForm);
  }

  function startEdit(product: Product) {
    setError(null);
    setNotice(null);
    setForm({
      id: product.id,
      nome: product.nome,
      preco: String(product.preco).replace(".", ","),
      prazo_dias: String(product.prazo_dias),
      ativo: product.ativo,
      arquivos_obrigatorios: product.arquivos_obrigatorios,
    });
  }

  function parseMoney(value: string) {
    const normalized = value.replace(/\./g, "").replace(",", ".").trim();
    const number = Number(normalized);
    return Number.isFinite(number) ? number : NaN;
  }

  async function saveProduct(force = false) {
    if (!lab || !form) return;
    setError(null);
    setNotice(null);
    const preco = parseMoney(form.preco);
    const prazo = Number(form.prazo_dias);
    if (form.nome.trim().length < 2) {
      setError("Informe um nome de produto válido.");
      return;
    }
    if (!Number.isFinite(preco) || preco <= 0) {
      setError("Informe um preço válido maior que zero antes de salvar.");
      return;
    }
    if (!Number.isInteger(prazo) || prazo < 1) {
      setError("Informe um prazo em dias válido.");
      return;
    }
    if (!force && form.arquivos_obrigatorios.length === 0) {
      setNotice("Nenhum arquivo obrigatório definido — o dentista poderá enviar o pedido sem anexos.");
      return;
    }

    setBusy(true);
    const payload = {
      lab_id: lab.id,
      nome: form.nome.trim(),
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
      setNotice("Este produto já possui pedidos vinculados. A exclusão foi bloqueada; desative o produto para removê-lo da loja sem afetar o histórico.");
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

      {(error || notice) && (
        <div className={`rounded-xl border p-3 text-sm ${error ? "border-error/30 bg-error/10 text-error" : "border-warning/30 bg-warning/10 text-foreground"}`}>
          <div className="flex items-start gap-2">
            <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error ?? notice}</span>
          </div>
        </div>
      )}

      {form && (
        <section className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">{form.id ? "Editar produto" : "Novo produto"}</h2>
            <button onClick={() => setForm(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-1" aria-label="Fechar formulário">
              <IconX size={18} />
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_140px_120px]">
            <Field label="Nome do produto">
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="input" />
            </Field>
            <Field label="Preço">
              <input value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} inputMode="decimal" className="input" />
            </Field>
            <Field label="Prazo (dias)">
              <input value={form.prazo_dias} onChange={(e) => setForm({ ...form, prazo_dias: e.target.value })} inputMode="numeric" className="input" />
            </Field>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Arquivos obrigatórios</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {FILE_OPTIONS.map((file) => (
                <label key={file} className="flex items-center gap-2 rounded-lg border border-border bg-surface-1 px-3 py-2 text-xs text-foreground">
                  <input
                    type="checkbox"
                    checked={form.arquivos_obrigatorios.includes(file)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...form.arquivos_obrigatorios, file]
                        : form.arquivos_obrigatorios.filter((f) => f !== file);
                      setForm({ ...form, arquivos_obrigatorios: next });
                    }}
                  />
                  {file}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
            Produto ativo na loja
          </label>
          <div className="flex justify-end gap-2">
            {notice && !error && (
              <button onClick={() => saveProduct(true)} disabled={busy} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-1 disabled:opacity-60">
                Salvar mesmo assim
              </button>
            )}
            <button onClick={() => saveProduct(false)} disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
              {busy ? "Salvando…" : "Salvar produto"}
            </button>
          </div>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <article key={p.id} className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-5 flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-foreground">{p.nome}</h2>
                <div className="mt-1 text-xs text-muted-foreground">Prazo: {p.prazo_dias} dias</div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${p.ativo ? "bg-success/10 text-success" : "bg-surface-1 text-muted-foreground"}`}>
                {p.ativo ? "Ativo" : "Inativo"}
              </span>
            </div>
            <div className="mt-4 font-mono text-2xl font-bold text-foreground">
              {p.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
            <div className="mt-4 min-h-10 text-xs text-subtle-foreground">
              Arquivos: {p.arquivos_obrigatorios.length ? p.arquivos_obrigatorios.join(" · ") : "nenhum obrigatório"}
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">{p.order_count} pedido(s) vinculados</div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <IconButton label="Editar" onClick={() => startEdit(p)}><IconEdit size={16} /></IconButton>
              <IconButton label={p.ativo ? "Desativar" : "Ativar"} onClick={() => toggleActive(p)}><IconPower size={16} /></IconButton>
              <IconButton label="Excluir" onClick={() => deleteProduct(p)}><IconTrash size={16} /></IconButton>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid place-items-center rounded-lg border border-border bg-surface-1 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-surface-2"
    >
      {children}
    </button>
  );
}