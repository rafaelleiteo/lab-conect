import { useState } from "react";
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
    <div
      className="min-h-screen grid place-items-center px-4 py-10"
      style={{ backgroundColor: "#F5F6FA" }}
    >
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link to="/" aria-label="LabConect — página inicial">
            <ParcLabsLogo size="md" variant="light" />
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-background p-8 shadow-[var(--shadow-soft-lg)]">
          <div className="space-y-1.5 text-center">
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
        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} LabConect
        </p>
      </div>
    </div>
  );
}
