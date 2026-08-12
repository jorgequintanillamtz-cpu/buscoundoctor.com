import { base44 } from "@/api/base44Client";
import {
  SITE_URL,
  renderEmail,
  detailRow,
  detailTable,
  infoBox,
  esc,
  escMultiline,
} from "@/api/emailTemplate";

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
const PANEL_URL = `${SITE_URL}/panel-medico`;

async function sendNotification(email, subject, html) {
  if (!email) return;
  try {
    await base44.integrations.Core.SendEmail({ to: email, subject, body: html, from_name: SITE_NAME });
  } catch (e) {
    console.error("No se pudo enviar el aviso por correo al doctor:", e);
  }
}

function greet(doc) {
  return esc(doc?.full_name || "doctor(a)");
}

function profileLink(doc) {
  return doc?.slug ? `${SITE_URL}/especialista/${doc.slug}` : null;
}

export function notifyProfileApproved(doc) {
  const link = profileLink(doc);
  const html = renderEmail({
    preheader: "Tu perfil ya está aprobado y visible para pacientes.",
    badge: "Perfil aprobado",
    badgeTone: "green",
    title: "¡Tu perfil ya está publicado!",
    bodyHtml: `
      <p>Hola ${greet(doc)},</p>
      <p>Buenas noticias: revisamos tu perfil y ya está <strong>aprobado y publicado</strong> en ${SITE_NAME}. Los pacientes ya pueden encontrarte en el directorio.</p>
      ${detailTable([
        detailRow("Doctor", esc(doc?.full_name)),
        detailRow("Especialidad", esc(doc?.specialty)),
        link ? detailRow("Perfil público", `<a href="${link}" style="color:#2F6FED;text-decoration:none;">Ver mi perfil &rarr;</a>`) : "",
      ])}
    `,
    ctaLabel: "Ir a mi panel",
    ctaUrl: PANEL_URL,
  });
  return sendNotification(doc?.email, `Tu perfil en ${SITE_NAME} ya está publicado`, html);
}

export function notifyProfileRejected(doc, reason) {
  const html = renderEmail({
    preheader: "Tu perfil necesita algunos ajustes antes de publicarse.",
    badge: "Cambios necesarios",
    badgeTone: "red",
    title: "Tu perfil necesita algunos ajustes",
    bodyHtml: `
      <p>Hola ${greet(doc)},</p>
      <p>Revisamos tu perfil y por ahora no pudimos publicarlo.</p>
      ${infoBox("Motivo", escMultiline(reason) || "Sin motivo especificado")}
      <p>Puedes hacer los ajustes necesarios desde tu panel y volver a enviarlo.</p>
    `,
    ctaLabel: "Corregir mi perfil",
    ctaUrl: PANEL_URL,
  });
  return sendNotification(doc?.email, `Tu perfil en ${SITE_NAME} necesita algunos cambios`, html);
}

export function notifyDocumentApproved(doc, docTypeLabel) {
  const html = renderEmail({
    preheader: "Uno de tus documentos fue aprobado.",
    badge: "Documento aprobado",
    badgeTone: "green",
    title: "Tu documento fue aprobado",
    bodyHtml: `
      <p>Hola ${greet(doc)},</p>
      <p>Tu documento fue revisado y <strong>aprobado</strong>.</p>
      ${detailTable([detailRow("Doctor", esc(doc?.full_name)), detailRow("Documento", esc(docTypeLabel))])}
    `,
    ctaLabel: "Ver mis documentos",
    ctaUrl: PANEL_URL,
  });
  return sendNotification(doc?.email, `Tu documento fue aprobado en ${SITE_NAME}`, html);
}

export function notifyDocumentRejected(doc, docTypeLabel, reason) {
  const html = renderEmail({
    preheader: "Uno de tus documentos necesita revisarse de nuevo.",
    badge: "Cambios necesarios",
    badgeTone: "red",
    title: "Tu documento necesita revisarse de nuevo",
    bodyHtml: `
      <p>Hola ${greet(doc)},</p>
      <p>Revisamos tu documento y no pudimos aprobarlo.</p>
      ${detailTable([detailRow("Documento", esc(docTypeLabel))])}
      ${infoBox("Motivo", escMultiline(reason) || "Sin motivo especificado")}
      <p>Puedes volver a subirlo desde tu panel.</p>
    `,
    ctaLabel: "Subir de nuevo",
    ctaUrl: PANEL_URL,
  });
  return sendNotification(doc?.email, `Tu documento necesita revisarse de nuevo — ${SITE_NAME}`, html);
}

export function notifyBlogApproved(doc, postTitle, postSlug) {
  const link = postSlug ? `${SITE_URL}/blog/${postSlug}` : null;
  const html = renderEmail({
    preheader: "Tu artículo ya está publicado en el blog.",
    badge: "Artículo publicado",
    badgeTone: "green",
    title: "Tu artículo ya está publicado",
    bodyHtml: `
      <p>Hola ${greet(doc)},</p>
      <p>Tu artículo fue aprobado y ya está publicado en el blog de ${SITE_NAME}.</p>
      ${detailTable([
        detailRow("Artículo", esc(postTitle)),
        link ? detailRow("Ver publicado", `<a href="${link}" style="color:#2F6FED;text-decoration:none;">Leer artículo &rarr;</a>`) : "",
      ])}
    `,
    ctaLabel: "Ir a mi panel",
    ctaUrl: PANEL_URL,
  });
  return sendNotification(doc?.email, `Tu artículo ya está publicado en el blog de ${SITE_NAME}`, html);
}

export function notifyBlogRejected(doc, postTitle, reason) {
  const html = renderEmail({
    preheader: "Tu artículo necesita algunos cambios.",
    badge: "Cambios necesarios",
    badgeTone: "red",
    title: "Tu artículo necesita algunos cambios",
    bodyHtml: `
      <p>Hola ${greet(doc)},</p>
      <p>Revisamos tu artículo y por ahora no pudimos publicarlo.</p>
      ${detailTable([detailRow("Artículo", esc(postTitle))])}
      ${infoBox("Motivo", escMultiline(reason) || "Sin motivo especificado")}
      <p>Puedes hacer los ajustes y volver a enviarlo desde tu panel.</p>
    `,
    ctaLabel: "Corregir artículo",
    ctaUrl: PANEL_URL,
  });
  return sendNotification(doc?.email, `Tu artículo necesita cambios — Blog de ${SITE_NAME}`, html);
}

export function notifyNewAppointmentRequest(doc, request) {
  const preferredDate = request?.preferred_date
    ? `${esc(request.preferred_date)}${request.preferred_time ? ` a las ${esc(request.preferred_time)}` : ""}`
    : "";
  const html = renderEmail({
    preheader: "Tienes una nueva solicitud de cita.",
    badge: "Nueva solicitud",
    badgeTone: "blue",
    title: "Tienes una nueva solicitud de cita",
    bodyHtml: `
      <p>Hola ${greet(doc)},</p>
      <p>Un paciente acaba de solicitar una cita contigo en ${SITE_NAME}.</p>
      ${detailTable([
        detailRow("Paciente", esc(request?.patient_name)),
        detailRow("Teléfono", esc(request?.phone)),
        detailRow("Motivo", esc(request?.reason)),
        detailRow("Fecha preferida", preferredDate),
        request?.comments ? detailRow("Comentarios", escMultiline(request.comments)) : "",
      ])}
    `,
    ctaLabel: "Ver mis solicitudes",
    ctaUrl: PANEL_URL,
  });
  return sendNotification(doc?.email, `Nueva solicitud de cita — ${SITE_NAME}`, html);
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
