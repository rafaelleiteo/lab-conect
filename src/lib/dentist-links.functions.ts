import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { VALID_STORE_VISIT_ORIGINS } from "@/lib/domain-context";

export type VincularDentistaResult = {
  ok: boolean;
  status: "criado" | "existente" | "erro";
  labId?: string;
  labNome?: string;
  subdominio?: string;
  message?: string;
};

export const vincularDentistaAoLab = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { subdominio: string; origem?: string }) => data)
  .handler(async ({ data, context }): Promise<VincularDentistaResult> => {
    const { userId } = context;
    const cleanSubdomain = (data.subdominio || "").trim().toLowerCase();

    if (!cleanSubdomain) {
      return { ok: false, status: "erro", message: "Subdomínio do laboratório não informado" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Identidade do dentista obtida estritamente da sessão autenticada (auth.uid())
    const { data: dentist, error: dentErr } = await supabaseAdmin
      .from("dentists")
      .select("id, revisao_status")
      .eq("user_id", userId)
      .maybeSingle();

    if (dentErr || !dentist) {
      return { ok: false, status: "erro", message: "Usuário autenticado não possui perfil de dentista cadastrado" };
    }

    if (dentist.revisao_status === "cancelado") {
      return { ok: false, status: "erro", message: "Conta de dentista cancelada" };
    }

    // 2. Confere no servidor se o laboratório existe e não está cancelado
    const { data: lab, error: labErr } = await supabaseAdmin
      .from("labs")
      .select("id, nome, subdominio, revisao_status")
      .ilike("subdominio", cleanSubdomain)
      .maybeSingle();

    if (labErr || !lab || lab.revisao_status === "cancelado") {
      return { ok: false, status: "erro", message: "Laboratório não encontrado ou inativo" };
    }

    // 3. Normalização e validação da origem no servidor
    const rawOrigem = (data.origem || "").trim().toLowerCase();
    let normalizedOrigem = "direto";
    if (rawOrigem) {
      if ((VALID_STORE_VISIT_ORIGINS as readonly string[]).includes(rawOrigem)) {
        normalizedOrigem = rawOrigem;
      } else {
        normalizedOrigem = "outro";
      }
    }

    // 4. Criação idempotente em dentist_lab_links
    const { data: existingLink } = await supabaseAdmin
      .from("dentist_lab_links")
      .select("id")
      .eq("dentist_id", dentist.id)
      .eq("lab_id", lab.id)
      .maybeSingle();

    if (existingLink) {
      return {
        ok: true,
        status: "existente",
        labId: lab.id,
        labNome: lab.nome,
        subdominio: lab.subdominio,
      };
    }

    const { error: insertErr } = await supabaseAdmin
      .from("dentist_lab_links")
      .insert({
        dentist_id: dentist.id,
        lab_id: lab.id,
        origem: normalizedOrigem,
      });

    if (insertErr) {
      if (/duplicate|unique/i.test(insertErr.message)) {
        return {
          ok: true,
          status: "existente",
          labId: lab.id,
          labNome: lab.nome,
          subdominio: lab.subdominio,
        };
      }
      return { ok: false, status: "erro", message: insertErr.message };
    }

    return {
      ok: true,
      status: "criado",
      labId: lab.id,
      labNome: lab.nome,
      subdominio: lab.subdominio,
    };
  });
