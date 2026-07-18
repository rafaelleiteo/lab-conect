import { createFileRoute } from "@tanstack/react-router";

// Called by pg_cron. Cancels lab/dentist reviews that stayed "pendente" for more than 10 days.
export const Route = createFileRoute("/api/public/hooks/auto-cancel-review")({
  server: {
    handlers: {
      POST: async () => run(),
      GET: async () => run(),
    },
  },
});

async function run() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const cutoff = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

  const [labs, dentists] = await Promise.all([
    supabaseAdmin
      .from("labs")
      .update({ revisao_status: "cancelado" })
      .eq("revisao_status", "pendente")
      .lt("criado_em", cutoff)
      .select("id"),
    supabaseAdmin
      .from("dentists")
      .update({ revisao_status: "cancelado" })
      .eq("revisao_status", "pendente")
      .lt("criado_em", cutoff)
      .select("id"),
  ]);

  return new Response(
    JSON.stringify({
      ok: true,
      labs_cancelados: labs.data?.length ?? 0,
      dentistas_cancelados: dentists.data?.length ?? 0,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}
