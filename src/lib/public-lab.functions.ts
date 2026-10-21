import { createServerFn } from "@tanstack/react-start";

export const getPublicLabBySubdomain = createServerFn({ method: "GET" })
  .inputValidator((data: { subdominio: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Busca laboratório ignorando apenas se cancelado (revisao_status != 'cancelado')
    const { data: lab, error: labErr } = await supabaseAdmin
      .from("labs")
      .select("*")
      .ilike("subdominio", data.subdominio.trim())
      .neq("revisao_status", "cancelado")
      .maybeSingle();

    if (labErr || !lab) {
      return { lab: null, products: [] };
    }

    // 2. Busca produtos ativos desse laboratório (ativo = true)
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, nome, descricao, preco, prazo_dias, ativo")
      .eq("lab_id", lab.id)
      .eq("ativo", true);

    return {
      lab,
      products: products ?? [],
    };
  });

export const registrarVisitaLoja = createServerFn({ method: "POST" })
  .inputValidator((data: { subdominio: string; origem?: string }) => data)
  .handler(async ({ data }) => {
    const rawOrigem = (data.origem || "").trim().toLowerCase();

    // 1. "preview" nunca é registrado
    if (rawOrigem === "preview") {
      return { registered: false, reason: "preview_ignored" };
    }

    // 2. Normalização de origem
    // Válidas: whatsapp, email, qr, link, compartilhar. Sem parâmetro -> direto. Qualquer outra -> outro.
    const validOrigins = ["whatsapp", "email", "qr", "link", "compartilhar"] as const;
    let normalizedOrigem = "direto";
    if (rawOrigem) {
      if (validOrigins.includes(rawOrigem as any)) {
        normalizedOrigem = rawOrigem;
      } else {
        normalizedOrigem = "outro";
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 3. Confirma se o laboratório existe e não está cancelado
    const { data: lab, error: labErr } = await supabaseAdmin
      .from("labs")
      .select("id")
      .ilike("subdominio", (data.subdominio || "").trim())
      .neq("revisao_status", "cancelado")
      .maybeSingle();

    if (labErr || !lab) {
      return { registered: false, reason: "lab_not_found" };
    }

    // 4. Executa função atômica no banco sem gravar IP, user agent ou dados pessoais
    const { error: rpcErr } = await supabaseAdmin.rpc("registrar_visita_loja", {
      p_lab_id: lab.id,
      p_origem: normalizedOrigem,
    });

    if (rpcErr) {
      console.error("[registrarVisitaLoja] Erro ao registrar visita:", rpcErr);
      return { registered: false, error: rpcErr.message };
    }

    return { registered: true, origem: normalizedOrigem };
  });
