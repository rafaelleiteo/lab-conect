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
    <div className="min-h-screen grid place-items-center bg-background px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft-lg)] p-6 space-y-5"
      >
        <div className="flex flex-col items-center gap-2">
          <ParcLabsLogo />
          <p className="text-xs text-muted-foreground">Portal ConnectLabs</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>
        {err && <p className="text-xs text-error">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm font-semibold hover:bg-primary-hover disabled:opacity-60"
        >
          {busy ? "Entrando…" : "Entrar"}
        </button>
        <div className="text-[11px] text-muted-foreground border-t border-border pt-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Link to="/cadastro-dentista" className="text-primary hover:underline font-semibold">
              Sou dentista, criar conta
            </Link>
            <Link to="/cadastro-laboratorio" className="text-primary hover:underline font-semibold">
              Cadastrar laboratório
            </Link>
          </div>
          <div className="border-t border-border pt-2 space-y-0.5">
            <p className="font-semibold text-foreground">Usuários de teste (senha: senha123)</p>
            <p>admin@connectlabs.test</p>
            <p>lab@updigital.test</p>
            <p>dentista@updigital.test</p>
          </div>
        </div>
      </form>
    </div>
  );
}
