import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export function normalizarCroString(cro: string | null | undefined): string | null {
  if (!cro) return null;
  const digits = cro.replace(/\D/g, "");
  const trimmed = digits.replace(/^0+/, "");
  return trimmed || null;
}

/**
 * 2.4 registrarReivindicacoes (server function, identidade só pela sessão):
 * Para o dentista logado, busca pedidos órfãos (dentist_id is null) cujo cro_pendente e uf_pendente
 * casem com o CRO e UF do dentista pela normalização.
 * Se já existe vínculo verificado_pelo_lab = true para este CRO e UF, vincula direto.
 * Senão, cria order_claims pendente (idempotente).
 * Retorna contagem de processados sem expor dados clínicos ou de pacientes.
 */
export const registrarReivindicacoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Identidade estrita pela sessão
    const { data: dentist, error: dentErr } = await supabaseAdmin
      .from("dentists")
      .select("id, cro, uf, revisao_status")
      .eq("user_id", userId)
      .maybeSingle();

    if (dentErr || !dentist || dentist.revisao_status === "cancelado") {
      return { ok: false, error: "Perfil de dentista não encontrado ou inativo", vinculados: 0, claimsCriadas: 0 };
    }

    const normDentistCro = normalizarCroString(dentist.cro);
    const normDentistUf = (dentist.uf || "").trim().toUpperCase();

    if (!normDentistCro || !normDentistUf) {
      return { ok: true, vinculados: 0, claimsCriadas: 0 };
    }

    // Buscar pedidos órfãos
    const { data: orphanOrders, error: fetchErr } = await supabaseAdmin
      .from("orders")
      .select("id, lab_id, cro_pendente, uf_pendente")
      .is("dentist_id", null);

    if (fetchErr || !orphanOrders || orphanOrders.length === 0) {
      return { ok: true, vinculados: 0, claimsCriadas: 0 };
    }

    // Filtrar os pedidos que casam pela normalização de CRO e UF
    const matchingOrders = orphanOrders.filter((o) => {
      const oCro = normalizarCroString(o.cro_pendente);
      const oUf = (o.uf_pendente || "").trim().toUpperCase();
      return oCro === normDentistCro && oUf === normDentistUf;
    });

    if (matchingOrders.length === 0) {
      return { ok: true, vinculados: 0, claimsCriadas: 0 };
    }

    // Buscar todos os vínculos existentes deste dentista
    const { data: existingLinks } = await supabaseAdmin
      .from("dentist_lab_links")
      .select("id, lab_id, verificado_pelo_lab, verificado_cro, verificado_uf")
      .eq("dentist_id", dentist.id);

    const linksByLab = new Map<string, any>();
    (existingLinks || []).forEach((l) => linksByLab.set(l.lab_id, l));

    let vinculadosCount = 0;
    let claimsCount = 0;

    for (const order of matchingOrders) {
      const link = linksByLab.get(order.lab_id);
      const isVerifiedForThisCro =
        link &&
        link.verificado_pelo_lab === true &&
        normalizarCroString(link.verificado_cro) === normDentistCro &&
        (link.verificado_uf || "").trim().toUpperCase() === normDentistUf;

      if (isVerifiedForThisCro) {
        // Vincula direto
        const { error: updErr } = await supabaseAdmin
          .from("orders")
          .update({ dentist_id: dentist.id })
          .eq("id", order.id)
          .is("dentist_id", null);

        if (!updErr) {
          vinculadosCount++;
          // Gravar order_events do tipo 'vinculo'
          await supabaseAdmin.from("order_events").insert({
            order_id: order.id,
            tipo: "vinculo",
            descricao: "Pedido vinculado ao dentista pelo laboratório (vínculo pré-verificado)",
          });
        }
      } else {
        // Cria claim pendente (idempotente)
        const { error: claimErr } = await supabaseAdmin
          .from("order_claims")
          .insert({
            order_id: order.id,
            dentist_id: dentist.id,
            status: "pendente",
          });

        if (!claimErr || /duplicate|unique/i.test(claimErr.message)) {
          claimsCount++;
        }
      }
    }

    return { ok: true, vinculados: vinculadosCount, claimsCriadas: claimsCount };
  });

/**
 * 2.5 listarReivindicacoes (server function; só membro do laboratório):
 * Devolve, para os pedidos do laboratório com claims pendentes, só:
 * id da claim, id do pedido (código curto), nome, e-mail do login (auth.users),
 * CRO, UF, data do cadastro e se está 'pendente' em revisao_status.
 */
