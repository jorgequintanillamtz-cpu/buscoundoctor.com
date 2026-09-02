import Stripe from "npm:stripe";
import { secrets } from "base44:runtime";

/**
 * Inicializa el cliente de Stripe con la llave secreta del app.
 * Compartido por createStripeConnectOnboarding y stripeConnectWebhook
 * para no duplicar la lógica de lectura del secret.
 *
 * Lanzar aquí (dentro de una función llamada desde el handler, no en el
 * top-level del módulo) evita un boot error si el secret aún no está seteado.
 */
export function getStripe(): Stripe {
  const key = secrets.get("STRIPE_SECRET_KEY");
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY no está configurada. Configúrala en Settings → Environment Variables.");
  }
  return new Stripe(key);
}

export const STRIPE_WEBHOOK_SECRET = () => secrets.get("STRIPE_WEBHOOK_SECRET");