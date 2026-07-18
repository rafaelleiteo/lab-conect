import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ParcLabsLogo } from "@/components/ParcLabsLogo";

export const Route = createFileRoute("/cadastro-dentista")({
  component: CadastroDentista,
});

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA",
  "PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

const INPUT_CLASS =
  "mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary";

function CadastroDentista() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [cro, setCro] = useState("");
  const [uf, setUf] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!nome.trim() || !cro.trim() || !uf) {
      setErr("Preencha todos os campos.");
      return;
    }
    setBusy(true);
    try {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password: senha,
        options: { emailRedirectTo: window.location.origin },
      });
      if (signUpErr) {
        if (/registered|exists|already/i.test(signUpErr.message)) {
          setErr("Este e-mail já está cadastrado. Faça login para continuar.");
        } else {
          setErr(signUpErr.message);
        }
        return;
      }
      const userId = signUpData.user?.id;
      if (!userId) {
        setErr("Não foi possível criar a conta. Tente novamente.");
        return;
      }
      if (!signUpData.session) {
        await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
      }
      const { error: dentErr } = await supabase.from("dentists").insert({
        user_id: userId,
        nome: nome.trim(),
        email: email.trim(),
        cro: cro.trim(),
        uf,
      });
      if (dentErr) {
        setErr(dentErr.message);
        return;
      }
      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "dentist" });
      if (roleErr && !/duplicate/i.test(roleErr.message)) {
        setErr(roleErr.message);
        return;
      }
      navigate({ to: "/dentista", replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4 py-8">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft-lg)] p-6 space-y-5"
      >
        <div className="flex flex-col items-center gap-2">
          <ParcLabsLogo />
          <p className="text-xs text-muted-foreground">Criar conta de dentista</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nome completo</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} required className={INPUT_CLASS} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={INPUT_CLASS} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Senha (mín. 8 caracteres)</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              minLength={8}
              required
              className={INPUT_CLASS}
            />
          </div>
          <div className="grid grid-cols-[1fr_100px] gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">CRO</label>
              <input
                value={cro}
                onChange={(e) => setCro(e.target.value)}
                required
                placeholder="Ex.: 123456"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">UF</label>
              <select value={uf} onChange={(e) => setUf(e.target.value)} required className={INPUT_CLASS}>
                <option value="">—</option>
                {UFS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {err && <p className="text-xs text-error">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm font-semibold hover:bg-primary-hover disabled:opacity-60"
        >
          {busy ? "Criando conta…" : "Criar conta"}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          Já tem conta?{" "}
          <Link to="/auth" className="text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
