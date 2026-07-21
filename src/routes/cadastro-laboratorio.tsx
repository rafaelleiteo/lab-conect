import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { ParcLabsLogo } from "@/components/ParcLabsLogo";
import {
  CONNECTLABS_MENSALIDADE,
  checkSubdomainAvailable,
  createLabSubscription,
} from "@/lib/lab-signup.functions";

export const Route = createFileRoute("/cadastro-laboratorio")({
  component: CadastroLaboratorio,
});

const INPUT =
  "mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary";

type Step = 1 | 2;

function CadastroLaboratorio() {
  const navigate = useNavigate();
  const checkSub = useServerFn(checkSubdomainAvailable);
  const createSub = useServerFn(createLabSubscription);

  const [step, setStep] = useState<Step>(1);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Step 1
  const [nome, setNome] = useState("");
  const [subdominio, setSubdominio] = useState("");
  const [subStatus, setSubStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">(
    "idle",
  );
  const [responsavel, setResponsavel] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [modoRecebimento, setModoRecebimento] = useState<"plataforma" | "proprio">("plataforma");

  // Step 2
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [cep, setCep] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [holderName, setHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [ccv, setCcv] = useState("");

  async function onSubdomainBlur() {
    const s = subdominio.trim().toLowerCase();
    if (s.length < 3) {
      setSubStatus("idle");
      return;
    }
    setSubStatus("checking");
    try {
      const r = await checkSub({ data: { subdominio: s } });
      if (!r.available) setSubStatus((r as any).reason === "invalid" ? "invalid" : "taken");
      else setSubStatus("ok");
    } catch {
      setSubStatus("idle");
    }
  }

  async function goStep2(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (subStatus === "taken") {
      setErr("Este subdomínio já está em uso.");
      return;
    }
    if (subStatus !== "ok") {
      await onSubdomainBlur();
      return;
    }
    setStep(2);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await createSub({
        data: {
          lab: {
            nome: nome.trim(),
            subdominio: subdominio.trim().toLowerCase(),
            responsavel: responsavel.trim(),
            email: email.trim(),
            senha,
            modo_recebimento: modoRecebimento,
          },
          billing: { cpfCnpj, cep, addressNumber, phone },
          card: {
            holderName: holderName.trim(),
            number: cardNumber,
            expiryMonth: expMonth,
            expiryYear: expYear,
            ccv,
          },
        },
      });
      // Sign in and go to lab settings
      await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
      navigate({ to: "/lab", replace: true });
    } catch (e: any) {
      setErr(e?.message ?? "Falha ao criar assinatura.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4 py-8">
      <form
        onSubmit={step === 1 ? goStep2 : onSubmit}
        className="w-full max-w-lg rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft-lg)] p-6 space-y-5"
      >
        <div className="flex flex-col items-center gap-2">
          <ParcLabsLogo size="lg" />
          <p className="text-xs text-muted-foreground">
            Cadastro de laboratório — {step === 1 ? "1 de 2 · dados" : "2 de 2 · pagamento"}
          </p>
        </div>

        {step === 1 ? (
          <div className="space-y-3">
            <Field label="Nome do laboratório">
              <input value={nome} onChange={(e) => setNome(e.target.value)} required className={INPUT} />
            </Field>
            <Field label="Subdomínio (ex.: updigital)">
              <input
                value={subdominio}
                onChange={(e) => {
                  setSubdominio(e.target.value.toLowerCase());
                  setSubStatus("idle");
                }}
                onBlur={onSubdomainBlur}
                required
                pattern="[a-z0-9-]+"
                className={INPUT}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {subdominio && `${subdominio}.connectlabs.com.br`}
              </p>
              {subStatus === "checking" && (
                <p className="text-[11px] text-muted-foreground">Verificando…</p>
              )}
              {subStatus === "ok" && <p className="text-[11px] text-success">Disponível.</p>}
              {subStatus === "taken" && (
                <p className="text-[11px] text-error">Já está em uso.</p>
              )}
              {subStatus === "invalid" && (
                <p className="text-[11px] text-error">Use apenas letras, números e hifens.</p>
              )}
            </Field>
            <Field label="Nome do responsável">
              <input
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                required
                className={INPUT}
              />
            </Field>
            <Field label="E-mail de acesso">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={INPUT}
              />
            </Field>
            <Field label="Senha (mín. 8 caracteres)">
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                minLength={8}
                required
                className={INPUT}
              />
            </Field>
            <Field label="Modo de recebimento dos pedidos">
              <div className="mt-1.5 space-y-2">
                <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-xs cursor-pointer hover:bg-surface-1">
                  <input
                    type="radio"
                    checked={modoRecebimento === "plataforma"}
                    onChange={() => setModoRecebimento("plataforma")}
                    className="mt-0.5"
                  />
                  <span>
                    <strong>Via LabConect</strong> — a plataforma cobra o dentista e repassa para
                    o laboratório automaticamente (split).
                  </span>
                </label>
                <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-xs cursor-pointer hover:bg-surface-1">
                  <input
                    type="radio"
                    checked={modoRecebimento === "proprio"}
                    onChange={() => setModoRecebimento("proprio")}
                    className="mt-0.5"
                  />
                  <span>
                    <strong>Gestão própria</strong> — o laboratório cobra os dentistas por fora da
                    plataforma.
                  </span>
                </label>
              </div>
            </Field>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg bg-primary-tint/40 border border-primary/20 p-3 text-xs text-foreground">
              Mensalidade LabConect: <strong>R$ {CONNECTLABS_MENSALIDADE},00/mês</strong>. A primeira
              cobrança é feita no cartão informado abaixo.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="CPF ou CNPJ do titular">
                <input value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} required className={INPUT} />
              </Field>
              <Field label="Telefone">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} required className={INPUT} />
              </Field>
              <Field label="CEP">
                <input value={cep} onChange={(e) => setCep(e.target.value)} required className={INPUT} />
              </Field>
              <Field label="Número">
                <input
                  value={addressNumber}
                  onChange={(e) => setAddressNumber(e.target.value)}
                  required
                  className={INPUT}
                />
              </Field>
            </div>
            <Field label="Nome impresso no cartão">
              <input
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                required
                className={INPUT}
              />
            </Field>
            <Field label="Número do cartão">
              <input
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                inputMode="numeric"
                required
                className={INPUT}
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Mês">
                <input value={expMonth} onChange={(e) => setExpMonth(e.target.value)} placeholder="MM" required className={INPUT} />
              </Field>
              <Field label="Ano">
                <input value={expYear} onChange={(e) => setExpYear(e.target.value)} placeholder="AAAA" required className={INPUT} />
              </Field>
              <Field label="CVV">
                <input value={ccv} onChange={(e) => setCcv(e.target.value)} inputMode="numeric" required className={INPUT} />
              </Field>
            </div>
          </div>
        )}

        {err && <p className="text-xs text-error">{err}</p>}

        <div className="flex items-center justify-between gap-2">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← Voltar
            </button>
          ) : (
            <Link to="/auth" className="text-xs text-muted-foreground hover:text-foreground">
              ← Já tenho conta
            </Link>
          )}
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-primary text-primary-foreground py-2 px-5 text-sm font-semibold hover:bg-primary-hover disabled:opacity-60"
          >
            {step === 1 ? "Continuar" : busy ? "Processando…" : "Ativar assinatura"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
