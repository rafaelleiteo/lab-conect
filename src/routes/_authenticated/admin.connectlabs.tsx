import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { IconCheck, IconAlertTriangle } from "@tabler/icons-react";
import { getAsaasConfigured } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/connectlabs")({
  component: ConnectLabsConfig,
});

function ConnectLabsConfig() {
  const check = useServerFn(getAsaasConfigured);
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    check().then((r) => setConfigured(r.configured)).catch(() => setConfigured(false));
  }, [check]);

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Configuração da ConnectLabs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Credenciais globais da plataforma
        </p>
      </header>

      <section className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-6 space-y-4">
        <div>
          <div className="text-sm font-semibold text-foreground">Chave de API Asaas</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Usada pelo backend da ConnectLabs para criar cobranças e configurar o split automático
            para os laboratórios em modo "Via ConnectLabs". Armazenada como secret — nunca é
            exibida depois de salva.
          </p>
        </div>

        {configured === null ? (
          <div className="text-xs text-muted-foreground">Verificando…</div>
        ) : configured ? (
          <div className="flex items-center gap-2 rounded-lg bg-success/10 border border-success/30 px-3 py-2 text-xs text-success">
            <IconCheck size={16} /> Chave configurada.
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-xs text-warning">
            <IconAlertTriangle size={16} /> Chave ainda não configurada. Peça ao Lovable para
            configurar o secret <code className="font-mono">ASAAS_API_KEY</code>.
          </div>
        )}
      </section>
    </div>
  );
}
