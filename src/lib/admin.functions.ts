import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: adminRow } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!adminRow) throw new Error("Forbidden");
}

export const getAsaasConfigured = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    return { configured: !!process.env.ASAAS_API_KEY };
  });

export const listPendingReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [labs, dentists] = await Promise.all([
      supabaseAdmin
        .from("labs")
        .select("id, nome, subdominio, criado_em, revisao_status, assinatura_status")
        .eq("revisao_status", "pendente")
        .order("criado_em", { ascending: false }),
      supabaseAdmin
        .from("dentists")
        .select("id, nome, email, cro, uf, criado_em, revisao_status")
        .eq("revisao_status", "pendente")
        .order("criado_em", { ascending: false }),
    ]);
    return {
      labs: labs.data ?? [],
      dentists: dentists.data ?? [],
    };
  });

export const setReviewStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: "lab" | "dentist"; id: string; status: "confirmado" | "cancelado" }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const table = data.kind === "lab" ? "labs" : "dentists";
    const { error } = await supabaseAdmin
      .from(table)
      .update({ revisao_status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
