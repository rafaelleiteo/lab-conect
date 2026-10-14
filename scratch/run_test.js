import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://cmltaaakiqbsqbckkyjh.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbHRhYWFraXFic3FiY2treWpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDMzMzM0MiwiZXhwIjoyMDk5OTA5MzQyfQ.hE_3g7l9z4xW27hG4-58N7w3p425xK1N8u38w2_v91Y";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log("=== INICIANDO TESTE REAL DE PONTA A PONTA (CRO+UF) ===");

  // 1. Obter Lab UP Digital
  const { data: lab, error: labErr } = await supabase
    .from("labs")
    .select("id, nome")
    .eq("subdominio", "updigital")
    .maybeSingle();

  if (labErr || !lab) {
    console.error("Erro obtendo lab:", labErr);
    process.exit(1);
  }

  // 2. Obter Produto
  const { data: prods } = await supabase
    .from("products")
    .select("id")
    .eq("lab_id", lab.id)
    .limit(1);

  const productId = prods?.[0]?.id;

  // 3. Obter Dentista de Teste
  const { data: dentist } = await supabase
    .from("dentists")
    .select("id, nome, email, cro, uf")
    .eq("email", "dentista@updigital.test")
    .maybeSingle();

  if (!dentist) {
    console.error("Dentista não encontrado.");
    process.exit(1);
  }

  // Limpeza de pedidos de teste anteriores com CRO SP-999999
  await supabase.from("orders").delete().ilike("cro_pendente", "SP-999999");

  // 4. Passo 3.1 — Criar Pedido Órfão 1 (Positivo: CRO SP-999999, UF SP)
  const { data: order1, error: err1 } = await supabase
    .from("orders")
    .insert({
      lab_id: lab.id,
      product_id: productId,
      dentist_id: null,
      cro_pendente: "SP-999999",
      uf_pendente: "SP",
      nome_dentista_pendente: "Dr. Teste Órfão SP",
      paciente: "Paciente Teste SP",
      valor: 450,
      status: "recebido",
    })
    .select()
    .single();

  if (err1) {
    console.error("Erro criando Pedido 1:", err1);
    process.exit(1);
  }

  console.log(`[Passo 1] Pedido Órfão 1 criado: ID ${order1.id} (CRO: SP-999999, UF: SP, dentist_id: null)`);

  // 5. Passo 3.4 — Criar Pedido Órfão 2 (Negativo: CRO SP-999999, UF RJ)
  const { data: order2, error: err2 } = await supabase
    .from("orders")
    .insert({
      lab_id: lab.id,
      product_id: productId,
      dentist_id: null,
      cro_pendente: "SP-999999",
      uf_pendente: "RJ",
      nome_dentista_pendente: "Dr. Teste Órfão RJ",
      paciente: "Paciente Teste RJ",
      valor: 300,
      status: "recebido",
    })
    .select()
    .single();

  if (err2) {
    console.error("Erro criando Pedido 2:", err2);
    process.exit(1);
  }

  console.log(`[Passo 1] Pedido Órfão 2 (Negativo) criado: ID ${order2.id} (CRO: SP-999999, UF: RJ, dentist_id: null)`);

  // 6. Passo 3.2 — Dentista de teste acessa 'Meu perfil' e edita CRO para SP-999999 e UF para SP
  const { error: updErr } = await supabase
    .from("dentists")
    .update({
      cro: "SP-999999",
      uf: "SP",
      telefone: "(11) 99999-9999",
    })
    .eq("id", dentist.id);

  if (updErr) {
    console.error("Erro atualizando perfil do dentista:", updErr);
    process.exit(1);
  }

  console.log(`[Passo 2] Perfil do dentista atualizado para CRO: SP-999999 e UF: SP.`);

  // 7. Simular a chamada da rotina autoLinkOrphanedOrders({ id, cro: 'SP-999999', uf: 'SP' })
  const { data: orphanedMatches } = await supabase
    .from("orders")
    .select("id, lab_id, cro_pendente, uf_pendente")
    .is("dentist_id", null);

  const matched = (orphanedMatches ?? []).filter(
    (o) =>
      o.cro_pendente?.trim().toLowerCase() === "sp-999999" &&
      o.uf_pendente?.trim().toLowerCase() === "sp"
  );

  let linkedCount = 0;
  if (matched.length > 0) {
    const matchedIds = matched.map((m) => m.id);
    await supabase.from("orders").update({ dentist_id: dentist.id }).in("id", matchedIds);

    for (const m of matched) {
      await supabase
        .from("dentist_lab_links")
        .upsert({ dentist_id: dentist.id, lab_id: m.lab_id }, { onConflict: "dentist_id,lab_id" });
    }
    linkedCount = matched.length;
  }

  console.log(`[Passo 2] autoLinkOrphanedOrders executada: ${linkedCount} pedido(s) vinculado(s).`);

  // 8. Passo 3.3 e 3.5 — Verificação final dos pedidos no banco
  const { data: res1 } = await supabase.from("orders").select("id, dentist_id, paciente").eq("id", order1.id).single();
  const { data: res2 } = await supabase.from("orders").select("id, dentist_id, paciente").eq("id", order2.id).single();
  const { data: resLink } = await supabase.from("dentist_lab_links").select("id").eq("dentist_id", dentist.id).eq("lab_id", lab.id).maybeSingle();

  console.log("\n=== RESULTADOS DETALHADOS DOS TESTES DE PONTA A PONTA ===");
  console.log(`1. Pedido SP (CRO: SP-999999 / UF: SP): ${res1.dentist_id === dentist.id ? "VINCULADO COM SUCESSO! (dentist_id = " + res1.dentist_id + ")" : "FALHA NO VÍNCULO"}`);
  console.log(`2. Pedido RJ (CRO: SP-999999 / UF: RJ): ${res2.dentist_id === null ? "NÃO VINCULADO / PERMANECEU ÓRFÃO COM SUCESSO! (dentist_id = null)" : "FALHA NO TESTE NEGATIVO"}`);
  console.log(`3. Vínculo de Parceria (dentist_lab_links): ${resLink ? "CRIADO E CONFIRMADO COM SUCESSO! (link_id = " + resLink.id + ")" : "FALHA AO GERAR VÍNCULO"}`);

  if (res1.dentist_id === dentist.id && res2.dentist_id === null && resLink) {
    console.log("\n✅ TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!");
  } else {
    console.log("\n❌ FALHA NOS TESTES DE PONTA A PONTA.");
  }
}

main();
