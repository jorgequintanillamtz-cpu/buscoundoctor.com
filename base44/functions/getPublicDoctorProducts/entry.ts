import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * Devuelve los productos digitales PÚBLICOS de un doctor para su storefront.
 *
 * Dos modos:
 *  - Lista (sin product_id): devuelve { products: [...] } de un doctor.
 *  - Detalle (con product_id): devuelve { product: {...} } de un solo producto,
 *    validando que pertenezca al doctor_id indicado y esté activo.
 *
 * Seguridad:
 * - Filtra server-side por doctor_id Y status="active". No devuelve draft/inactive.
 * - Usa asServiceRole porque DoctorProduct tiene RLS privado (created_by_id)
 *   y esta función se llama desde el storefront público sin usuario logueado.
 * - Devuelve SOLO campos públicos: {id, title, description, price, cover_image, images}.
 *   NUNCA devuelve file_url (ese campo se servirá vía URL firmada temporal en
 *   la Fase 4 de checkout).
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // body vacío si no hay JSON
    }
    const doctorId = body && body.doctor_id;
    if (!doctorId || typeof doctorId !== "string") {
      return Response.json({ error: "doctor_id requerido" }, { status: 400 });
    }

    const productId = body && body.product_id;

    const toPublic = (p: any) => ({
      id: p.id,
      title: p.title,
      description: p.description || "",
      price: typeof p.price === "number" ? p.price : null,
      cover_image: p.cover_image || "",
      images: Array.isArray(p.images) ? p.images : (p.cover_image ? [p.cover_image] : []),
    });

    if (productId && typeof productId === "string") {
      // Detalle de un solo producto: validar que exista, esté activo y pertenezca
      // al doctor indicado (evita servir un producto de otro doctor bajo un
      // slug ajeno).
      let product: any = null;
      try {
        product = await base44.asServiceRole.entities.DoctorProduct.get(productId);
      } catch {
        return Response.json({ error: "Producto no encontrado" }, { status: 404 });
      }
      if (!product || product.doctor_id !== doctorId || product.status !== "active") {
        return Response.json({ error: "Producto no encontrado" }, { status: 404 });
      }
      return Response.json({ product: toPublic(product) });
    }

    const products = await base44.asServiceRole.entities.DoctorProduct.filter({
      doctor_id: doctorId,
      status: "active",
    });

    return Response.json({ products: products.map(toPublic) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}