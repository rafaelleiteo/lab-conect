import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentLab } from "@/hooks/useCurrentLab";

const INPUT =
  "mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CNPJ_RE = /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/;

export function MeuPerfil() {
  const { lab, loading, reload } = useCurrentLab();
  const [responsavel, setResponsavel] = useState("");
  const [emailContato, setEmailContato] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [enderecoNumero, setEnderecoNumero] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!lab) return;
    setResponsavel(lab.responsavel ?? "");
    setEmailContato(lab.email_contato ?? "");
    setTelefone(lab.telefone ?? "");
    setCnpj(lab.cnpj ?? "");
    setCep(lab.cep ?? "");
    setEndereco(lab.endereco ?? "");
    setEnderecoNumero(lab.endereco_numero ?? "");
  }, [lab?.id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!lab) return;
    setErr(null);
    setOk(false);
    if (emailContato && !EMAIL_RE.test(emailContato.trim())) {
      setErr("E-mail inválido.");
      return;
    }
    if (cnpj && !CNPJ_RE.test(cnpj.trim())) {
      setErr("CNPJ deve estar no formato 00.000.000/0000-00 (ou apenas 14 dígitos).");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("labs")
      .update({
        responsavel: responsavel.trim() || null,
        email_contato: emailContato.trim() || null,
        telefone: telefone.trim() || null,
        cnpj: cnpj.trim() || null,
        cep: cep.trim() || null,
        endereco: endereco.trim() || null,
        endereco_numero: enderecoNumero.trim() || null,
      })
      .eq("id", lab.id);
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setOk(true);
    reload();
  }

  if (loading) return <div className="text-sm text-muted-foreground">Carregando…</div>;
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Meu perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dados de cadastro da conta do laboratório
        </p>
      </header>

      <form
        onSubmit={save}
        className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-6 space-y-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Nome do responsável</label>
            <input
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              className={INPUT}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">E-mail de contato</label>
            <input
              type="email"
              value={emailContato}
              onChange={(e) => setEmailContato(e.target.value)}
              className={INPUT}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Telefone</label>
            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(11) 90000-0000"
              className={INPUT}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">CNPJ</label>
            <input
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0000-00"
              className={INPUT}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">CEP</label>
            <input
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              placeholder="00000-000"
              className={INPUT}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Endereço</label>
            <input
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua, avenida, bairro, cidade/UF"
              className={INPUT}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Número</label>
            <input
              value={enderecoNumero}
              onChange={(e) => setEnderecoNumero(e.target.value)}
              className={INPUT}
            />
          </div>
        </div>

        {err && <p className="text-xs text-error">{err}</p>}
        {ok && <p className="text-xs text-success">Perfil atualizado.</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>

      <p className="text-xs text-muted-foreground">
        Identidade visual (logo, cor e mensagem) fica em <span className="font-medium">My LabConect</span> e
        <span className="font-medium"> Configurações</span>.
      </p>
    </div>
  );
}