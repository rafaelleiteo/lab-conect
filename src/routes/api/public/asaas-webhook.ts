import { createFileRoute } from "@tanstack/react-router";

// Asaas webhook — receives payment status updates.
// Configure in Asaas dashboard: https://<project>.lovable.app/api/public/asaas-webhook
export const Route = createFileRoute("/api/public/asaas-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            event?: string;
            payment?: { id?: string; status?: string; externalReference?: string };
          };
          const paymentId = body?.payment?.id;
          const externalRef = body?.payment?.externalReference;
          if (!paymentId) return Response.json({ ok: true });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // We don't change internal order status from payment events for now
          // (order status is production workflow, not payment). Just log which
          // order the payment refers to so the webhook is idempotent and safe.
          if (externalRef) {
            await supabaseAdmin
              .from("orders")
              .update({ asaas_payment_id: paymentId })
              .eq("id", externalRef);
          }
          return Response.json({ ok: true });
        } catch (e) {
          console.error("[asaas-webhook]", e);
          return new Response("error", { status: 500 });
        }
      },
      GET: async () => Response.json({ ok: true }),
    },
  },
});
