import { createFileRoute } from "@tanstack/react-router";

// One-shot bootstrap for the prototype test users.
// Idempotent: safe to call multiple times.
export const Route = createFileRoute("/api/public/bootstrap")({
  server: {
    handlers: {
      POST: async () => run(),
      GET: async () => run(),
    },
  },
});

async function run() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: lab, error: labErr } = await supabaseAdmin
    .from("labs")
    .select("id")
    .eq("subdominio", "updigital")
    .maybeSingle();
  if (labErr || !lab) {
    return json({ ok: false, error: "Laboratório UP Digital não encontrado" }, 500);
  }

  const users = [
    { email: "admin@parclabs.test", role: "admin" as const, nome: "Admin Parc Labs" },
    { email: "lab@updigital.test", role: "lab" as const, nome: "UP Digital" },
    { email: "dentista@updigital.test", role: "dentist" as const, nome: "Dr. Teste" },
  ];

  const created: Record<string, string> = {};

  for (const u of users) {
    const existing = await findUserByEmail(supabaseAdmin, u.email);
    let userId = existing?.id;
    if (!userId) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: "senha123",
        email_confirm: true,
      });
      if (error || !data.user) {
        return json({ ok: false, error: `Falha criando ${u.email}: ${error?.message}` }, 500);
      }
      userId = data.user.id;
    }
    created[u.email] = userId;

    await supabaseAdmin.from("user_roles").upsert(
      { user_id: userId, role: u.role },
      { onConflict: "user_id,role" },
    );

    if (u.role === "lab") {
      await supabaseAdmin
        .from("lab_members")
        .upsert({ user_id: userId, lab_id: lab.id }, { onConflict: "user_id,lab_id" });
    }
    if (u.role === "dentist") {
      const { data: existingDent } = await supabaseAdmin
        .from("dentists")
        .select("id")
        .eq("email", u.email)
        .maybeSingle();
      if (existingDent) {
        await supabaseAdmin
          .from("dentists")
          .update({ user_id: userId, lab_id: lab.id, nome: u.nome })
          .eq("id", existingDent.id);
      } else {
        await supabaseAdmin.from("dentists").insert({
          user_id: userId,
          email: u.email,
          nome: u.nome,
          lab_id: lab.id,
        });
      }
    }
  }

  return json({ ok: true, users: Object.keys(created), password: "senha123" });
}

async function findUserByEmail(
  admin: Awaited<ReturnType<typeof loadAdmin>>,
  email: string,
): Promise<{ id: string } | null> {
  // paginate up to a few pages
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return { id: found.id };
    if (data.users.length < 200) return null;
  }
  return null;
}

async function loadAdmin() {
  const mod = await import("@/integrations/supabase/client.server");
  return mod.supabaseAdmin;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
