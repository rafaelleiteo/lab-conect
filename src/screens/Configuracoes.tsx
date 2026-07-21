import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentLab } from "@/hooks/useCurrentLab";
import { LabAvatar } from "@/components/LabAvatar";
import { team } from "@/data/mock";

const INPUT =
  "mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary";

export function Configuracoes() {
  const { lab, loading, reload } = useCurrentLab();
  const [nome, setNome] = useState("");
  const [savingNome, setSavingNome] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const [logoErr, setLogoErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (lab) {
      setNome(lab.nome);
      setVisivel(lab.visivel_diretorio);
    }
  }, [lab?.id, lab?.nome, lab?.visivel_diretorio]);

  async function saveNome() {
    if (!lab || nome.trim() === lab.nome) return;
    setSavingNome(true);
    await supabase.from("labs").update({ nome: nome.trim() }).eq("id", lab.id);
    setSavingNome(false);
    reload();
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
          Identidade do laboratório e permissões da equipe
        </p>
      </header>

      <section className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-6 space-y-5">
        <h2 className="text-sm font-semibold text-foreground">Identidade</h2>

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
            onBlur={saveNome}
            className={INPUT}
          />
          {savingNome && <p className="mt-1 text-[11px] text-muted-foreground">Salvando…</p>}
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
      </section>

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

      <section className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)]">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Equipe e permissões</h2>
        </div>
        <ul className="divide-y divide-border">
          {team.map((m) => {
            const initials = m.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <li key={m.name} className="flex items-center gap-4 px-6 py-4">
                <div className="shrink-0 h-10 w-10 rounded-full bg-primary-tint text-primary-tint-foreground grid place-items-center text-sm font-semibold">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-foreground">{m.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{m.role}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
