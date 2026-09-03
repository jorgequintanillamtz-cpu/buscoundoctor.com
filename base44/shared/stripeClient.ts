import Stripe from "npm:stripe";
import { secrets } from "base44:runtime";

/**
 * Lee la llave secreta de Stripe del runtime del app.
 * Lanzar aquí (dentro de una función, no en el top-level) evita un boot
 * error si el secret aún no está seteado.
 */
export function getStripeSecretKey(): string {
  const key = secrets.get("STRIPE_SECRET_KEY");
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY no está configurada. Configúrala en Settings → Environment Variables.");
  }
  return key;
}

/**
 * Cliente del SDK de Stripe — se usa solo para verificar la firma de
 * webhooks (constructEventAsync). Las llamadas a la API v2 se hacen con
 * stripeV2() (fetch directo) porque la API v2 está en preview y requiere
 * un header de Stripe-Version que el SDK instalado no expone de forma
 * estable.
 */
export function getStripe(): Stripe {
  return new Stripe(getStripeSecretKey());
}

export const STRIPE_WEBHOOK_SECRET = () => secrets.get("STRIPE_WEBHOOK_SECRET");

/**
 * Versión de la API v2 de Stripe (preview). Las cuentas Connect nuevas
 * exigen Accounts v2 (/v2/core/accounts); la v1 (stripe.accounts.create)
 * ya no se permite en cuentas nuevas.
 */
const STRIPE_API_VERSION = "2026-08-26.preview";

/**
 * Llama a un endpoint v2 de Stripe con fetch directo.
 * - Inyecta Authorization (Bearer), Stripe-Version (preview) y Content-Type.
 * - Lanza un Error con el mensaje de Stripe si la respuesta no es 2xx.
 * Compartido por createStripeConnectOnboarding y stripeConnectWebhook.
 */
export async function stripeV2(path: string, init: RequestInit = {}): Promise<any> {
  const key = getStripeSecretKey();
  const res = await fetch(`https://api.stripe.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Stripe-Version": STRIPE_API_VERSION,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  let body: any;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const msg = body?.error?.message || body?.error || `Stripe API error ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return body;
}