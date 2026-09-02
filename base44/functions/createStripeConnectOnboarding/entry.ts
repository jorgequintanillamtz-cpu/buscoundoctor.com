import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getStripe } from "../../shared/stripeClient.ts";

// Dominio custom del app — se usa para las URLs de regreso de Stripe.
const APP_BASE = "https://www.buscoundoctor.com";

/**
 * Crea (o reusa) la cuenta Stripe Connect Express del doctor y genera un
 * Account Link de onboarding. El doctor es redirigido al `url` devuelto.
 *
 * Flujo:
 *  1. Auth: el doctor debe estar logueado.
 *  2. Resolver su Specialist por owner_user_id.
 *  3. Buscar un DoctorStripeAccount existente (RLS: created_by_id == user.id).
 *  4. Si no existe, crear la cuenta Express en Stripe + el registro local.
 *  5. Crear un Account Link (account_onboarding) y devolver la URL.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const own = await base44.entities.Specialist.filter({ owner_user_id: user.id });
    if (!own || own.length === 0) {
      return Response.json({ error: "No tienes un perfil de médico registrado" }, { status: 400 });
    }
    const specialist = own[0];
    const doctorId = specialist.id;

    const stripe = getStripe();

    // Buscar cuenta existente (user-scoped: RLS read = created_by_id == user.id)
    let account;
    const existing = await base44.entities.DoctorStripeAccount.filter({ doctor_id: doctorId });
    if (existing && existing.length > 0) {
      account = existing[0];
    } else {
      // Crear cuenta Express en Stripe
      const stripeAccount = await stripe.accounts.create({
        type: "express",
        country: "MX",
        email: user.email || specialist.email || undefined,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        metadata: {
          doctor_id: doctorId,
          user_id: user.id,
          platform: "buscoundoctor",
        },
      });
      account = await base44.entities.DoctorStripeAccount.create({
        doctor_id: doctorId,
        stripe_account_id: stripeAccount.id,
        onboarding_status: "pending",
        connected_at: new Date().toISOString(),
      });
    }

    // Generar Account Link de onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.stripe_account_id,
      refresh_url: `${APP_BASE}/panel-medico/pagos?status=refresh`,
      return_url: `${APP_BASE}/panel-medico/pagos?status=return`,
      type: "account_onboarding",
    });

    return Response.json({
      url: accountLink.url,
      onboarding_status: account.onboarding_status,
      stripe_account_id: account.stripe_account_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}