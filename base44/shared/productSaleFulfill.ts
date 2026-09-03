import { waitUntil } from "base44:runtime";

/**
 * Cumplimiento de ventas de productos digitales (Fase 5).
 * Compartido por stripeConnectWebhook (checkout.session.completed) y
 * getSaleDownloadLink (sincronización contra Stripe).
 */

export const APP_BASE = "https://www.buscoundoctor.com";
export const DOWNLOAD_TTL_DAYS = 7;

export function generateDownloadToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function getDownloadExpiry(): string {
  return new Date(Date.now() + DOWNLOAD_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export function buildDownloadUrl(saleId: string, token: string): string {
  return `${APP_BASE}/functions/downloadProductFile?sale_id=${encodeURIComponent(saleId)}&token=${encodeURIComponent(token)}`;
}

/**
 * Marca una venta como pagada, genera un token de descarga con vigencia y
 * dispara el email al comprador (best-effort, no bloquea). Idempotente:
 * si la venta ya está pagada, no hace nada.
 */
export async function fulfillSale(base44: any, saleId: string): Promise<void> {
  const sale = await base44.asServiceRole.entities.ProductSale.get(saleId);
  if (!sale) return;
  if (sale.payment_status === "paid") return;

  const token = generateDownloadToken();
  const expiresAt = getDownloadExpiry();
  await base44.asServiceRole.entities.ProductSale.update(saleId, {
    payment_status: "paid",
    download_token: token,
    download_expires_at: expiresAt,
    paid_at: new Date().toISOString(),
  });

  // Email best-effort: la entrega principal es el link en pantalla.
  if (sale.buyer_email) {
    waitUntil(sendDownloadEmail(base44, sale, token));
  }
}

async function sendDownloadEmail(base44: any, sale: any, token: string): Promise<void> {
  try {
    const product = await base44.asServiceRole.entities.DoctorProduct.get(sale.product_id).catch(() => null);
    const title = product?.title || "tu producto digital";
    const downloadUrl = buildDownloadUrl(sale.id, token);
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: sale.buyer_email,
      subject: `Tu compra: ${title}`,
      body:
        `¡Gracias por tu compra!\n\n` +
        `${title}\n\n` +
        `Descarga tu archivo aquí (válido ${DOWNLOAD_TTL_DAYS} días):\n${downloadUrl}\n\n` +
        `Si tienes problemas con el link, responde a este correo.`,
    });
  } catch {
    // best-effort: el link también se muestra en pantalla tras el pago.
  }
}