export const listarReivindicacoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { labId: string; orderId?: string }) => data)
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verificar se o usuário autenticado é membro deste laboratório
    const { data: member, error: memErr } = await supabaseAdmin
      .from("lab_members")
      .select("id")
      .eq("lab_id", data.labId)
      .eq("user_id", userId)
      .maybeSingle();

    if (memErr || !member) {
      return { ok: false, error: "Acesso não autorizado para este laboratório", claims: [] };
    }

    // Buscar claims pendentes associadas a pedidos deste laboratório
    let query = supabaseAdmin
      .from("order_claims")
      .select(`
        id,
        order_id,
        status,
        criado_em,
        orders!inner(id, lab_id, dentist_id),
        dentists!inner(id, user_id, nome, cro, uf, revisao_status, criado_em)
      `)
      .eq("orders.lab_id", data.labId)
      .eq("status", "pendente")
      .is("orders.dentist_id", null);

    if (data.orderId) {
      query = query.eq("order_id", data.orderId);
    }

    const { data: rawClaims, error: claimsErr } = await query;
    if (claimsErr || !rawClaims) {
      return { ok: false, error: claimsErr?.message, claims: [] };
    }

    // Obter e-mails de login de auth.users para cada dentista candidato
    const userIds = Array.from(new Set(rawClaims.map((c: any) => c.dentists?.user_id).filter(Boolean)));
    const emailMap = new Map<string, string>();

    if (userIds.length > 0) {
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      (authUsers?.users || []).forEach((u) => {
        if (userIds.includes(u.id)) {
          emailMap.set(u.id, u.email || "");
        }
      });
    }

    // Buscar todas as claims pendentes deste laboratório para calcular outros pedidos pendentes do mesmo dentista
    const { data: allLabPending } = await supabaseAdmin
      .from("order_claims")
      .select(`
        id,
        order_id,
        dentist_id,
        orders!inner(id, lab_id, dentist_id)
      `)
      .eq("orders.lab_id", data.labId)
      .eq("status", "pendente")
      .is("orders.dentist_id", null);

    const sanitizedClaims = rawClaims.map((c: any) => {
      const otherPendingCount = (allLabPending || []).filter(
        (p: any) => p.dentist_id === c.dentists.id && p.order_id !== c.order_id
      ).length;

      return {
        claimId: c.id,
        orderId: c.order_id,
        codigoCurto: `#${c.order_id.slice(0, 8)}`,
        dentistId: c.dentists.id,
        nome: c.dentists.nome,
        emailLogin: emailMap.get(c.dentists.user_id) || "",
        cro: c.dentists.cro,
        uf: c.dentists.uf,
        dataCadastro: c.dentists.criado_em,
        isPendente: c.dentists.revisao_status === "pendente",
        otherPendingCount,
      };
    });

    return { ok: true, claims: sanitizedClaims };
  });

export type DecisaoReivindicacaoInput = {
  claimId: string;
  decisao: "confirmar" | "recusar";
  estender?: boolean;
};

/**
 * 2.6 confirmarReivindicacao (server function; membro do laboratório do pedido):
 * 'confirmar':
 *   - orders.dentist_id = dentist_id só se ainda for nulo
 *   - cria vínculo se faltar com verificado_pelo_lab = true, verificado_cro, verificado_uf, verificado_em
 *   - claim 'confirmada'
 *   - demais claims do mesmo pedido viram 'recusada'
 *   - grava order_events do tipo 'vinculo' sem dados clínicos
 *   - se estender = true, aplica o mesmo aos demais pedidos órfãos pendentes desse dentista nesse laboratório
 * 'recusar':
 *   - marca claim como 'recusada'
 */
