import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * Entrega el archivo PDF de una venta pagada. Es un endpoint de descarga
 * (GET, con query params sale_id + token) que el comprador abre directo desde
 * el link — no se invoca vía SDK porque devuelve binario, no JSON.
 *
 * Validaciones:
 *  - La venta existe, está pagada, el token coincide y no expiró.
 *  - El producto tiene file_url.
 * El archivo se sirve por proxy (fetch + stream) para NO exponer el file_url
 * crudo al comprador — así el link firmado (sale_id+token) es la única vía.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const saleId = url.searchParams.get("sale_id");
    const token = url.searchParams.get("token");
    if (!saleId || !token) {
      return Response.json({ error: "Parámetros inválidos" }, { status: 400 });
    }

    let sale: any = null;
    try {
      sale = await base44.asServiceRole.entities.ProductSale.get(saleId);
    } catch {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }
    if (!sale) return Response.json({ error: "No encontrado" }, { status: 404 });

    if (sale.payment_status !== "paid") {
      return Response.json({ error: "Pago no confirmado" }, { status: 403 });
    }
    if (sale.download_token !== token) {
      return Response.json({ error: "Token inválido" }, { status: 403 });
    }
    const expired = sale.download_expires_at &&
      new Date(sale.download_expires_at).getTime() < Date.now();
    if (expired) return Response.json({ error: "El link de descarga expiró" }, { status: 410 });

    let product: any = null;
    try {
      product = await base44.asServiceRole.entities.DoctorProduct.get(sale.product_id);
    } catch {
      return Response.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    if (!product || !product.file_url) {
      return Response.json({ error: "Archivo no disponible" }, { status: 404 });
    }

    // Proxy del archivo (stream) para no exponer el file_url crudo.
    const fileRes = await fetch(product.file_url);
    if (!fileRes.ok || !fileRes.body) {
      return Response.json({ error: "No se pudo cargar el archivo" }, { status: 502 });
    }

    const safeName = String(product.title || "producto").replace(/[^\w\-]+/g, "_");
    return new Response(fileRes.body, {
      status: 200,
      headers: {
        "Content-Type": fileRes.headers.get("Content-Type") || "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}