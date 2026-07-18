import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ParcLabsLogo } from "@/components/ParcLabsLogo";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

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
    <div className="min-h-screen grid lg:grid-cols-[45fr_55fr] bg-background">
      {/* Left: brand panel */}
      <div
        className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 text-white"
        style={{ backgroundColor: "#0B0F1E" }}
      >
        <div
          aria-hidden
          className="absolute -top-32 -right-32 h-96 w-96 rounded-full opacity-30 blur-3xl"
          style={{ background: "var(--gradient-brand-diagonal)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -left-24 h-[28rem] w-[28rem] rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--gradient-brand)" }}
        />
        <div className="relative z-10">
          <ParcLabsLogo size="lg" showWordmark={false} className="!h-28" />
        </div>
        <div className="relative z-10 space-y-4 max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Sua loja e gestão de laboratório em{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-brand)" }}
            >
              um único link
            </span>
          </h1>
          <p className="text-sm text-white/60">
            ConnectLabs — a plataforma que conecta laboratórios de prótese e dentistas.
          </p>
        </div>
        <p className="relative z-10 text-xs text-white/40">
          © {new Date().getFullYear()} ConnectLabs
        </p>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center gap-3 lg:hidden">
            <ParcLabsLogo size="lg" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">Entrar na sua conta</h2>
            <p className="text-sm text-muted-foreground">
              Acesse o portal do laboratório ou do dentista.
            </p>
          </div>
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-medium text-muted-foreground">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
          <div className="pt-6 border-t border-border space-y-2 text-sm">
            <p className="text-muted-foreground">Ainda não tem conta?</p>
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
  );
}