export const confirmarReivindicacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: DecisaoReivindicacaoInput) => data)
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Buscar a claim e conferir permissão do laboratório
    const { data: claim, error: clErr } = await supabaseAdmin
      .from("order_claims")
      .select(`
        id,
        order_id,
        dentist_id,
        status,
        orders!inner(id, lab_id, dentist_id),
        dentists!inner(id, nome, cro, uf)
      `)
      .eq("id", data.claimId)
      .maybeSingle();

    if (clErr || !claim) {
      return { ok: false, error: "Reivindicação não encontrada" };
    }

    const orderLabId = (claim as any).orders.lab_id;

    // Verificar se o usuário pertence a este laboratório
    const { data: member } = await supabaseAdmin
      .from("lab_members")
      .select("id")
      .eq("lab_id", orderLabId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!member) {
      return { ok: false, error: "Apenas membros do laboratório podem decidir reivindicações" };
    }

    const now = new Date().toISOString();

    if (data.decisao === "recusar") {
      await supabaseAdmin
        .from("order_claims")
        .update({
          status: "recusada",
          decidido_em: now,
          decidido_por: userId,
        })
        .eq("id", claim.id);

      return { ok: true, status: "recusada" };
    }

    // Decisão: 'confirmar'
    const targetDentist = (claim as any).dentists;
    const dentistId = targetDentist.id;
    const orderId = (claim as any).orders.id;

    // 1. orders.dentist_id = dentist_id só se ainda for nulo
    await supabaseAdmin
      .from("orders")
      .update({ dentist_id: dentistId })
      .eq("id", orderId)
      .is("dentist_id", null);

    // 2. Garantir ou atualizar vínculo com verificação
    const { data: existingLink } = await supabaseAdmin
      .from("dentist_lab_links")
      .select("id")
      .eq("dentist_id", dentistId)
      .eq("lab_id", orderLabId)
      .maybeSingle();

    if (existingLink) {
      await supabaseAdmin
        .from("dentist_lab_links")
        .update({
          verificado_pelo_lab: true,
          verificado_cro: targetDentist.cro,
          verificado_uf: targetDentist.uf,
          verificado_em: now,
        })
        .eq("id", existingLink.id);
    } else {
      await supabaseAdmin.from("dentist_lab_links").insert({
        dentist_id: dentistId,
        lab_id: orderLabId,
        origem: "reivindicacao",
        verificado_pelo_lab: true,
        verificado_cro: targetDentist.cro,
        verificado_uf: targetDentist.uf,
        verificado_em: now,
      });
    }

    // 3. Marcar claim confirmada
    await supabaseAdmin
      .from("order_claims")
      .update({
        status: "confirmada",
        decidido_em: now,
        decidido_por: userId,
      })
      .eq("id", claim.id);

    // 4. Demais claims do mesmo pedido viram 'recusada'
    await supabaseAdmin
      .from("order_claims")
      .update({
        status: "recusada",
        decidido_em: now,
        decidido_por: userId,
      })
      .eq("order_id", orderId)
      .neq("id", claim.id)
      .eq("status", "pendente");

    // 5. Gravar order_events do tipo 'vinculo'
    await supabaseAdmin.from("order_events").insert({
      order_id: orderId,
      tipo: "vinculo",
      descricao: `Pedido vinculado ao dentista ${targetDentist.nome} pelo laboratório`,
      autor: userId,
    });

    // 6. Se estender = true: estende para outros pedidos órfãos pendentes DESSE dentista NESSE laboratório
    if (data.estender) {
      const { data: otherClaims } = await supabaseAdmin
        .from("order_claims")
        .select(`
          id,
          order_id,
          orders!inner(id, lab_id, dentist_id)
        `)
        .eq("dentist_id", dentistId)
        .eq("orders.lab_id", orderLabId)
        .eq("status", "pendente")
        .neq("id", claim.id);

      if (otherClaims && otherClaims.length > 0) {
        for (const oc of otherClaims) {
          const ocOrderId = (oc as any).orders.id;
          await supabaseAdmin
            .from("orders")
            .update({ dentist_id: dentistId })
            .eq("id", ocOrderId)
            .is("dentist_id", null);

          await supabaseAdmin
            .from("order_claims")
            .update({
              status: "confirmada",
              decidido_em: now,
              decidido_por: userId,
            })
            .eq("id", oc.id);

          await supabaseAdmin
            .from("order_claims")
            .update({
              status: "recusada",
              decidido_em: now,
              decidido_por: userId,
            })
            .eq("order_id", ocOrderId)
            .neq("id", oc.id)
            .eq("status", "pendente");

          await supabaseAdmin.from("order_events").insert({
            order_id: ocOrderId,
            tipo: "vinculo",
            descricao: `Pedido vinculado ao dentista ${targetDentist.nome} pelo laboratório`,
            autor: userId,
          });
        }
      }
    }

    return { ok: true, status: "confirmada" };
  });

/**
 * 2.7 contarReivindicacoesPendentes (server function para o dentista logado):
 * Devolve só o número de claims pendentes dele, sem pedido, paciente nem laboratório.
 */
export const contarReivindicacoesPendentes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: dentist } = await supabaseAdmin
      .from("dentists")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!dentist) {
      return { ok: true, count: 0 };
    }

    const { count, error } = await supabaseAdmin
      .from("order_claims")
      .select("id", { count: "exact", head: true })
      .eq("dentist_id", dentist.id)
      .eq("status", "pendente");

    if (error) {
      return { ok: false, count: 0 };
    }

    return { ok: true, count: count ?? 0 };
  });

/**
 * 2.8 Buscar candidatos a dentista na criação de pedido pelo laboratório.
 * Retorna se existe dentista verificado neste laboratório para o CRO/UF normalizados,
 * ou lista candidatos não-verificados (nome, emailLogin, dataCadastro).
 */
