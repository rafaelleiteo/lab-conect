import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const CONNECTLABS_MENSALIDADE = 199;
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
    const msg = data?.errors?.[0]?.description || data?.error || `Asaas ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

const schema = z.object({
  lab: z.object({
    nome: z.string().min(2),
    subdominio: z
      .string()
      .min(3)
      .max(40)
      .regex(/^[a-z0-9-]+$/i, "Use apenas letras, números e hifens"),
    responsavel: z.string().min(2),
    email: z.string().email(),
    senha: z.string().min(8),
    modo_recebimento: z.enum(["plataforma", "proprio"]),
  }),
  billing: z.object({
    cpfCnpj: z.string().min(11),
    cep: z.string().min(8),
    addressNumber: z.string().min(1),
    phone: z.string().min(8),
  }),
  card: z.object({
    holderName: z.string().min(2),
    number: z.string().min(13),
    expiryMonth: z.string().min(1),
    expiryYear: z.string().min(2),
    ccv: z.string().min(3),
  }),
});

export const createLabSubscription = createServerFn({ method: "POST" })
  .inputValidator((input) => schema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const subdominio = data.lab.subdominio.toLowerCase();

    // Check subdomain uniqueness
    const { data: existingSub } = await supabaseAdmin
      .from("labs")
      .select("id")
      .eq("subdominio", subdominio)
      .maybeSingle();
    if (existingSub) {
      throw new Error("Este subdomínio já está em uso.");
    }

    // Create Asaas customer
    const customer = await asaas("/customers", {
      method: "POST",
      body: JSON.stringify({
        name: data.lab.responsavel,
        email: data.lab.email,
        cpfCnpj: data.billing.cpfCnpj.replace(/\D/g, ""),
        postalCode: data.billing.cep.replace(/\D/g, ""),
        addressNumber: data.billing.addressNumber,
        phone: data.billing.phone.replace(/\D/g, ""),
      }),
    });

    // Create monthly credit card subscription — Asaas tokenizes the card here.
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + 1);
    const subscription = await asaas("/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        customer: customer.id,
        billingType: "CREDIT_CARD",
        cycle: "MONTHLY",
        value: CONNECTLABS_MENSALIDADE,
        nextDueDate: nextDue.toISOString().slice(0, 10),
        description: `Mensalidade LabConect — ${data.lab.nome}`,
        creditCard: {
          holderName: data.card.holderName,
          number: data.card.number.replace(/\s/g, ""),
          expiryMonth: data.card.expiryMonth.padStart(2, "0"),
          expiryYear:
            data.card.expiryYear.length === 2 ? `20${data.card.expiryYear}` : data.card.expiryYear,
          ccv: data.card.ccv,
        },
        creditCardHolderInfo: {
          name: data.card.holderName,
          email: data.lab.email,
          cpfCnpj: data.billing.cpfCnpj.replace(/\D/g, ""),
          postalCode: data.billing.cep.replace(/\D/g, ""),
          addressNumber: data.billing.addressNumber,
          phone: data.billing.phone.replace(/\D/g, ""),
        },
      }),
    });

    // Create the user
    const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.lab.email,
      password: data.lab.senha,
      email_confirm: true,
    });
    if (userErr || !userData.user) {
      throw new Error(userErr?.message || "Falha ao criar usuário");
    }
    const userId = userData.user.id;

    // Create lab
    const { data: lab, error: labErr } = await supabaseAdmin
      .from("labs")
      .insert({
        nome: data.lab.nome,
        subdominio,
        modo_recebimento: data.lab.modo_recebimento,
        assinatura_status: "ativa",
        revisao_status: "pendente",
        visivel_diretorio: true,
        asaas_customer_id: customer.id,
        asaas_subscription_id: subscription.id,
        responsavel: data.lab.responsavel,
        email_contato: data.lab.email,
        telefone: data.billing.phone,
        cnpj: data.billing.cpfCnpj,
        cep: data.billing.cep,
        endereco_numero: data.billing.addressNumber,
      })
      .select("id")
      .single();
    if (labErr || !lab) {
      throw new Error(labErr?.message || "Falha ao criar laboratório");
    }

    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "lab" });
    await supabaseAdmin
      .from("lab_members")
      .insert({ user_id: userId, lab_id: lab.id });

    return { ok: true as const, labId: lab.id };
  });

export const checkSubdomainAvailable = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ subdominio: z.string().min(3) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sub = data.subdominio.toLowerCase();
    if (!/^[a-z0-9-]+$/.test(sub)) return { available: false as const, reason: "invalid" };
    const { data: row } = await supabaseAdmin
      .from("labs")
      .select("id")
      .eq("subdominio", sub)
      .maybeSingle();
    return { available: !row };
  });
