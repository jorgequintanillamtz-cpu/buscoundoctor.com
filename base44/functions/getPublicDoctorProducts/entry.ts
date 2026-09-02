import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * Devuelve los productos digitales PÚBLICOS de un doctor para su storefront.
 *
 * Seguridad:
 * - Filtra server-side por doctor_id (el del storefront que se está viendo)
 *   Y status="active" en la misma consulta. No devuelve draft/inactive de nadie.
 * - Usa asServiceRole porque DoctorProduct tiene RLS privado (created_by_id)
 *   y esta función se llama desde el storefront público sin usuario logueado.
 * - Devuelve SOLO campos públicos: {id, title, description, price, cover_image}.
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

    const products = await base44.asServiceRole.entities.DoctorProduct.filter({
      doctor_id: doctorId,
      status: "active",
    });

    const publicProducts = products.map((p: any) => ({
      id: p.id,
      title: p.title,
      description: p.description || "",
      price: typeof p.price === "number" ? p.price : null,
      cover_image: p.cover_image || "",
    }));

    return Response.json({ products: publicProducts });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}