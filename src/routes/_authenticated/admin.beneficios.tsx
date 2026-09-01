import { type FormEvent, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { IconGift, IconPlus, IconTrash, IconExternalLink } from "@tabler/icons-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/beneficios")({
  component: AdminBeneficiosScreen,
});

type BenefitItem = {
  id: string;
  titulo: string;
  descricao: string;
  url_conteudo: string;
  cupom: string | null;
  capa_url: string | null;
  criado_em: string;
};

const INPUT_CLASS =
  "mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary";

function AdminBeneficiosScreen() {
  const [items, setItems] = useState<BenefitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    url_conteudo: "",
    cupom: "",
    capa_url: "",
  });

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    const { data } = await supabase
      .from("benefits")
      .select("*")
      .order("criado_em", { ascending: false });

    setItems((data ?? []) as BenefitItem[]);
    setLoading(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);

    const { error } = await supabase.from("benefits").insert({
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim(),
      url_conteudo: form.url_conteudo.trim(),
      cupom: form.cupom.trim() || null,
      capa_url: form.capa_url.trim() || null,
    });

    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setForm({ titulo: "", descricao: "", url_conteudo: "", cupom: "", capa_url: "" });
    setMessage("Benefício/Parceria cadastrado com sucesso.");
    await loadItems();
  }

  async function handleRemove(id: string) {
    const { error } = await supabase.from("benefits").delete().eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }
    await loadItems();
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-1">
          <IconGift size={18} /> Gestão de Clube de Vantagens
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Benefícios & Parcerias
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre descontos, cupons e ofertas exclusivas de parceiros para dentistas e laboratórios.
        </p>
      </header>

      <section className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-6 space-y-5">
        <h2 className="text-base font-semibold text-foreground">Novo Benefício / Parceria</h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-xs font-medium text-muted-foreground">
            Título da Parceria
            <input
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              placeholder="Ex: 20% de Desconto em Scanners Intraorais"
              required
              className={INPUT_CLASS}
            />
          </label>

          <label className="text-xs font-medium text-muted-foreground">
            Cupom de Desconto (Opcional)
            <input
              value={form.cupom}
              onChange={(e) => setForm((f) => ({ ...f, cupom: e.target.value }))}
              placeholder="Ex: LABCONECT20"
              className={INPUT_CLASS}
            />
          </label>

          <label className="md:col-span-2 text-xs font-medium text-muted-foreground">
            Descrição do Benefício
            <input
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              placeholder="Ex: Válido para a primeira compra de insumos na Dental Cremer"
              required
              className={INPUT_CLASS}
            />
          </label>

          <label className="text-xs font-medium text-muted-foreground">
            Link do Parceiro / Resgate
            <input
              type="url"
              value={form.url_conteudo}
              onChange={(e) => setForm((f) => ({ ...f, url_conteudo: e.target.value }))}
              placeholder="https://..."
              required
              className={INPUT_CLASS}
            />
          </label>

          <label className="text-xs font-medium text-muted-foreground">
            URL do Logo / Imagem (Opcional)
            <input
              type="url"
              value={form.capa_url}
              onChange={(e) => setForm((f) => ({ ...f, capa_url: e.target.value }))}
              placeholder="https://..."
              className={INPUT_CLASS}
            />
          </label>

          <div className="md:col-span-2 flex items-center justify-between gap-3 pt-2">
            {message ? <p className="text-xs text-muted-foreground">{message}</p> : <span />}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95 disabled:opacity-60"
            >
              <IconPlus size={16} /> {busy ? "Cadastrando..." : "Cadastrar Benefício"}
            </button>
          </div>
        </form>
      </section>

      {/* Lista de Benefícios */}
      <section className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Benefícios Ativos</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Nenhum benefício cadastrado ainda.</div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{item.titulo}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground flex items-center gap-2">
                      {item.cupom && (
                        <span className="font-mono bg-primary-tint text-primary-tint-foreground px-2 py-0.5 rounded font-bold">
                          {item.cupom}
                        </span>
                      )}
                      <span className="truncate">{item.descricao}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={item.url_conteudo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-2 text-muted-foreground hover:bg-surface-1 hover:text-foreground"
                      title="Abrir link do parceiro"
                    >
                      <IconExternalLink size={16} />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-surface-1 hover:text-error"
                      title="Remover benefício"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
