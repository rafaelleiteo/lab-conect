import { type FormEvent, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { IconCheck, IconAlertTriangle, IconPlus, IconTrash, IconEye, IconCode } from "@tabler/icons-react";
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

type Benefit = {
  id: string;
  titulo: string;
  descricao: string;
  tipo: string;
  parceiro: string;
  url_link: string | null;
  criado_em: string;
};

const INPUT_CLASS =
  "mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary";

function ConnectLabsConfig() {
  const check = useServerFn(getAsaasConfigured);
  const [configured, setConfigured] = useState<boolean | null>(null);
  
  // Login Panel HTML
  const [loginHtml, setLoginHtml] = useState("");
  const [loginHtmlBusy, setLoginHtmlBusy] = useState(false);
  const [loginHtmlMessage, setLoginHtmlMessage] = useState<string | null>(null);

  // Academy
  const [academy, setAcademy] = useState<AcademyContent[]>([]);
  const [academyLoading, setAcademyLoading] = useState(true);
  const [academyBusy, setAcademyBusy] = useState(false);
  const [academyMessage, setAcademyMessage] = useState<string | null>(null);
  const [academyForm, setAcademyForm] = useState({
    tipo: "ebook" as AcademyContent["tipo"],
    titulo: "",
    descricao: "",
    url_conteudo: "",
    capa_url: "",
  });

  // Benefits
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [benefitsLoading, setBenefitsLoading] = useState(true);
  const [benefitsBusy, setBenefitsBusy] = useState(false);
  const [benefitsMessage, setBenefitsMessage] = useState<string | null>(null);
  const [benefitForm, setBenefitForm] = useState({
    titulo: "",
    descricao: "",
    tipo: "Desconto",
    parceiro: "",
    url_link: "",
  });

  useEffect(() => {
    check().then((r) => setConfigured(r.configured)).catch(() => setConfigured(false));
  }, [check]);

  useEffect(() => {
    loadAcademy();
    loadLoginHtml();
    loadBenefits();
  }, []);

  async function loadLoginHtml() {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "login_right_panel_html")
      .maybeSingle();
    if (data?.value) {
      setLoginHtml(data.value);
    }
  }

  async function saveLoginHtml(e: FormEvent) {
    e.preventDefault();
    setLoginHtmlBusy(true);
    setLoginHtmlMessage(null);
    const { error } = await supabase.from("site_settings").upsert({
      key: "login_right_panel_html",
      value: loginHtml,
      atualizado_em: new Date().toISOString(),
    });
    setLoginHtmlBusy(false);
    if (error) {
      setLoginHtmlMessage(error.message);
      return;
    }
    setLoginHtmlMessage("Conteúdo da tela de login atualizado com sucesso!");
  }

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
      tipo: academyForm.tipo,
      titulo: academyForm.titulo.trim(),
      descricao: academyForm.descricao.trim(),
      url_conteudo: academyForm.url_conteudo.trim(),
      capa_url: academyForm.capa_url.trim() || null,
    });
    setAcademyBusy(false);
    if (error) {
      setAcademyMessage(error.message);
      return;
    }
    setAcademyForm({ tipo: "ebook", titulo: "", descricao: "", url_conteudo: "", capa_url: "" });
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

  async function loadBenefits() {
    const { data } = await supabase
      .from("benefits")
      .select("id, titulo, descricao, tipo, parceiro, url_link, criado_em")
      .order("criado_em", { ascending: false });
    setBenefits((data ?? []) as Benefit[]);
    setBenefitsLoading(false);
  }

  async function saveBenefit(e: FormEvent) {
    e.preventDefault();
    setBenefitsBusy(true);
    setBenefitsMessage(null);
    const { error } = await supabase.from("benefits").insert({
      titulo: benefitForm.titulo.trim(),
      descricao: benefitForm.descricao.trim(),
      tipo: benefitForm.tipo.trim(),
      parceiro: benefitForm.parceiro.trim(),
      url_link: benefitForm.url_link.trim() || null,
    });
    setBenefitsBusy(false);
    if (error) {
      setBenefitsMessage(error.message);
      return;
    }
    setBenefitForm({ titulo: "", descricao: "", tipo: "Desconto", parceiro: "", url_link: "" });
    setBenefitsMessage("Benefício cadastrado com sucesso!");
    await loadBenefits();
  }

  async function removeBenefit(id: string) {
    const { error } = await supabase.from("benefits").delete().eq("id", id);
    if (error) {
      setBenefitsMessage(error.message);
      return;
    }
    await loadBenefits();
  }

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Configuração da LabConect
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Credenciais globais, conteúdo da login, Academy e Benefícios
        </p>
      </header>

      {/* Asaas Info */}
      <section className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-6 space-y-4">
        <div>
          <div className="text-sm font-semibold text-foreground">Chave de API Asaas</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Usada pelo backend da LabConect para criar cobranças e configurar o split automático
            para os laboratórios em modo "Via LabConect". Armazenada como secret — nunca é
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
            <IconAlertTriangle size={16} /> Chave ainda não configurada. Peça para configurar o secret <code className="font-mono">ASAAS_API_KEY</code>.
          </div>
        )}
      </section>

      {/* Bloco 6: Painel Direito do Login */}
      <section className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-6 space-y-5">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <IconCode size={18} className="text-primary" /> Painel Direito da Tela de Login (HTML)
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Cole um bloco de HTML para personalizar o painel direito da página de login. O conteúdo é renderizado em iFrame seguro isolado (<code className="font-mono">sandbox="allow-scripts"</code>).
          </p>
        </div>

        <form onSubmit={saveLoginHtml} className="space-y-4">
          <label className="block text-xs font-medium text-muted-foreground">
            Código HTML
            <textarea
              value={loginHtml}
              onChange={(e) => setLoginHtml(e.target.value)}
              placeholder="<div><h1>Bem-vindo à LabConect</h1><p>Conectando talentos e entregando excelência.</p></div>"
              rows={6}
              className={`${INPUT_CLASS} font-mono text-xs`}
            />
          </label>

          {/* Real-time Sandboxed iFrame Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <IconEye size={15} /> Pré-visualização do iFrame Sandbox (Tempo Real)
            </div>
            <div className="rounded-xl border border-border bg-white overflow-hidden p-2 min-h-[160px]">
              <iframe
                title="Pré-visualização do Login"
                sandbox="allow-scripts"
                srcDoc={loginHtml || "<div style='font-family:sans-serif;padding:20px;color:#666;text-align:center;'>Nenhum HTML personalizado colado. O painel padrão será exibido.</div>"}
                className="w-full h-[180px] border-0"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            {loginHtmlMessage ? <p className="text-xs text-success font-medium">{loginHtmlMessage}</p> : <span />}
            <button
              type="submit"
              disabled={loginHtmlBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95 disabled:opacity-60"
            >
              {loginHtmlBusy ? "Publicando…" : "Publicar HTML no Login"}
            </button>
          </div>
        </form>
      </section>

      {/* Academy Config */}
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
              value={academyForm.tipo}
              onChange={(e) => setAcademyForm((f) => ({ ...f, tipo: e.target.value as AcademyContent["tipo"] }))}
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
              value={academyForm.titulo}
              onChange={(e) => setAcademyForm((f) => ({ ...f, titulo: e.target.value }))}
              required
              className={INPUT_CLASS}
            />
          </label>
          <label className="md:col-span-2 text-xs font-medium text-muted-foreground">
            Descrição
            <textarea
              value={academyForm.descricao}
              onChange={(e) => setAcademyForm((f) => ({ ...f, descricao: e.target.value }))}
              required
              rows={3}
              className={INPUT_CLASS}
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            URL do conteúdo
            <input
              type="url"
              value={academyForm.url_conteudo}
              onChange={(e) => setAcademyForm((f) => ({ ...f, url_conteudo: e.target.value }))}
              required
              className={INPUT_CLASS}
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            URL da capa (opcional)
            <input
              type="url"
              value={academyForm.capa_url}
              onChange={(e) => setAcademyForm((f) => ({ ...f, capa_url: e.target.value }))}
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
              <IconPlus size={16} /> {academyBusy ? "Salvando…" : "Cadastrar na Academy"}
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

      {/* Bloco 8: Benefícios Config */}
      <section className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-6 space-y-5">
        <div>
          <div className="text-sm font-semibold text-foreground">Benefícios e Parcerias</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Cadastre parceiros, descontos e vantagens para os dentistas na plataforma.
          </p>
        </div>

        <form onSubmit={saveBenefit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-xs font-medium text-muted-foreground">
            Título do Benefício
            <input
              value={benefitForm.titulo}
              onChange={(e) => setBenefitForm((f) => ({ ...f, titulo: e.target.value }))}
              required
              className={INPUT_CLASS}
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Parceiro
            <input
              value={benefitForm.parceiro}
              onChange={(e) => setBenefitForm((f) => ({ ...f, parceiro: e.target.value }))}
              required
              placeholder="Ex: Dental Cremer, Straumann..."
              className={INPUT_CLASS}
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Tipo
            <input
              value={benefitForm.tipo}
              onChange={(e) => setBenefitForm((f) => ({ ...f, tipo: e.target.value }))}
              required
              placeholder="Ex: Desconto de 15%, Frete Grátis..."
              className={INPUT_CLASS}
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Link do Parceiro (opcional)
            <input
              type="url"
              value={benefitForm.url_link}
              onChange={(e) => setBenefitForm((f) => ({ ...f, url_link: e.target.value }))}
              className={INPUT_CLASS}
            />
          </label>
          <label className="md:col-span-2 text-xs font-medium text-muted-foreground">
            Descrição
            <textarea
              value={benefitForm.descricao}
              onChange={(e) => setBenefitForm((f) => ({ ...f, descricao: e.target.value }))}
              required
              rows={2}
              className={INPUT_CLASS}
            />
          </label>
          <div className="md:col-span-2 flex items-center justify-between gap-3">
            {benefitsMessage ? <p className="text-xs text-success font-medium">{benefitsMessage}</p> : <span />}
            <button
              type="submit"
              disabled={benefitsBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95 disabled:opacity-60"
            >
              <IconPlus size={16} /> {benefitsBusy ? "Salvando…" : "Cadastrar Benefício"}
            </button>
          </div>
        </form>

        <div className="rounded-xl border border-border overflow-hidden">
          {benefitsLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Carregando…</div>
          ) : benefits.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Nenhum benefício cadastrado. Dentistas verão o estado vazio honesto ("Em breve: descontos e parcerias pra você").</div>
          ) : (
            <ul className="divide-y divide-border">
              {benefits.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{b.titulo}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{b.parceiro} • {b.tipo}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBenefit(b.id)}
                    className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-surface-1 hover:text-error"
                    aria-label="Remover benefício"
                    title="Remover benefício"
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
