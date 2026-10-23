import { createFileRoute } from "@tanstack/react-router";
import crypto from "node:crypto";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.trim().length === 0) {
    return false;
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return false;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return false;
  }

  const providedToken = parts[1];
  const secretBuffer = Buffer.from(secret, "utf-8");
  const tokenBuffer = Buffer.from(providedToken, "utf-8");

  if (secretBuffer.length !== tokenBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(secretBuffer, tokenBuffer);
}

// Called by cron service. Cancels lab/dentist reviews that stayed "pendente" for more than 10 days.
export const Route = createFileRoute("/api/public/hooks/auto-cancel-review")({
  server: {
    handlers: {
      POST: async ({ request }) => handle(request),
      GET: async ({ request }) => handle(request),
    },
  },
});

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return run();
}

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
