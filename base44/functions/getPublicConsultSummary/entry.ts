import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * Devuelve los datos PÚBLICOS de un resumen de consulta por su ID.
 *
 * Seguridad:
 * - ConsultSummary tiene RLS privado (created_by_id), así que esta función
 *   usa asServiceRole para leer por ID. El ID es un UUID no adivinable (mismo
 *   patrón que un link de Google Docs compartido).
 * - Devuelve SOLO campos públicos: summary_text, doctor_name, doctor_id,
 *   storefront_slug. NUNCA devuelve patient_phone ni patient_name.
 * - storefront_slug se incluye solo si el doctor tiene un storefront activo
 *   (Fase 1). La página pública lo usa para decidir si mostrar la sección de
 *   productos (Fase 2/3).
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // body vacío
    }
    const id = body && body.id;
    if (!id || typeof id !== "string") {
      return Response.json({ error: "id requerido" }, { status: 400 });
    }

    let summary: any = null;
    try {
      summary = await base44.asServiceRole.entities.ConsultSummary.get(id);
    } catch {
      return Response.json({ error: "Resumen no encontrado" }, { status: 404 });
    }
    if (!summary) {
      return Response.json({ error: "Resumen no encontrado" }, { status: 404 });
    }

    // Resolver el Specialist para el nombre del doctor
    let doctorName = "";
    let doctorPhoto = "";
    try {
      const specialist = await base44.asServiceRole.entities.Specialist.get(summary.doctor_id);
      doctorName = specialist?.full_name || "";
      doctorPhoto = specialist?.profile_photo || "";
    } catch {
      // Si no se encuentra, continuamos sin nombre
    }

    // Resolver el storefront activo del doctor para obtener el slug
    let storefrontSlug: string | null = null;
    try {
      const sfs = await base44.asServiceRole.entities.DoctorStorefront.filter({
        doctor_id: summary.doctor_id,
        status: "active",
      });
      if (sfs && sfs.length > 0) {
        storefrontSlug = sfs[0].slug || null;
      }
    } catch {
      // Sin storefront
    }

    // Resolver la preferencia de diseño del resumen
    let summaryTheme = "handwritten_caveat";
    let signatureStrokes = "";
    try {
      const prefs = await base44.asServiceRole.entities.DoctorConsultPreferences.filter({
        doctor_id: summary.doctor_id,
      });
      if (prefs && prefs.length > 0 && prefs[0].summary_theme) {
        summaryTheme = prefs[0].summary_theme;
        signatureStrokes = prefs[0].signature_strokes || "";
      }
    } catch {
      // Sin preferencia, usar default
    }

    return Response.json({
      summary_text: summary.summary_text || "",
      doctor_name: doctorName,
      doctor_photo: doctorPhoto,
      doctor_id: summary.doctor_id,
      storefront_slug: storefrontSlug,
      summary_theme: summaryTheme,
      signature_strokes: signatureStrokes,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}