import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentLab } from "@/hooks/useCurrentLab";
import { LabAvatar } from "@/components/LabAvatar";

const INPUT =
  "mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary";

export function Configuracoes() {
  const { lab, loading, reload } = useCurrentLab();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [emailContato, setEmailContato] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [visivel, setVisivel] = useState(false);
  const [logoErr, setLogoErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (lab) {
      setNome(lab.nome || "");
      setTelefone((lab as any).telefone || "");
      setEmailContato((lab as any).email_contato || "");
      setResponsavel((lab as any).responsavel || "");
      setVisivel(Boolean(lab.visivel_diretorio));
    }
  }, [lab?.id, lab?.nome, (lab as any)?.telefone, (lab as any)?.email_contato, (lab as any)?.responsavel, lab?.visivel_diretorio]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!lab) return;
    setSaving(true);
    setSaveNotice(null);

    const { error } = await supabase
      .from("labs")
      .update({
        nome: nome.trim(),
        telefone: telefone.trim() || null,
        email_contato: emailContato.trim() || null,
        responsavel: responsavel.trim() || null,
      })
      .eq("id", lab.id);

    setSaving(false);
    if (error) {
      setSaveNotice({ type: "error", message: `Erro ao salvar: ${error.message}` });
    } else {
      setSaveNotice({ type: "success", message: "Alterações salvas com sucesso!" });
      reload();
    }
  }

  async function toggleVisivel(next: boolean) {
    if (!lab) return;
    setVisivel(next);
    const { error } = await supabase
      .from("labs")
      .update({ visivel_diretorio: next })
      .eq("id", lab.id);
    if (error) {
      setVisivel(!next);
    } else {
      reload();
    }
  }

  async function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLogoErr(null);
    const file = e.target.files?.[0];
    if (!file || !lab) return;
    if (file.type !== "image/png") {
      setLogoErr("O arquivo precisa ser PNG.");
      e.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoErr("A imagem deve ter no máximo 2MB.");
      e.target.value = "";
      return;
    }
    setUploading(true);
    const path = `${lab.id}.png`;
    const { error: upErr } = await supabase.storage
      .from("lab-logos")
      .upload(path, file, { upsert: true, contentType: "image/png" });
    if (upErr) {
      setLogoErr(upErr.message);
      setUploading(false);
      e.target.value = "";
      return;
    }
    await supabase
      .from("labs")
      .update({ logo_url: `${path}?v=${Date.now()}` })
      .eq("id", lab.id);
    setUploading(false);
    e.target.value = "";
    reload();
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando…</div>;
  }
  if (!lab) {
    return (
      <div className="rounded-2xl bg-surface-2 border border-border p-6 text-sm text-muted-foreground">
        Nenhum laboratório vinculado à sua conta.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Identidade e visibilidade do laboratório
        </p>
      </header>

      <form onSubmit={handleSave} className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-6 space-y-5">
        <h2 className="text-sm font-semibold text-foreground">Identidade e contato</h2>

        <div className="flex items-center gap-4">
          <LabAvatar lab={lab} size={64} />
          <div className="flex-1 min-w-0">
            <label className="text-xs font-medium text-muted-foreground">Logo do laboratório</label>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png"
                onChange={onLogoChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="rounded-lg border border-border bg-surface-1 px-3 py-1.5 text-xs font-medium hover:bg-surface-2 disabled:opacity-60"
              >
                {uploading ? "Enviando…" : lab.logo_url ? "Trocar logo" : "Enviar logo"}
              </button>
              <span className="text-[11px] text-muted-foreground">
                PNG transparente, até 2MB.
              </span>
            </div>
            {logoErr && <p className="mt-1 text-xs text-error">{logoErr}</p>}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Nome do laboratório</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            className={INPUT}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Subdomínio</label>
          <div className="mt-1.5 flex items-stretch overflow-hidden rounded-lg border border-border">
            <input
              value={lab.subdominio}
              readOnly
              className="flex-1 min-w-0 bg-surface-1 px-3 py-2 text-sm text-muted-foreground outline-none"
            />
            <span className="flex items-center bg-surface-1 px-3 text-xs text-muted-foreground border-l border-border font-mono">
              .labconect.com.br
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Responsável</label>
            <input
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              placeholder="Nome do responsável"
              className={INPUT}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Telefone / WhatsApp</label>
            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(00) 00000-0000"
              className={INPUT}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">E-mail de contato</label>
          <input
            type="email"
            value={emailContato}
            onChange={(e) => setEmailContato(e.target.value)}
            placeholder="contato@laboratorio.com"
            className={INPUT}
          />
        </div>

        <div className="pt-2 flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Salvando…" : "Salvar alterações"}
          </button>
          {saveNotice && (
            <span
              className={`text-xs font-medium ${
                saveNotice.type === "success" ? "text-emerald-500" : "text-error"
              }`}
            >
              {saveNotice.message}
            </span>
          )}
        </div>
      </form>

      <section className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Diretório público</h2>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={visivel}
            onChange={(e) => toggleVisivel(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border"
          />
          <span className="text-sm">
            <span className="font-medium text-foreground">
              Aparecer no diretório público de laboratórios
            </span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              Quando ativado, dentistas podem encontrar este laboratório na busca e solicitar
              acesso.
            </span>
          </span>
        </label>
      </section>

      <section className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-6 space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Equipe</h2>
        <p className="text-xs text-muted-foreground">
          Gerenciamento de equipe em breve. A gestão de colaboradores e permissões será disponibilizada nas próximas atualizações.
        </p>
      </section>
    </div>
  );
}
