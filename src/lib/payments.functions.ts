import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ASAAS_BASE = "https://sandbox.asaas.com/api/v3";

async function asaas(path: string, init: RequestInit = {}) {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error("ASAAS_API_KEY não configurada");
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: key,
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const msg =
      data?.errors?.[0]?.description ||
      data?.error ||
      `Asaas ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export const createOrderPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Fetch order + related data (RLS ensures ownership)
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, valor, paciente, asaas_payment_id, dentist_id, lab_id, products(nome)")
      .eq("id", data.orderId)
      .maybeSingle();
    if (orderErr || !order) throw new Error("Pedido não encontrado");

    const { data: dentist } = await supabase
      .from("dentists")
      .select("id, nome, email, user_id")
      .eq("id", order.dentist_id)
      .maybeSingle();
    if (!dentist || dentist.user_id !== userId) throw new Error("Sem permissão");

    const { data: lab } = await supabase
      .from("labs")
      .select("id, nome, asaas_wallet_id, comissao_percentual, modo_recebimento")
      .eq("id", order.lab_id)
      .maybeSingle();
    if (!lab) throw new Error("Laboratório não encontrado");

    // Reuse existing payment if it exists
    let paymentId = order.asaas_payment_id;

    if (!paymentId) {
      // Find or create customer by email
      let customerId: string | null = null;
      const FAKE_CPF = "24971563792"; // CPF fictício válido para sandbox
      const search = await asaas(`/customers?email=${encodeURIComponent(dentist.email)}`);
      if (Array.isArray(search?.data) && search.data.length > 0) {
        const existing = search.data[0];
        customerId = existing.id;
        if (!existing.cpfCnpj) {
          await asaas(`/customers/${customerId}`, {
            method: "POST",
            body: JSON.stringify({ cpfCnpj: FAKE_CPF }),
          });
        }
      } else {
        const created = await asaas("/customers", {
          method: "POST",
          body: JSON.stringify({
            name: dentist.nome,
            email: dentist.email,
            cpfCnpj: FAKE_CPF,
          }),
        });
        customerId = created.id;
      }

      // Split only if lab is in "plataforma" mode with a wallet configured
      const useSplit =
        lab.modo_recebimento === "plataforma" &&
        !!lab.asaas_wallet_id &&
        Number(lab.comissao_percentual) < 100;
      const labPercent = 100 - Number(lab.comissao_percentual || 0);

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 2);

      const productName =
        (order.products as unknown as { nome?: string } | null)?.nome ?? "Pedido";

      const payload: Record<string, unknown> = {
        customer: customerId,
        billingType: "PIX",
        value: Number(order.valor),
        dueDate: dueDate.toISOString().slice(0, 10),
        description: `${productName}${order.paciente ? ` · ${order.paciente}` : ""}`,
        externalReference: order.id,
      };
      if (useSplit) {
        payload.split = [
          { walletId: lab.asaas_wallet_id, percentualValue: labPercent },
        ];
      }

      const payment = await asaas("/payments", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      paymentId = payment.id;

      await supabase
        .from("orders")
        .update({ asaas_payment_id: paymentId })
        .eq("id", order.id);
    }

    // Fetch PIX QR code
    const qr = await asaas(`/payments/${paymentId}/pixQrCode`);
    const detail = await asaas(`/payments/${paymentId}`);

    return {
      paymentId: paymentId as string,
      status: detail.status as string,
      invoiceUrl: detail.invoiceUrl as string | undefined,
      pixPayload: qr.payload as string | undefined,
      pixQrImageBase64: qr.encodedImage as string | undefined,
      expirationDate: qr.expirationDate as string | undefined,
    };
  });

export const getPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order } = await context.supabase
      .from("orders")
      .select("id, asaas_payment_id, dentist_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order?.asaas_payment_id) throw new Error("Pedido sem cobrança");
    const { data: dentist } = await supabase
      .from("dentists")
      .select("user_id")
      .eq("id", order.dentist_id)
      .maybeSingle();
    if (!dentist || dentist.user_id !== userId) throw new Error("Sem permissão");
    const detail = await asaas(`/payments/${order.asaas_payment_id}`);
    return { status: detail.status as string };
  });
