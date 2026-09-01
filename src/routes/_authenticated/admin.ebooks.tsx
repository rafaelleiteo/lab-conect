import { type FormEvent, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { IconBook2, IconPlus, IconTrash } from "@tabler/icons-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/ebooks")({
  component: AdminEbooksScreen,
});

type EbookItem = {
  id: string;
  tipo: "ebook";
  titulo: string;
  descricao: string;
  url_conteudo: string;
  capa_url: string | null;
  criado_em: string;
};

const INPUT_CLASS =
  "mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary";

function AdminEbooksScreen() {
  const [items, setItems] = useState<EbookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    url_conteudo: "",
    capa_url: "",
  });

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    const { data } = await supabase
      .from("academy_content")
      .select("*")
      .eq("tipo", "ebook")
      .order("criado_em", { ascending: false });

    setItems((data ?? []) as EbookItem[]);
    setLoading(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);

    const { error } = await supabase.from("academy_content").insert({
      tipo: "ebook",
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim(),
      url_conteudo: form.url_conteudo.trim(),
      capa_url: form.capa_url.trim() || null,
    });

    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setForm({ titulo: "", descricao: "", url_conteudo: "", capa_url: "" });
    setMessage("E-book cadastrado com sucesso.");
    await loadItems();
  }

  async function handleRemove(id: string) {
    const { error } = await supabase.from("academy_content").delete().eq("id", id);
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
          <IconBook2 size={18} /> Gestão de Conteúdo
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          E-books & Guias Digitais
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre manuais em PDF, e-books e guias prostéticos para download.
        </p>
      </header>

      <section className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-6 space-y-5">
        <h2 className="text-base font-semibold text-foreground">Novo E-book / Guia</h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="md:col-span-2 text-xs font-medium text-muted-foreground">
            Título do E-book
            <input
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              placeholder="Ex: Guia Completo de Facetas em Cerâmica"
              required
              className={INPUT_CLASS}
            />
          </label>

          <label className="md:col-span-2 text-xs font-medium text-muted-foreground">
            Descrição
            <textarea
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              placeholder="Conteúdo abordado no e-book..."
              required
              rows={3}
              className={INPUT_CLASS}
            />
          </label>

          <label className="text-xs font-medium text-muted-foreground">
            URL do PDF / Download
            <input
              type="url"
              value={form.url_conteudo}
              onChange={(e) => setForm((f) => ({ ...f, url_conteudo: e.target.value }))}
              placeholder="https://.../ebook.pdf"
              required
              className={INPUT_CLASS}
            />
          </label>

          <label className="text-xs font-medium text-muted-foreground">
            URL da Capa (Imagem Opcional)
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
              <IconPlus size={16} /> {busy ? "Cadastrando..." : "Cadastrar E-book"}
            </button>
          </div>
        </form>
      </section>

      {/* Lista de Ebooks */}
      <section className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">E-books Cadastrados</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Nenhum e-book cadastrado ainda.</div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{item.titulo}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground truncate">{item.descricao}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-surface-1 hover:text-error"
                    title="Remover e-book"
                  >
                    <IconTrash size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
