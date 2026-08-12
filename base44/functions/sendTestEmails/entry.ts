import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Función temporal, solo para mandar los 7 correos de muestra (con el nuevo
// diseño de marca) al buzón del dueño y que pueda revisar cómo quedaron.
// No se referencia desde ninguna pantalla del admin ni del panel del
// doctor — se invoca directo por URL y se borra después de la revisión.
//
// Las funciones de Base44 no pueden importar archivos fuera de su propia
// carpeta, así que aquí va una copia mínima de los helpers de
// src/api/emailTemplate.js (la fuente real que usa la app) solo para esta
// prueba puntual.

const BRAND = { navy: '#0B1E4D', blue: '#2F6FED', blueLight: '#EAF2FF' };
const SITE_NAME = 'BuscoUnDoctor';
const SITE_URL = 'https://buscoundoctor.com';
const LOGO_URL = 'https://media.base44.com/images/public/69daf616236dcba44672309d/9f4cfcd01_buscoundoctor.webp';
const PANEL_URL = `${SITE_URL}/panel-medico`;

const TONES = {
  blue: { bg: '#DCE9FF', text: '#0B1E4D' },
  green: { bg: '#D1FAE5', text: '#047857' },
  red: { bg: '#FEE2E2', text: '#B91C1C' },
};

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escMultiline(value) {
  return esc(value).replace(/\n/g, '<br/>');
}

function detailRow(label, value) {
  if (!value) return '';
  return `<tr><td style="padding:7px 0;font-size:13px;color:#64748B;width:130px;vertical-align:top;">${esc(label)}</td><td style="padding:7px 0;font-size:14px;color:#0B1E4D;font-weight:600;vertical-align:top;">${value}</td></tr>`;
}

function detailTable(rowsHtml) {
  const rows = rowsHtml.filter(Boolean).join('');
  if (!rows) return '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border-top:1px solid #EAF2FF;border-bottom:1px solid #EAF2FF;">${rows}</table>`;
}

function infoBox(label, text, tone = 'red') {
  const t = TONES[tone] || TONES.red;
  return `<div style="background:${t.bg};border-radius:12px;padding:14px 16px;margin:18px 0;"><p style="margin:0 0 4px;font-size:11px;font-weight:700;color:${t.text};text-transform:uppercase;letter-spacing:.04em;">${esc(label)}</p><p style="margin:0;font-size:14px;line-height:1.55;color:#334155;">${text}</p></div>`;
}

function renderEmail({ preheader = '', badge, badgeTone = 'blue', title, bodyHtml, ctaLabel, ctaUrl }) {
  const tone = TONES[badgeTone] || TONES.blue;
  const badgeHtml = badge
    ? `<span style="display:inline-block;background:${tone.bg};color:${tone.text};font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:6px 12px;border-radius:999px;">${esc(badge)}</span>`
    : '';
  const ctaHtml = ctaLabel && ctaUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 4px;"><tr><td style="border-radius:10px;background:${BRAND.blue};"><a href="${ctaUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">${esc(ctaLabel)} &rarr;</a></td></tr></table>`
    : '';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${esc(title)}</title></head><body style="margin:0;padding:0;background-color:${BRAND.blueLight};"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.blueLight};padding:32px 12px;"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;"><tr><td style="background-color:${BRAND.navy};padding:22px 32px;text-align:center;"><img src="${LOGO_URL}" alt="BuscoUnDoctor" height="34" style="height:34px;width:auto;display:inline-block;border:0;" /></td></tr><tr><td style="padding:28px 32px 8px;">${badgeHtml}<h1 style="margin:14px 0 0;font-size:21px;line-height:1.35;color:${BRAND.navy};font-family:Georgia,'Times New Roman',serif;">${esc(title)}</h1></td></tr><tr><td style="padding:10px 32px 0;font-size:14.5px;line-height:1.65;color:#334155;">${bodyHtml}${ctaHtml}</td></tr><tr><td style="padding:32px 32px 28px;"><div style="border-top:1px solid #EAF2FF;padding-top:18px;font-size:12px;line-height:1.7;color:#94A3B8;">Este es un correo automático de BuscoUnDoctor — no es necesario responderlo.<br/><a href="${SITE_URL}" style="color:${BRAND.blue};text-decoration:none;">buscoundoctor.com</a> · Monterrey, Nuevo León</div></td></tr></table></td></tr></table></body></html>`;
}

const SAMPLE_DOC = { full_name: 'Dra. Ana Sofía Martínez', specialty: 'Dermatología', slug: 'ana-sofia-martinez' };

function buildEmails() {
  return [
    {
      subject: `Tu perfil en ${SITE_NAME} ya está publicado`,
      html: renderEmail({
        preheader: 'Tu perfil ya está aprobado y visible para pacientes.',
        badge: 'Perfil aprobado',
        badgeTone: 'green',
        title: '¡Tu perfil ya está publicado!',
        bodyHtml: `<p>Hola ${esc(SAMPLE_DOC.full_name)},</p><p>Buenas noticias: revisamos tu perfil y ya está <strong>aprobado y publicado</strong> en ${SITE_NAME}. Los pacientes ya pueden encontrarte en el directorio.</p>${detailTable([
          detailRow('Doctor', esc(SAMPLE_DOC.full_name)),
          detailRow('Especialidad', esc(SAMPLE_DOC.specialty)),
          detailRow('Perfil público', `<a href="${SITE_URL}/especialista/${SAMPLE_DOC.slug}" style="color:#2F6FED;text-decoration:none;">Ver mi perfil &rarr;</a>`),
        ])}`,
        ctaLabel: 'Ir a mi panel',
        ctaUrl: PANEL_URL,
      }),
    },
    {
      subject: `Tu perfil en ${SITE_NAME} necesita algunos cambios`,
      html: renderEmail({
        preheader: 'Tu perfil necesita algunos ajustes antes de publicarse.',
        badge: 'Cambios necesarios',
        badgeTone: 'red',
        title: 'Tu perfil necesita algunos ajustes',
        bodyHtml: `<p>Hola ${esc(SAMPLE_DOC.full_name)},</p><p>Revisamos tu perfil y por ahora no pudimos publicarlo.</p>${infoBox('Motivo', escMultiline('La foto de perfil se ve borrosa y la descripción tiene menos de 50 palabras. Súbela de nuevo en mejor calidad y amplía un poco tu biografía.'))}<p>Puedes hacer los ajustes necesarios desde tu panel y volver a enviarlo.</p>`,
        ctaLabel: 'Corregir mi perfil',
        ctaUrl: PANEL_URL,
      }),
    },
    {
      subject: `Tu documento fue aprobado en ${SITE_NAME}`,
      html: renderEmail({
        preheader: 'Uno de tus documentos fue aprobado.',
        badge: 'Documento aprobado',
        badgeTone: 'green',
        title: 'Tu documento fue aprobado',
        bodyHtml: `<p>Hola ${esc(SAMPLE_DOC.full_name)},</p><p>Tu documento fue revisado y <strong>aprobado</strong>.</p>${detailTable([detailRow('Doctor', esc(SAMPLE_DOC.full_name)), detailRow('Documento', 'Cédula profesional')])}`,
        ctaLabel: 'Ver mis documentos',
        ctaUrl: PANEL_URL,
      }),
    },
    {
      subject: `Tu documento necesita revisarse de nuevo — ${SITE_NAME}`,
      html: renderEmail({
        preheader: 'Uno de tus documentos necesita revisarse de nuevo.',
        badge: 'Cambios necesarios',
        badgeTone: 'red',
        title: 'Tu documento necesita revisarse de nuevo',
        bodyHtml: `<p>Hola ${esc(SAMPLE_DOC.full_name)},</p><p>Revisamos tu documento y no pudimos aprobarlo.</p>${detailTable([detailRow('Documento', 'Identificación oficial (INE/pasaporte)')])}${infoBox('Motivo', escMultiline('La foto está borrosa y no se alcanza a leer el número de identificación.'))}<p>Puedes volver a subirlo desde tu panel.</p>`,
        ctaLabel: 'Subir de nuevo',
        ctaUrl: PANEL_URL,
      }),
    },
    {
      subject: `Tu artículo ya está publicado en el blog de ${SITE_NAME}`,
      html: renderEmail({
        preheader: 'Tu artículo ya está publicado en el blog.',
        badge: 'Artículo publicado',
        badgeTone: 'green',
        title: 'Tu artículo ya está publicado',
        bodyHtml: `<p>Hola ${esc(SAMPLE_DOC.full_name)},</p><p>Tu artículo fue aprobado y ya está publicado en el blog de ${SITE_NAME}.</p>${detailTable([
          detailRow('Artículo', '5 señales de que debes visitar a un dermatólogo'),
          detailRow('Ver publicado', `<a href="${SITE_URL}/blog/5-senales-dermatologo" style="color:#2F6FED;text-decoration:none;">Leer artículo &rarr;</a>`),
        ])}`,
        ctaLabel: 'Ir a mi panel',
        ctaUrl: PANEL_URL,
      }),
    },
    {
      subject: `Tu artículo necesita cambios — Blog de ${SITE_NAME}`,
      html: renderEmail({
        preheader: 'Tu artículo necesita algunos cambios.',
        badge: 'Cambios necesarios',
        badgeTone: 'red',
        title: 'Tu artículo necesita algunos cambios',
        bodyHtml: `<p>Hola ${esc(SAMPLE_DOC.full_name)},</p><p>Revisamos tu artículo y por ahora no pudimos publicarlo.</p>${detailTable([detailRow('Artículo', '5 señales de que debes visitar a un dermatólogo')])}${infoBox('Motivo', escMultiline('El artículo menciona una marca comercial específica. Por nuestras políticas editoriales no podemos publicar contenido promocional de marcas.'))}<p>Puedes hacer los ajustes y volver a enviarlo desde tu panel.</p>`,
        ctaLabel: 'Corregir artículo',
        ctaUrl: PANEL_URL,
      }),
    },
    {
      subject: `Nueva solicitud de cita — ${SITE_NAME}`,
      html: renderEmail({
        preheader: 'Tienes una nueva solicitud de cita.',
        badge: 'Nueva solicitud',
        badgeTone: 'blue',
        title: 'Tienes una nueva solicitud de cita',
        bodyHtml: `<p>Hola ${esc(SAMPLE_DOC.full_name)},</p><p>Un paciente acaba de solicitar una cita contigo en ${SITE_NAME}.</p>${detailTable([
          detailRow('Paciente', 'María Fernanda López'),
          detailRow('Teléfono', '81 1234 5678'),
          detailRow('Motivo', 'Revisión de lunar sospechoso'),
          detailRow('Fecha preferida', '20 de agosto a las 10:00'),
          detailRow('Comentarios', escMultiline('Prefiero cita en la mañana si es posible, gracias.')),
        ])}`,
        ctaLabel: 'Ver mis solicitudes',
        ctaUrl: PANEL_URL,
      }),
    },
  ];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const to = body.to;
    if (!to) return Response.json({ error: 'Falta "to" en el body' }, { status: 400 });

    const emails = buildEmails();
    const results = [];
    for (const e of emails) {
      try {
        await base44.integrations.Core.SendEmail({
          to,
          subject: `[Muestra de diseño] ${e.subject}`,
          body: e.html,
          from_name: SITE_NAME,
        });
        results.push({ subject: e.subject, ok: true });
      } catch (err) {
        results.push({ subject: e.subject, ok: false, error: err.message });
      }
    }
    return Response.json({ sent_to: to, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
