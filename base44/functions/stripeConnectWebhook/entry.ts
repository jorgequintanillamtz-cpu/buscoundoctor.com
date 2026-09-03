import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getStripe, stripeV2, STRIPE_WEBHOOK_SECRET } from "../../shared/stripeClient.ts";

/**
 * Webhook público de Stripe Connect.
 * Endpoint: /functions/stripeConnectWebhook
 *
 * Eventos que maneja:
 *  - v2: "v2.core.account[configuration.merchant].capability_status_updated"
 *        (evento thin v2 — se recupera la cuenta vía API para leer el status)
 *  - v2: "v2.core.account.updated" (fallback general v2)
 *  - v1: "account.updated" (snapshot v1 — las cuentas v2 también lo emiten
 *        al cambiar la configuración merchant; se mantiene como fallback)
 *
 * Sin auth de usuario — se valida la firma del webhook con STRIPE_WEBHOOK_SECRET.
 * Las actualizaciones de la entidad se hacen con asServiceRole (bypass de RLS)
 * porque el webhook no tiene un usuario asociado.
 */
const V2_MERCHANT_CAP = "v2.core.account[configuration.merchant].capability_status_updated";
const V2_ACCOUNT_UPDATED = "v2.core.account.updated";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const sig = req.headers.get("stripe-signature");
    const rawBody = await req.text();
    const whSecret = STRIPE_WEBHOOK_SECRET();

    if (!sig || !whSecret) {
      return Response.json({ error: "Falta firma o webhook secret" }, { status: 400 });
    }

    // La verificación de firma es la misma para eventos v1 y v2 (HMAC del payload).
    const stripe = getStripe();
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, sig, whSecret);
    } catch (err) {
      return Response.json({ error: "Firma inválida: " + err.message }, { status: 400 });
    }

    const type = event.type;

    if (type === "account.updated") {
      // Evento v1 (snapshot). Las cuentas v2 también lo emiten al actualizar
      // la configuración merchant, así que sirve como fallback universal.
      const acct = event.data?.object;
      if (acct?.id) {
        await updateStatusFromV1Account(base44, acct);
      }
    } else if (type === V2_MERCHANT_CAP || type === V2_ACCOUNT_UPDATED) {
      // Evento v2 (thin): no trae el snapshot de la cuenta. Hay que recuperarla
      // vía API para leer el status actual de las capabilities merchant.
      const acctId = event.related_object?.id || event.data?.object?.id;
      if (acctId) {
        const acct = await stripeV2(
          `/v2/core/accounts/${acctId}?include=configuration.merchant,requirements`
        );
        await updateStatusFromV2Account(base44, acct);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Procesa un Account v1 (snapshot completo en data.object).
 * Usa capabilities.transfers / card_payments y details_submitted.
 */
async function updateStatusFromV1Account(base44: any, acct: any): Promise<void> {
  const records = await base44.asServiceRole.entities.DoctorStripeAccount.filter({
    stripe_account_id: acct.id,
  });
  if (!records || records.length === 0) return;

  const rec = records[0];
  const transfersActive = acct.capabilities?.transfers === "active";
  const cardPaymentsActive = acct.capabilities?.card_payments === "active";
  const detailsSubmitted = acct.details_submitted === true;

  let nextStatus = "pending";
  if (detailsSubmitted && transfersActive && cardPaymentsActive) {
    nextStatus = "complete";
  } else if (acct.charges_enabled === false && detailsSubmitted === false) {
    nextStatus = "rejected";
  }

  await base44.asServiceRole.entities.DoctorStripeAccount.update(rec.id, {
    onboarding_status: nextStatus,
  });
}

/**
 * Procesa un Account v2 recuperado vía /v2/core/accounts.
 * Lee configuration.merchant.capabilities.{transfers,card_payments}.status.
 */
async function updateStatusFromV2Account(base44: any, acct: any): Promise<void> {
  const records = await base44.asServiceRole.entities.DoctorStripeAccount.filter({
    stripe_account_id: acct.id,
  });
  if (!records || records.length === 0) return;

  const rec = records[0];
  // En v2, el merchant config expone card_payments y stripe_balance.payouts
  // (NO transfers — ese era v1). El onboarding está completo cuando ambos
  // están activos.
  const caps = acct.configuration?.merchant?.capabilities || {};
  const cardPaymentsStatus = caps.card_payments?.status;
  const payoutsStatus = caps.stripe_balance?.payouts?.status;

  let nextStatus = "pending";
  if (cardPaymentsStatus === "active" && payoutsStatus === "active") {
    nextStatus = "complete";
  } else if (cardPaymentsStatus === "disabled" && payoutsStatus === "disabled") {
    nextStatus = "rejected";
  }

  await base44.asServiceRole.entities.DoctorStripeAccount.update(rec.id, {
    onboarding_status: nextStatus,
  });
}