export const buscarCandidatosDentistaParaPedido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { labId: string; cro: string; uf: string }) => data)
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verificar se o usuário pertence a este laboratório
    const { data: member } = await supabaseAdmin
      .from("lab_members")
      .select("id")
      .eq("lab_id", data.labId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!member) {
      return { ok: false, error: "Não autorizado", candidatos: [] };
    }

    const normCro = normalizarCroString(data.cro);
    const normUf = (data.uf || "").trim().toUpperCase();

    if (!normCro || !normUf) {
      return { ok: true, verificado: null, candidatos: [] };
    }

    // Buscar todos os dentistas cujo UF bata e cujo CRO normalizado bata
    const { data: dentists, error: dErr } = await supabaseAdmin
      .from("dentists")
      .select("id, user_id, nome, cro, uf, criado_em, revisao_status")
      .ilike("uf", normUf);

    if (dErr || !dentists) {
      return { ok: true, verificado: null, candidatos: [] };
    }

    const matchingDentists = dentists.filter((d) => normalizarCroString(d.cro) === normCro);
    if (matchingDentists.length === 0) {
      return { ok: true, verificado: null, candidatos: [] };
    }

    // Verificar quais possuem vínculo com este laboratório
    const matchingIds = matchingDentists.map((d) => d.id);
    const { data: links } = await supabaseAdmin
      .from("dentist_lab_links")
      .select("id, dentist_id, verificado_pelo_lab, verificado_cro, verificado_uf")
      .eq("lab_id", data.labId)
      .in("dentist_id", matchingIds);

    const verifiedLink = links?.find(
      (l) =>
        l.verificado_pelo_lab === true &&
        normalizarCroString(l.verificado_cro) === normCro &&
        (l.verificado_uf || "").trim().toUpperCase() === normUf
    );

    if (verifiedLink) {
      const dent = matchingDentists.find((d) => d.id === verifiedLink.dentist_id);
      if (dent) {
        return {
          ok: true,
          verificado: {
            id: dent.id,
            nome: dent.nome,
            cro: dent.cro,
            uf: dent.uf,
          },
          candidatos: [],
        };
      }
    }

    // Obter e-mails de login para os candidatos não verificados
    const userIds = matchingDentists.map((d) => d.user_id).filter(Boolean);
    const emailMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      (authUsers?.users || []).forEach((u) => {
        if (userIds.includes(u.id)) emailMap.set(u.id, u.email || "");
      });
    }

    const candidatos = matchingDentists.map((d) => ({
      id: d.id,
      nome: d.nome,
      emailLogin: emailMap.get(d.user_id) || "",
      dataCadastro: d.criado_em,
      cro: d.cro,
      uf: d.uf,
    }));

    return { ok: true, verificado: null, candidatos };
  });

/**
 * Confirmar e associar candidato diretamente na criação do pedido pelo laboratório
 */
export const associarCandidatoNaCriacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { labId: string; dentistId: string }) => data)
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verificar se o usuário pertence ao laboratório
    const { data: member } = await supabaseAdmin
      .from("lab_members")
      .select("id")
      .eq("lab_id", data.labId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!member) {
      return { ok: false, error: "Não autorizado" };
    }

    const { data: dentist } = await supabaseAdmin
      .from("dentists")
      .select("id, cro, uf, nome")
      .eq("id", data.dentistId)
      .maybeSingle();

    if (!dentist) {
      return { ok: false, error: "Dentista não encontrado" };
    }

    const now = new Date().toISOString();

    // Cria ou atualiza o vínculo para verificado_pelo_lab = true
    const { data: existingLink } = await supabaseAdmin
      .from("dentist_lab_links")
      .select("id")
      .eq("dentist_id", dentist.id)
      .eq("lab_id", data.labId)
      .maybeSingle();

    if (existingLink) {
      await supabaseAdmin
        .from("dentist_lab_links")
        .update({
          verificado_pelo_lab: true,
          verificado_cro: dentist.cro,
          verificado_uf: dentist.uf,
          verificado_em: now,
        })
        .eq("id", existingLink.id);
    } else {
      await supabaseAdmin.from("dentist_lab_links").insert({
        dentist_id: dentist.id,
        lab_id: data.labId,
        origem: "manual_lab",
        verificado_pelo_lab: true,
        verificado_cro: dentist.cro,
        verificado_uf: dentist.uf,
        verificado_em: now,
      });
    }

    return {
      ok: true,
      dentist: {
        id: dentist.id,
        nome: dentist.nome,
        cro: dentist.cro,
        uf: dentist.uf,
      },
    };
  });
