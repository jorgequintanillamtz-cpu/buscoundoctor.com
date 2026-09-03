import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getStripe } from "../../shared/stripeClient.ts";
import { fulfillSale, buildDownloadUrl } from "../../shared/productSaleFulfill.ts";

/**
 * Devuelve el link de descarga de una venta pagada. Lo llama el detalle del
 * producto al regresar de Stripe (?sale=ID).
 *
 * - Si la venta ya está pagada y el token no expiró: devuelve { status:"paid",
 *   download_url }.
 * - Si está pendiente: sincroniza con Stripe (recupera la Checkout Session en
 *   la cuenta del doctor) para no depender de que el webhook haya llegado
 *   primero. Si Stripe confirma el pago, marca la venta como pagada y devuelve
 *   el link. Si no, devuelve { status:"pending" }.
 * - Si el token expiró: { status:"expired" }.
 *
 * Público (sin login): el comprador es anónimo. Usa asServiceRole.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch {}
    const saleId = body && body.sale_id;
    if (!saleId || typeof saleId !== "string") {
      return Response.json({ error: "sale_id requerido" }, { status: 400 });
    }

    let sale: any = null;
    try {
      sale = await base44.asServiceRole.entities.ProductSale.get(saleId);
    } catch {
      return Response.json({ error: "Venta no encontrada" }, { status: 404 });
    }
    if (!sale) return Response.json({ error: "Venta no encontrada" }, { status: 404 });

    // Ya pagada
    if (sale.payment_status === "paid") {
      const expired = sale.download_expires_at &&
        new Date(sale.download_expires_at).getTime() < Date.now();
      if (expired) return Response.json({ status: "expired" });
      return Response.json({
        status: "paid",
        download_url: buildDownloadUrl(sale.id, sale.download_token),
      });
    }

    // Pendiente: sincronizar con Stripe por si el webhook no llegó aún
    if (sale.payment_status === "pending" && sale.stripe_checkout_session_id) {
      const accounts = await base44.asServiceRole.entities.DoctorStripeAccount.filter({
        doctor_id: sale.doctor_id,
      });
      if (accounts && accounts.length > 0) {
        const stripeAccountId = accounts[0].stripe_account_id;
        const stripe = getStripe();
        const session = await stripe.checkout.sessions.retrieve(
          sale.stripe_checkout_session_id,
          { stripeAccount: stripeAccountId }
        );
        if (session && session.payment_status === "paid") {
          await fulfillSale(base44, sale.id);
          const updated = await base44.asServiceRole.entities.ProductSale.get(sale.id);
          return Response.json({
            status: "paid",
            download_url: buildDownloadUrl(updated.id, updated.download_token),
          });
        }
      }
      return Response.json({ status: "pending" });
    }

    return Response.json({ status: sale.payment_status || "pending" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}