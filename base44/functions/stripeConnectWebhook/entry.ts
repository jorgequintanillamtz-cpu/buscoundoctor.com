import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getStripe, STRIPE_WEBHOOK_SECRET } from "../../shared/stripeClient.ts";

/**
 * Webhook público de Stripe Connect.
 * Endpoint: /functions/stripeConnectWebhook
 * Evento suscrito: account.updated
 *
 * Sin auth de usuario — se valida la firma del webhook con STRIPE_WEBHOOK_SECRET.
 * Las actualizaciones de la entidad se hacen con asServiceRole (bypass de RLS)
 * porque el webhook no tiene un usuario asociado.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const sig = req.headers.get("stripe-signature");
    const rawBody = await req.text();
    const whSecret = STRIPE_WEBHOOK_SECRET();

    if (!sig || !whSecret) {
      return Response.json({ error: "Falta firma o webhook secret" }, { status: 400 });
    }

    const stripe = getStripe();
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, sig, whSecret);
    } catch (err) {
      return Response.json({ error: "Firma inválida: " + err.message }, { status: 400 });
    }

    if (event.type === "account.updated") {
      const acct = event.data.object;
      const transfersActive = acct.capabilities?.transfers === "active";
      const cardPaymentsActive = acct.capabilities?.card_payments === "active";
      const detailsSubmitted = acct.details_submitted === true;

      // Buscar el registro local por stripe_account_id (asServiceRole: bypass RLS)
      const records = await base44.asServiceRole.entities.DoctorStripeAccount.filter({
        stripe_account_id: acct.id,
      });

      if (records && records.length > 0) {
        const rec = records[0];
        let nextStatus = "pending";
        if (detailsSubmitted && transfersActive && cardPaymentsActive) {
          nextStatus = "complete";
        } else if (acct.charges_enabled === false && detailsSubmitted === false) {
          // Stripe puede reportar rechazo si la cuenta no cumple requisitos
          nextStatus = "rejected";
        }
        await base44.asServiceRole.entities.DoctorStripeAccount.update(rec.id, {
          onboarding_status: nextStatus,
        });
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}