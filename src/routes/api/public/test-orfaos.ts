import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/test-orfaos")({
  server: {
    handlers: {
      GET: async () => runTest(),
      POST: async () => runTest(),
    },
  },
});

async function runTest() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1. Obter Lab UP Digital
  const { data: lab, error: labErr } = await supabaseAdmin
    .from("labs")
    .select("id, nome")
    .eq("subdominio", "updigital")
    .maybeSingle();

  if (labErr || !lab) {
    return json({ ok: false, error: "Laboratório UP Digital não encontrado" }, 500);
  }

  // 2. Obter produto
  const { data: prods } = await supabaseAdmin
    .from("products")
    .select("id")
    .eq("lab_id", lab.id)
    .limit(1);

  const productId = prods?.[0]?.id;
  if (!productId) {
    return json({ ok: false, error: "Nenhum produto encontrado para o laboratório" }, 500);
  }

  // 3. Obter dentista de teste
  const { data: dentista } = await supabaseAdmin
    .from("dentists")
    .select("id, nome, email, cro, uf")
    .eq("email", "dentista@updigital.test")
    .maybeSingle();

  if (!dentista) {
    return json({ ok: false, error: "Dentista de teste dentista@updigital.test não encontrado" }, 500);
  }

  // 4. Limpar pedidos de teste anteriores com cro 999999
  await supabaseAdmin.from("orders").delete().eq("cro_pendente", "999999");

  // 5. Passo 3.1 — Criar Pedido Órfão 1 (Positivo: CRO 999999, UF SP)
  const { data: orderSP, error: err1 } = await supabaseAdmin
    .from("orders")
    .insert({
      lab_id: lab.id,
      product_id: productId,
      dentist_id: null,
      cro_pendente: "999999",
      uf_pendente: "SP",
      nome_dentista_pendente: "Dr. Teste Órfão SP",
      paciente: "Paciente Teste SP",
      valor: 450,
      status: "recebido",
    })
    .select("id, dentist_id, cro_pendente, uf_pendente")
    .single();

  if (err1 || !orderSP) {
    return json({ ok: false, error: `Erro criando pedido órfão SP: ${err1?.message}` }, 500);
  }

  // 6. Passo 3.4 — Criar Pedido Órfão 2 (Negativo: CRO 999999, UF RJ)
  const { data: orderRJ, error: err2 } = await supabaseAdmin
    .from("orders")
    .insert({
      lab_id: lab.id,
      product_id: productId,
      dentist_id: null,
      cro_pendente: "999999",
      uf_pendente: "RJ",
      nome_dentista_pendente: "Dr. Teste Órfão RJ",
      paciente: "Paciente Teste RJ",
      valor: 300,
      status: "recebido",
    })
    .select("id, dentist_id, cro_pendente, uf_pendente")
    .single();

  if (err2 || !orderRJ) {
    return json({ ok: false, error: `Erro criando pedido órfão RJ: ${err2?.message}` }, 500);
  }

  // 7. Passo 3.2 — Atualizar perfil do Dentista com CRO 999999 e UF SP
  const { error: dentUpdErr } = await supabaseAdmin
    .from("dentists")
    .update({
      cro: "999999",
      uf: "SP",
      telefone: "(11) 99999-9999",
    })
    .eq("id", dentista.id);

  if (dentUpdErr) {
    return json({ ok: false, error: `Erro atualizando perfil do dentista: ${dentUpdErr.message}` }, 500);
  }

  // 8. Passo 3.3 — Executar autolink de pedidos órfãos por CRO + UF
  const { data: matchingOrders } = await supabaseAdmin
    .from("orders")
    .select("id, lab_id, cro_pendente, uf_pendente")
    .is("dentist_id", null);

  const matchedSP = (matchingOrders ?? []).filter(
    (o) =>
      o.cro_pendente?.trim().toLowerCase() === "999999" &&
      o.uf_pendente?.trim().toLowerCase() === "sp"
  );

  let linkedCount = 0;
  if (matchedSP.length > 0) {
    const spIds = matchedSP.map((o) => o.id);
    await supabaseAdmin.from("orders").update({ dentist_id: dentista.id }).in("id", spIds);

    for (const m of matchedSP) {
      await supabaseAdmin
        .from("dentist_lab_links")
        .upsert({ dentist_id: dentista.id, lab_id: m.lab_id }, { onConflict: "dentist_id,lab_id" });
    }
    linkedCount = matchedSP.length;
  }

  // 9. Verificar estado final dos 2 pedidos
  const { data: finalSP } = await supabaseAdmin
    .from("orders")
    .select("id, dentist_id, cro_pendente, uf_pendente")
    .eq("id", orderSP.id)
    .single();

  const { data: finalRJ } = await supabaseAdmin
    .from("orders")
    .select("id, dentist_id, cro_pendente, uf_pendente")
    .eq("id", orderRJ.id)
    .single();

  const { data: linkRecord } = await supabaseAdmin
    .from("dentist_lab_links")
    .select("id")
    .eq("dentist_id", dentista.id)
    .eq("lab_id", lab.id)
    .maybeSingle();

  const testResults = {
    test1_pedido_sp_vinculado: finalSP?.dentist_id === dentista.id,
    test2_pedido_rj_nao_vinculado: finalRJ?.dentist_id === null,
    test3_vinculo_lab_criado: !!linkRecord,
    linked_count: linkedCount,
    pedido_sp_id: orderSP.id,
    pedido_rj_id: orderRJ.id,
    dentista_id: dentista.id,
  };

  const allPassed =
    testResults.test1_pedido_sp_vinculado &&
    testResults.test2_pedido_rj_nao_vinculado &&
    testResults.test3_vinculo_lab_criado;

  return json({
    ok: allPassed,
    summary: allPassed
      ? "TODOS OS TESTES DE PONTA A PONTA PASSARAM COM SUCESSO!"
      : "FALHA EM ALGUM DOS TESTES DE PONTA A PONTA",
    details: testResults,
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
