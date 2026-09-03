import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * Devuelve si un producto está listo para comprarse (el doctor tiene Stripe
 * Connect completo). Lo usa el detalle público del producto para mostrar el
 * formulario de compra o el botón "Próximamente".
 *
 * Público (sin login): usa asServiceRole para leer DoctorProduct (RLS privado)
 * y DoctorStripeAccount.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch {}
    const productId = body && body.product_id;
    if (!productId || typeof productId !== "string") {
      return Response.json({ error: "product_id requerido" }, { status: 400 });
    }

    let product: any = null;
    try {
      product = await base44.asServiceRole.entities.DoctorProduct.get(productId);
    } catch {
      return Response.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    if (!product || product.status !== "active") {
      return Response.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const accounts = await base44.asServiceRole.entities.DoctorStripeAccount.filter({
      doctor_id: product.doctor_id,
      onboarding_status: "complete",
    });
    const stripeConnected = Array.isArray(accounts) && accounts.length > 0;

    return Response.json({ stripe_connected: stripeConnected });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}