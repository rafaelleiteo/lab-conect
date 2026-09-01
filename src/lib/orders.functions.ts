import { supabase } from "@/integrations/supabase/client";

/**
 * Vincular automaticamente TODOS os pedidos órfãos com CRO + UF correspondentes
 * a este dentista em qualquer laboratório da rede, e gerar os registros de vínculo em dentist_lab_links.
 */
export async function autoLinkOrphanedOrders(dentist: { id: string; cro: string | null; uf: string | null }) {
  if (!dentist.cro || !dentist.uf) return 0;

  const croClean = dentist.cro.trim();
  const ufClean = dentist.uf.trim();

  // Buscar todos os pedidos órfãos que possuam cro_pendente + uf_pendente batendo
  const { data: orphanOrders, error: fetchErr } = await supabase
    .from("orders")
    .select("id, lab_id, cro_pendente, uf_pendente")
    .is("dentist_id", null);

  if (fetchErr || !orphanOrders || orphanOrders.length === 0) return 0;

  // Filtrar em JS/ILike case-insensitive para CRO e UF
  const matchingOrders = orphanOrders.filter(
    (o) =>
      o.cro_pendente &&
      o.uf_pendente &&
      o.cro_pendente.trim().toLowerCase() === croClean.toLowerCase() &&
      o.uf_pendente.trim().toLowerCase() === ufClean.toLowerCase()
  );

  if (matchingOrders.length === 0) return 0;

  const orderIds = matchingOrders.map((o) => o.id);
  const labIds = Array.from(new Set(matchingOrders.map((o) => o.lab_id)));

  // 1. Vincular pedidos ao dentista
  await supabase
    .from("orders")
    .update({ dentist_id: dentist.id })
    .in("id", orderIds);

  // 2. Para cada laboratório envolvido, garantir o vínculo em dentist_lab_links
  for (const labId of labIds) {
    const { data: existingLink } = await supabase
      .from("dentist_lab_links")
      .select("id")
      .eq("dentist_id", dentist.id)
      .eq("lab_id", labId)
      .maybeSingle();

    if (!existingLink) {
      await supabase
        .from("dentist_lab_links")
        .insert({ dentist_id: dentist.id, lab_id: labId });
    }
  }

  return matchingOrders.length;
}
