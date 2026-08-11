import { base44 } from "@/api/base44Client";

// Aviso por correo al doctor cada vez que el admin revisa algo suyo (perfil,
// documento, artículo de blog). No existe una integración de WhatsApp
// saliente en la plataforma: los botones de WhatsApp del sitio son enlaces
// wa.me que abren el chat en el navegador de quien hace clic, no se pueden
// disparar solos desde el servidor. El correo es el único canal automático
// disponible por ahora.
//
// "Best effort": igual que logActivity, si el doctor no tiene email
// registrado o el envío falla, no debe romper la acción principal del
// admin — solo se deja constancia en consola.
const SITE_NAME = "BuscoUnDoctor";
const PANEL_URL = "https://buscoundoctor.com/panel-medico";

async function sendNotification(email, subject, body) {
  if (!email) return;
  try {
    await base44.integrations.Core.SendEmail({ to: email, subject, body });
  } catch (e) {
    console.error("No se pudo enviar el aviso por correo al doctor:", e);
  }
}

export function notifyProfileApproved(doc) {
  return sendNotification(
    doc?.email,
    `Tu perfil en ${SITE_NAME} ya está publicado`,
    `Hola ${doc?.full_name || ""},\n\nBuenas noticias: revisamos tu perfil y ya está aprobado y publicado en ${SITE_NAME}. Los pacientes ya pueden encontrarte en el directorio.\n\nPuedes revisarlo o seguir completándolo desde tu panel:\n${PANEL_URL}\n\nSaludos,\nEquipo de ${SITE_NAME}`
  );
}

export function notifyProfileRejected(doc, reason) {
  return sendNotification(
    doc?.email,
    `Tu perfil en ${SITE_NAME} necesita algunos cambios`,
    `Hola ${doc?.full_name || ""},\n\nRevisamos tu perfil y por ahora no pudimos publicarlo. Motivo:\n${reason || "sin motivo especificado"}\n\nPuedes hacer los ajustes necesarios desde tu panel y volver a enviarlo:\n${PANEL_URL}\n\nSaludos,\nEquipo de ${SITE_NAME}`
  );
}

export function notifyDocumentApproved(doc, docTypeLabel) {
  return sendNotification(
    doc?.email,
    `Tu documento fue aprobado en ${SITE_NAME}`,
    `Hola ${doc?.full_name || ""},\n\nTu documento "${docTypeLabel}" fue revisado y aprobado.\n\nPuedes ver el estado de tus documentos desde tu panel:\n${PANEL_URL}\n\nSaludos,\nEquipo de ${SITE_NAME}`
  );
}

export function notifyDocumentRejected(doc, docTypeLabel, reason) {
  return sendNotification(
    doc?.email,
    `Tu documento necesita revisarse de nuevo — ${SITE_NAME}`,
    `Hola ${doc?.full_name || ""},\n\nRevisamos tu documento "${docTypeLabel}" y no pudimos aprobarlo. Motivo:\n${reason || "sin motivo especificado"}\n\nPuedes volver a subirlo desde tu panel:\n${PANEL_URL}\n\nSaludos,\nEquipo de ${SITE_NAME}`
  );
}

export function notifyBlogApproved(doc, postTitle) {
  return sendNotification(
    doc?.email,
    `Tu artículo ya está publicado en el blog de ${SITE_NAME}`,
    `Hola ${doc?.full_name || ""},\n\nTu artículo "${postTitle}" fue aprobado y ya está publicado en el blog de ${SITE_NAME}.\n\nSaludos,\nEquipo de ${SITE_NAME}`
  );
}

export function notifyBlogRejected(doc, postTitle, reason) {
  return sendNotification(
    doc?.email,
    `Tu artículo necesita cambios — Blog de ${SITE_NAME}`,
    `Hola ${doc?.full_name || ""},\n\nRevisamos tu artículo "${postTitle}" y por ahora no pudimos publicarlo. Motivo:\n${reason || "sin motivo especificado"}\n\nPuedes hacer los ajustes y volver a enviarlo desde tu panel:\n${PANEL_URL}\n\nSaludos,\nEquipo de ${SITE_NAME}`
  );
}

export function notifyNewAppointmentRequest(doc, request) {
  const lines = [
    `Hola ${doc?.full_name || ""},`,
    "",
    `Tienes una nueva solicitud de cita en ${SITE_NAME}:`,
    "",
    `Paciente: ${request?.patient_name || ""}`,
    request?.phone ? `Teléfono: ${request.phone}` : null,
    request?.reason ? `Motivo: ${request.reason}` : null,
    request?.preferred_date
      ? `Fecha preferida: ${request.preferred_date}${request.preferred_time ? ` a las ${request.preferred_time}` : ""}`
      : null,
    request?.comments ? `Comentarios: ${request.comments}` : null,
    "",
    "Puedes ver el detalle completo (y el resto de tus solicitudes) en tu panel:",
    PANEL_URL,
    "",
    "Saludos,",
    `Equipo de ${SITE_NAME}`,
  ].filter((line) => line !== null);
  return sendNotification(doc?.email, `Nueva solicitud de cita — ${SITE_NAME}`, lines.join("\n"));
}

// El doctor que envía un artículo desde su panel no siempre tiene su email
// a la mano en el componente que aprueba/rechaza (BlogPost solo guarda su
// nombre como autor). Esta función lo busca por su id de Specialist.
export async function findSpecialistById(specialistId) {
  if (!specialistId) return null;
  try {
    const results = await base44.entities.Specialist.filter({ id: specialistId });
    return results?.[0] || null;
  } catch (e) {
    console.error("No se pudo buscar al doctor para enviarle el aviso:", e);
    return null;
  }
}
