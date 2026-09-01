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
      .select("id, nome, preco, prazo_dias, ativo")
      .eq("lab_id", lab.id)
      .eq("ativo", true);

    return {
      lab,
      products: products ?? [],
    };
  });
