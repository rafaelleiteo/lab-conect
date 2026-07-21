import { useEffect, useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type Lab = {
  id: string;
  nome: string;
  subdominio: string;
  modo_recebimento: string;
  asaas_wallet_id: string | null;
  comissao_percentual: number;
};

export const Route = createFileRoute("/_authenticated/admin/labs/$id")({
  component: AdminLabConfig,
});

function AdminLabConfig() {
  const { id } = useParams({ from: "/_authenticated/admin/labs/$id" });
  const [lab, setLab] = useState<Lab | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("labs").select("*").eq("id", id).maybeSingle();
      setLab(data as Lab);
    })();
  }, [id]);

  if (!lab) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  const isPlataforma = lab.modo_recebimento === "plataforma";

  async function save() {
    if (!lab) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from("labs")
      .update({
        modo_recebimento: lab.modo_recebimento,
        asaas_wallet_id: isPlataforma ? lab.asaas_wallet_id : null,
        comissao_percentual: isPlataforma ? lab.comissao_percentual : 0,
      })
      .eq("id", lab.id);
    setSaving(false);
    setMsg(error ? `Erro: ${error.message}` : "Salvo com sucesso.");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <p className="text-xs font-medium text-muted-foreground">Laboratório</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{lab.nome}</h1>
        <p className="mt-1 text-sm text-muted-foreground font-mono">
          {lab.subdominio}.labconect.com.br
        </p>
      </header>

      <section className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-6 space-y-5">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Modo de recebimento</label>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { v: "plataforma", label: "Via LabConect", desc: "Split automático via Asaas" },
              { v: "manual", label: "Gestão própria", desc: "Laboratório registra pagamentos" },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setLab({ ...lab, modo_recebimento: opt.v })}
                className={`text-left rounded-lg border p-3 transition ${
                  lab.modo_recebimento === opt.v
                    ? "border-primary bg-primary-tint"
                    : "border-border hover:border-border-strong"
                }`}
              >
                <div className="text-sm font-semibold text-foreground">{opt.label}</div>
                <div className="text-xs text-muted-foreground">{opt.desc}</div>
              </button>
            ))}
          </div>
          {!isPlataforma && (
            <p className="mt-3 rounded-lg bg-surface-1 border border-border p-3 text-xs text-muted-foreground">
              No modo <strong>Gestão própria</strong>, o laboratório recebe os pagamentos por fora
              e não há comissão sobre transações — só a mensalidade da LabConect.
            </p>
          )}
        </div>

        {isPlataforma && (
          <>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Wallet ID Asaas</label>
              <input
                value={lab.asaas_wallet_id ?? ""}
                onChange={(e) => setLab({ ...lab, asaas_wallet_id: e.target.value })}
                placeholder="00000000-0000-0000-0000-000000000000"
                className="mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm font-mono outline-none focus:border-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Identificador da carteira do laboratório no Asaas para split automático.
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Comissão LabConect (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={lab.comissao_percentual}
                onChange={(e) =>
                  setLab({ ...lab, comissao_percentual: parseFloat(e.target.value) || 0 })
                }
                className="mt-1.5 w-32 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          </>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary-hover disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
          {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
        </div>
      </section>
    </div>
  );
}
