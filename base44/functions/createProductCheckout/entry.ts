import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getStripe } from "../../shared/stripeClient.ts";
import { APP_BASE } from "../../shared/productSaleFulfill.ts";

/**
 * Inicia el checkout de un producto digital cobrando en nombre del doctor
 * (cargo directo sobre su cuenta Stripe Connect). Flujo:
 *  1. Validar producto activo con precio.
 *  2. Validar que el doctor tenga Stripe Connect completo.
 *  3. Crear un ProductSale (pending) con doctor_owner_user_id (ancla RLS).
 *  4. Crear una Stripe Checkout Session (direct charge, stripeAccount).
 *  5. Devolver { url } a la que el frontend redirige al comprador.
 *
 * Sin comisión de plataforma por ahora (MVP). Para agregarla después, solo
 * se descomenta application_fee_amount en la creación de la sesión — es un
 * parámetro más, no requiere reestructurar nada.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch {}
    const productId = body && body.product_id;
    const slug = body && body.slug;
    const buyerName = (body && body.buyer_name) || "";
    const buyerPhone = (body && body.buyer_phone) || "";
    const buyerEmail = (body && body.buyer_email) || "";

    if (!productId) return Response.json({ error: "product_id requerido" }, { status: 400 });
    if (!slug) return Response.json({ error: "slug requerido" }, { status: 400 });
    if (!buyerName.trim() || !buyerEmail.trim()) {
      return Response.json({ error: "Nombre y email son obligatorios" }, { status: 400 });
    }

    // 1. Producto válido + activo + con precio
    let product: any = null;
    try {
      product = await base44.asServiceRole.entities.DoctorProduct.get(productId);
    } catch {
      return Response.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    if (!product || product.status !== "active") {
      return Response.json({ error: "Producto no disponible" }, { status: 404 });
    }
    if (typeof product.price !== "number" || product.price < 0) {
      return Response.json({ error: "Producto sin precio válido" }, { status: 400 });
    }

    // 2. Doctor con Stripe Connect completo
    const accounts = await base44.asServiceRole.entities.DoctorStripeAccount.filter({
      doctor_id: product.doctor_id,
      onboarding_status: "complete",
    });
    if (!accounts || accounts.length === 0) {
      return Response.json({ error: "El doctor aún no tiene habilitado recibir pagos" }, { status: 409 });
    }
    const stripeAccountId = accounts[0].stripe_account_id;

    // 3. Resolver Specialist para owner_user_id (ancla de RLS de la venta)
    let specialist: any = null;
    try {
      specialist = await base44.asServiceRole.entities.Specialist.get(product.doctor_id);
    } catch {}
    const doctorOwnerUserId = specialist?.owner_user_id || "";

    // 4. Crear la venta (pending)
    const sale = await base44.asServiceRole.entities.ProductSale.create({
      product_id: productId,
      doctor_id: product.doctor_id,
      doctor_owner_user_id: doctorOwnerUserId,
      buyer_name: buyerName.trim(),
      buyer_phone: buyerPhone.trim(),
      buyer_email: buyerEmail.trim(),
      amount: product.price,
      currency: "mxn",
      payment_status: "pending",
    });

    // 5. Stripe Checkout Session (cargo directo sobre la cuenta del doctor)
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "mxn",
          product_data: { name: product.title },
          unit_amount: Math.round(product.price * 100),
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${APP_BASE}/dr/${encodeURIComponent(slug)}/producto/${productId}?sale=${sale.id}`,
      cancel_url: `${APP_BASE}/dr/${encodeURIComponent(slug)}/producto/${productId}`,
      customer_email: buyerEmail.trim() || undefined,
      metadata: {
        sale_id: sale.id,
        product_id: productId,
        doctor_id: product.doctor_id,
      },
      // 👇 FUTURO — comisión de plataforma: descomenta y setea el monto en
      // centavos para cobrar una fee sobre cada venta. No requiere más cambios.
      // application_fee_amount: Math.round(product.price * 100 * 0.05),
    }, { stripeAccount: stripeAccountId });

    await base44.asServiceRole.entities.ProductSale.update(sale.id, {
      stripe_checkout_session_id: session.id,
    });

    return Response.json({ url: session.url, sale_id: sale.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}