import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * Crea una reseña pública para un resumen de consulta.
 *
 * Seguridad:
 * - ConsultReview tiene RLS create restringido a data.doctor_id == user.id,
 *   así que esta función usa asServiceRole para permitir que cualquier persona
 *   con el link (sin login) califique una vez.
 * - Valida que el consult_summary_id exista y que el rating sea 1-5.
 * - Una reseña por resumen: si ya existe una, devuelve already_reviewed=true
 *   con la reseña existente (sin crear duplicados).
 * - doctor_id se setea desde el ConsultSummary (desnormalizado) para que el
 *   doctor pueda gestionar (update/delete) sus reseñas desde su panel.
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
    const consultSummaryId = body && body.consult_summary_id;
    const rating = body && body.rating;

    if (!consultSummaryId || typeof consultSummaryId !== "string") {
      return Response.json({ error: "consult_summary_id requerido" }, { status: 400 });
    }
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return Response.json({ error: "rating debe ser un entero entre 1 y 5" }, { status: 400 });
    }

    // Validar que el resumen exista
    let summary: any = null;
    try {
      summary = await base44.asServiceRole.entities.ConsultSummary.get(consultSummaryId);
    } catch {
      return Response.json({ error: "Resumen no encontrado" }, { status: 404 });
    }
    if (!summary) {
      return Response.json({ error: "Resumen no encontrado" }, { status: 404 });
    }

    // Una reseña por resumen (quien tenga el link califica una vez)
    const existing = await base44.asServiceRole.entities.ConsultReview.filter({
      consult_summary_id: consultSummaryId,
    });
    if (existing && existing.length > 0) {
      return Response.json({ already_reviewed: true, review: existing[0] });
    }

    const review = await base44.asServiceRole.entities.ConsultReview.create({
      consult_summary_id: consultSummaryId,
      doctor_id: summary.doctor_id,
      rating: ratingNum,
    });

    return Response.json({ review });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}