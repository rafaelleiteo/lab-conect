import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ParcLabsLogo } from "@/components/ParcLabsLogo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — LabConect" },
      {
        name: "description",
        content: "Acesse o portal do laboratório ou do dentista LabConect.",
      },
      { property: "og:title", content: "Entrar — LabConect" },
      {
        property: "og:description",
        content: "Acesse o portal do laboratório ou do dentista LabConect.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [customHtml, setCustomHtml] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "login_right_panel_html")
        .maybeSingle();
      if (data?.value) {
        setCustomHtml(data.value);
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F5F6FA]">
      {/* Esquerda: Formulário de Login */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center md:justify-start">
            <Link to="/" aria-label="LabConect — página inicial">
              <ParcLabsLogo size="md" variant="light" />
            </Link>
          </div>
          <div className="rounded-2xl border border-border bg-background p-8 shadow-[var(--shadow-soft-lg)]">
            <div className="space-y-1.5 text-center md:text-left">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Entrar na sua conta
              </h1>
              <p className="text-sm text-muted-foreground">
                Acesse o portal do laboratório ou do dentista.
              </p>
            </div>
            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div>
                <label className="text-xs font-medium text-muted-foreground">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Senha</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>
              {err && <p className="text-xs text-error">{err}</p>}
              <button
                type="submit"
                disabled={busy}
                className="bg-gradient-brand w-full rounded-lg text-white py-2.5 text-sm font-semibold shadow-[var(--shadow-soft-md)] hover:opacity-95 disabled:opacity-60 transition"
              >
                {busy ? "Entrando…" : "Entrar"}
              </button>
            </form>
            <div className="mt-6 rounded-lg border border-border bg-surface-2 p-4 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-2">Usuários de Teste</p>
              <ul className="space-y-1">
                <li><span className="font-mono text-foreground">admin@labconect.test</span> (Admin)</li>
                <li><span className="font-mono text-foreground">lab@updigital.test</span> (Laboratório)</li>
                <li><span className="font-mono text-foreground">dentista@updigital.test</span> (Dentista)</li>
              </ul>
              <p className="mt-2">senha: <span className="font-mono text-foreground">123456</span></p>
            </div>
            <div className="mt-8 pt-6 border-t border-border space-y-3 text-sm">
              <p className="text-center text-muted-foreground">Ainda não tem conta?</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/cadastro-dentista"
                  className="flex-1 text-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary hover:text-primary transition"
                >
                  Sou dentista
                </Link>
                <Link
                  to="/cadastro-laboratorio"
                  className="flex-1 text-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary hover:text-primary transition"
                >
                  Cadastrar laboratório
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Direita: Painel de Conteúdo (iFrame Sandbox se configurado no Admin) */}
      <div className="hidden md:flex w-1/2 p-6 md:p-12 items-center justify-center">
        <div className="w-full h-full max-w-xl rounded-3xl overflow-hidden border border-border bg-surface-1 shadow-[var(--shadow-soft-lg)] p-2">
          {customHtml ? (
            <iframe
              title="Conteúdo Configurável da Plataforma"
              sandbox="allow-scripts"
              srcDoc={customHtml}
              className="w-full h-full min-h-[500px] border-0 rounded-2xl"
            />
          ) : (
            <div className="h-full flex flex-col justify-between p-8 bg-gradient-to-br from-[#0B0F1E] to-[#1E293B] text-white rounded-2xl">
              <div>
                <ParcLabsLogo size="lg" variant="dark" />
                <h2 className="mt-8 text-2xl font-bold tracking-tight">
                  Conectando talentos. Entregando excelência.
                </h2>
                <p className="mt-4 text-sm text-white/70 leading-relaxed">
                  Gerencie seu laboratório de prótese, receba pedidos digitais de dentistas e acompanhe faturamentos em uma única plataforma integrada.
                </p>
              </div>
              <div className="pt-6 border-t border-white/10 text-xs text-white/50">
                LabConect • Plataforma de Prótese Odontológica
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
