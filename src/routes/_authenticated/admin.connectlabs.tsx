import { type FormEvent, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { IconCheck, IconAlertTriangle, IconPlus, IconTrash } from "@tabler/icons-react";
import { getAsaasConfigured } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/connectlabs")({
  component: ConnectLabsConfig,
});

type AcademyContent = {
  id: string;
  tipo: "ebook" | "curso" | "tutorial";
  titulo: string;
  descricao: string;
  url_conteudo: string;
  capa_url: string | null;
};

const INPUT_CLASS =
  "mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary";

function ConnectLabsConfig() {
  const check = useServerFn(getAsaasConfigured);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [academy, setAcademy] = useState<AcademyContent[]>([]);
  const [academyLoading, setAcademyLoading] = useState(true);
  const [academyBusy, setAcademyBusy] = useState(false);
  const [academyMessage, setAcademyMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    tipo: "ebook" as AcademyContent["tipo"],
    titulo: "",
    descricao: "",
    url_conteudo: "",
    capa_url: "",
  });

  useEffect(() => {
    check().then((r) => setConfigured(r.configured)).catch(() => setConfigured(false));
  }, [check]);

  useEffect(() => {
    loadAcademy();
  }, []);

  async function loadAcademy() {
    const { data } = await supabase
      .from("academy_content")
      .select("id, tipo, titulo, descricao, url_conteudo, capa_url")
      .order("criado_em", { ascending: false });
    setAcademy((data ?? []) as AcademyContent[]);
    setAcademyLoading(false);
  }

  async function saveAcademy(e: FormEvent) {
    e.preventDefault();
    setAcademyBusy(true);
    setAcademyMessage(null);
    const { error } = await supabase.from("academy_content").insert({
      tipo: form.tipo,
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim(),
      url_conteudo: form.url_conteudo.trim(),
      capa_url: form.capa_url.trim() || null,
    });
    setAcademyBusy(false);
    if (error) {
      setAcademyMessage(error.message);
      return;
    }
    setForm({ tipo: "ebook", titulo: "", descricao: "", url_conteudo: "", capa_url: "" });
    setAcademyMessage("Conteúdo cadastrado.");
    await loadAcademy();
  }

  async function removeAcademy(id: string) {
    const { error } = await supabase.from("academy_content").delete().eq("id", id);
    if (error) {
      setAcademyMessage(error.message);
      return;
    }
    await loadAcademy();
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Configuração da ConnectLabs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Credenciais globais da plataforma
        </p>
      </header>

      <section className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-6 space-y-4">
        <div>
          <div className="text-sm font-semibold text-foreground">Chave de API Asaas</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Usada pelo backend da ConnectLabs para criar cobranças e configurar o split automático
            para os laboratórios em modo "Via ConnectLabs". Armazenada como secret — nunca é
            exibida depois de salva.
          </p>
        </div>

        {configured === null ? (
          <div className="text-xs text-muted-foreground">Verificando…</div>
        ) : configured ? (
          <div className="flex items-center gap-2 rounded-lg bg-success/10 border border-success/30 px-3 py-2 text-xs text-success">
            <IconCheck size={16} /> Chave configurada.
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-xs text-warning">
            <IconAlertTriangle size={16} /> Chave ainda não configurada. Peça ao Lovable para
            configurar o secret <code className="font-mono">ASAAS_API_KEY</code>.
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-6 space-y-5">
        <div>
          <div className="text-sm font-semibold text-foreground">Academy</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Cadastre ebooks, cursos e tutoriais que aparecerão no portal do dentista.
          </p>
        </div>

        <form onSubmit={saveAcademy} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-xs font-medium text-muted-foreground">
            Tipo
            <select
              value={form.tipo}
              onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as AcademyContent["tipo"] }))}
              className={INPUT_CLASS}
            >
              <option value="ebook">Ebook</option>
              <option value="curso">Curso</option>
              <option value="tutorial">Tutorial</option>
            </select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Título
            <input
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              required
              className={INPUT_CLASS}
            />
          </label>
          <label className="md:col-span-2 text-xs font-medium text-muted-foreground">
            Descrição
            <textarea
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              required
              rows={3}
              className={INPUT_CLASS}
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            URL do conteúdo
            <input
              type="url"
              value={form.url_conteudo}
              onChange={(e) => setForm((f) => ({ ...f, url_conteudo: e.target.value }))}
              required
              className={INPUT_CLASS}
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            URL da capa (opcional)
            <input
              type="url"
              value={form.capa_url}
              onChange={(e) => setForm((f) => ({ ...f, capa_url: e.target.value }))}
              className={INPUT_CLASS}
            />
          </label>
          <div className="md:col-span-2 flex items-center justify-between gap-3">
            {academyMessage ? <p className="text-xs text-muted-foreground">{academyMessage}</p> : <span />}
            <button
              type="submit"
              disabled={academyBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95 disabled:opacity-60"
            >
              <IconPlus size={16} /> {academyBusy ? "Salvando…" : "Cadastrar"}
            </button>
          </div>
        </form>

        <div className="rounded-xl border border-border overflow-hidden">
          {academyLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Carregando…</div>
          ) : academy.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Nenhum conteúdo de Academy cadastrado.</div>
          ) : (
            <ul className="divide-y divide-border">
              {academy.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{item.titulo}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground capitalize">{item.tipo}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAcademy(item.id)}
                    className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-surface-1 hover:text-error"
                    aria-label="Remover conteúdo"
                    title="Remover conteúdo"
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
