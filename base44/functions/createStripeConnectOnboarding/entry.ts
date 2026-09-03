import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { stripeV2 } from "../../shared/stripeClient.ts";

// Dominio custom del app — se usa para las URLs de regreso de Stripe.
const APP_BASE = "https://www.buscoundoctor.com";

/**
 * Crea (o reusa) la cuenta Stripe Connect del doctor usando la API v2
 * (/v2/core/accounts con configuración merchant) y genera un Account
 * Link v2 de onboarding. El doctor es redirigido al `url` devuelto.
 *
 * Nota: la API v1 (stripe.accounts.create) ya no se permite en cuentas
 * nuevas de Stripe — exige /v2/core/accounts.
 *
 * Flujo:
 *  1. Auth: el doctor debe estar logueado.
 *  2. Resolver su Specialist por owner_user_id.
 *  3. Buscar un DoctorStripeAccount existente (RLS: created_by_id == user.id).
 *  4. Si no existe, crear la cuenta v2 (merchant) en Stripe + el registro local.
 *  5. Crear un Account Link v2 (account_onboarding, config merchant) y devolver la URL.
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

    // Buscar cuenta existente (user-scoped: RLS read = created_by_id == user.id)
    let account;
    const existing = await base44.entities.DoctorStripeAccount.filter({ doctor_id: doctorId });
    if (existing && existing.length > 0) {
      account = existing[0];
    } else {
      // Crear cuenta v2 con configuración merchant (card_payments + transfers).
      // El onboarding de Stripe completa los datos bancarios y legales.
      const created = await stripeV2("/v2/core/accounts", {
        method: "POST",
        body: JSON.stringify({
          contact_email: user.email || specialist.email || undefined,
          display_name: specialist.full_name || undefined,
          // "none" = el doctor no tiene acceso al dashboard de Stripe; solo
          // pasa por el flujo de onboarding (Account Link). Equivalente al
          // comportamiento Express de v1, pero sin dashboard (usar "express"
          // en v2 exigiría fees/losses_collector = "application", lo que
          // haría que la plataforma pague las fees, no el doctor).
          dashboard: "none",
          identity: {
            country: "mx",
            entity_type: "individual",
          },
          configuration: {
            merchant: {
              capabilities: {
                card_payments: { requested: true },
              },
            },
          },
          defaults: {
            currency: "mxn",
            responsibilities: {
              // "stripe" = Stripe cobra las comisiones de pago directamente al
              // doctor (cuenta conectada), no a la plataforma. El doctor paga
              // las fees de Stripe con sus ventas.
              fees_collector: "stripe",
              // "stripe" = Stripe responde por los saldos negativos del doctor.
              losses_collector: "stripe",
            },
          },
        }),
      });

      account = await base44.entities.DoctorStripeAccount.create({
        doctor_id: doctorId,
        stripe_account_id: created.id,
        onboarding_status: "pending",
        connected_at: new Date().toISOString(),
      });
    }

    // Generar Account Link v2 de onboarding (configuración merchant).
    const accountLink = await stripeV2("/v2/core/account_links", {
      method: "POST",
      body: JSON.stringify({
        account: account.stripe_account_id,
        use_case: {
          type: "account_onboarding",
          account_onboarding: {
            configurations: ["merchant"],
            return_url: `${APP_BASE}/panel-medico/pagos?status=return`,
            refresh_url: `${APP_BASE}/panel-medico/pagos?status=refresh`,
          },
        },
      }),
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