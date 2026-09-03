import { base44 } from "@/api/base44Client";
import { logEmail } from "@/api/emailLog";
import {
  SITE_URL,
  renderEmail,
  detailRow,
  detailTable,
  infoBox,
  stepRow,
  stepList,
  STEP_ICONS,
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

// Los avisos siempre deben ir al correo con el que el doctor se registró
// e inició sesión (la cuenta User ligada vía owner_user_id) — es el único
// que sabemos que existe y que el doctor de verdad revisa, porque Base44 lo
// verifica al crear la cuenta. El campo "email" de Specialist es un dato de
// contacto público opcional que el doctor puede dejar vacío, cambiar o
// escribir mal, así que solo se usa como último recurso para perfiles sin
// cuenta propia (ej. perfiles cargados y administrados solo por el admin).
async function resolveDoctorEmail(doc) {
  if (doc?.owner_user_id) {
    try {
      const owner = await base44.entities.User.get(doc.owner_user_id);
      if (owner?.email) return owner.email;
    } catch (e) {
      console.error("No se pudo resolver el email de la cuenta del doctor:", e);
    }
  }
  return doc?.email || null;
}

// Devuelve true/false para que quien llama (ej. un botón "reenviar aviso" en
// el admin) pueda avisar honestamente si en verdad se mandó el correo, en
// vez de asumir éxito solo porque la llamada no lanzó una excepción.
//
// "type" identifica la razón del envío (bienvenida, aprobación, etc.) para
// que la bitácora EmailLog / vista "Correos enviados" del admin lo pueda
// mostrar y filtrar. Se registra tanto si el correo sale bien como si falla.
async function sendNotification(doc, subject, html, type) {
  const email = await resolveDoctorEmail(doc);
  if (!email) return false;
  try {
    await base44.integrations.Core.SendEmail({ to: email, subject, body: html, from_name: SITE_NAME });
    logEmail({ to: email, subject, type, specialistId: doc?.id, specialistName: doc?.full_name, status: "sent" });
    return true;
  } catch (e) {
    console.error("No se pudo enviar el aviso por correo al doctor:", e);
    logEmail({ to: email, subject, type, specialistId: doc?.id, specialistName: doc?.full_name, status: "failed", error: e?.message || e });
    return false;
  }
}

function greet(doc) {
  return esc(doc?.full_name || "doctor(a)");
}

function profileLink(doc) {
  return doc?.slug ? `${SITE_URL}/especialista/${doc.slug}` : null;
}

// Correo de bienvenida: se manda una sola vez, justo cuando se crea el
// perfil del doctor (createDoctorProfile). El wizard de registro ya pidió
// nombre, especialidad, WhatsApp, cédula y zona/modalidad — estos 4 pasos
// son justo lo que falta para que el perfil compita bien en el directorio
// y para desbloquear el sello de "Verificado". El orden importa: primero
// lo que genera más confianza (cédula) y más impacto en SEO.
export function notifyWelcome(doc) {
  const steps = stepList([
    stepRow(
      1,
      STEP_ICONS.cedula,
      "Verifica tu cédula profesional",
      "Sube tu cédula y tu identificación oficial. Los perfiles verificados generan más confianza y se destacan con un sello especial en tu perfil público.",
      "Subir documentos",
      PANEL_URL
    ),
    stepRow(
      2,
      STEP_ICONS.biografia,
      "Completa tu biografía",
      "Escribe al menos 50 palabras sobre tu experiencia y enfoque. Es lo que más ayuda a que Google y tus pacientes confíen en tu perfil.",
      "Escribir biografía",
      PANEL_URL
    ),
    stepRow(
      3,
      STEP_ICONS.zona,
      "Agrega tu zona de cobertura",
      "Registra tu consultorio con su zona para aparecer en búsquedas como “cardiólogo en San Pedro”.",
      "Agregar consultorio",
      PANEL_URL
    ),
    stepRow(
      4,
      STEP_ICONS.formacion,
      "Suma tu formación e idiomas",
      "Agrega tus estudios, certificaciones y los idiomas que hablas — ayuda a que los pacientes elijan tu perfil.",
      "Completar formación",
      PANEL_URL
    ),
    stepRow(
      5,
      STEP_ICONS.aseguradoras,
      "Indica las aseguradoras que aceptas",
      "Si trabajas con seguros de gastos médicos, marcarlas en tu perfil ayuda a que pacientes con esa cobertura te encuentren primero.",
      "Elegir aseguradoras",
      PANEL_URL
    ),
    stepRow(
      6,
      STEP_ICONS.servicios,
      "Agrega tus servicios y precios",
      "Lista los servicios que ofreces y, si quieres, un rango de precio — le da al paciente una idea clara antes de contactarte.",
      "Agregar servicios",
      PANEL_URL
    ),
  ]);
  const html = renderEmail({
    preheader: "Bienvenido a BuscoUnDoctor. Sigue estos pasos para completar tu perfil.",
    hero: {
      eyebrow: "Cuenta creada",
      title: `¡Bienvenido, ${doc?.full_name || "doctor(a)"}!`,
      subtitle: "Tu perfil ya existe, pero le faltan algunos datos para verse profesional y aparecer bien en las búsquedas. Toma unos minutos para completarlo.",
    },
    title: "Primeros pasos para completar tu perfil",
    bodyHtml: `
      <div style="margin:18px 0 4px;">
        ${steps}
      </div>
      <p style="margin:8px 0 0;font-size:13px;color:#98A2B3;">Un admin de nuestro equipo revisará tu cédula en cuanto la subas — normalmente en menos de 24 horas.</p>
    `,
    ctaLabel: "Completar mi perfil",
    ctaUrl: PANEL_URL,
  });
  return sendNotification(doc, `Bienvenido a ${SITE_NAME} — completa tu perfil`, html);
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
  return sendNotification(doc, `Tu perfil en ${SITE_NAME} ya está publicado`, html);
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
  return sendNotification(doc, `Tu perfil en ${SITE_NAME} necesita algunos cambios`, html);
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
  return sendNotification(doc, `Tu documento fue aprobado en ${SITE_NAME}`, html);
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
  return sendNotification(doc, `Tu documento necesita revisarse de nuevo — ${SITE_NAME}`, html);
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
  return sendNotification(doc, `Tu artículo ya está publicado en el blog de ${SITE_NAME}`, html);
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
  return sendNotification(doc, `Tu artículo necesita cambios — Blog de ${SITE_NAME}`, html);
}

export function notifyNewAppointmentRequest(doc, request) {
  const preferredDate = request?.preferred_date
    ? `${esc(request.preferred_date)}${request.preferred_time ? ` a las ${esc(request.preferred_time)}` : ""}`
    : "";
  const html = renderEmail({
    preheader: "Tienes una nueva solicitud de cita.",
    badge: "Nueva solicitud",
    badgeTone: "neutral",
    title: "Tienes una nueva solicitud de cita",
    bodyHtml: `
      <p>Hola ${greet(doc)},</p>
      <p>Un paciente acaba de solicitar una cita contigo en ${SITE_NAME}.</p>
      ${detailTable([
        detailRow("Paciente", esc(request?.patient_name)),
        request?.age ? detailRow("Edad", `${esc(request.age)} años`) : "",
        request?.phone ? detailRow("Teléfono", esc(request.phone)) : "",
        request?.email ? detailRow("Correo", esc(request.email)) : "",
        detailRow("Motivo", esc(request?.reason)),
        detailRow("Fecha preferida", preferredDate),
        request?.comments ? detailRow("Comentarios", escMultiline(request.comments)) : "",
      ])}
    `,
    ctaLabel: "Ver mis solicitudes",
    ctaUrl: PANEL_URL,
  });
  return sendNotification(doc, `Nueva solicitud de cita — ${SITE_NAME}`, html);
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
