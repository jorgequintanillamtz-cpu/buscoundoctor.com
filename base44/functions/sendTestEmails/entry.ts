import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Funcion temporal, solo para mandar los 7 correos de muestra (diseno v3,
// mas sobrio/profesional) al buzon del dueno. Se borra despues.

const INK = '#101828';
const INK_MUTED = '#475467';
const INK_FAINT = '#667085';
const BORDER = '#E4E7EC';
const PAGE_BG = '#F4F6F8';
const NAVY = '#0B1E4D';
const SITE_NAME = 'BuscoUnDoctor';
const SITE_URL = 'https://buscoundoctor.com';
const LOGO_URL = 'https://base44.app/api/apps/69daf616236dcba44672309d/files/mp/public/69daf616236dcba44672309d/493678fd4_buscoundoctor-logo.png';
const PANEL_URL = `${SITE_URL}/panel-medico`;

const TONES = { neutral: NAVY, green: '#0F7B4E', red: '#B3261E' };

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
  return `<tr><td style="padding:9px 0;font-size:13px;color:${INK_FAINT};width:132px;vertical-align:top;border-bottom:1px solid ${BORDER};">${esc(label)}</td><td style="padding:9px 0;font-size:14px;color:${INK};font-weight:600;vertical-align:top;border-bottom:1px solid ${BORDER};">${value}</td></tr>`;
}

function detailTable(rowsHtml) {
  const rows = rowsHtml.filter(Boolean).join('');
  if (!rows) return '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-top:1px solid ${BORDER};">${rows}</table>`;
}

function infoBox(label, text, tone = 'red') {
  const color = TONES[tone] || TONES.red;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr><td style="width:3px;background:${color};"></td><td style="background:#FAFAFB;padding:12px 16px;"><p style="margin:0 0 4px;font-size:11px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.04em;">${esc(label)}</p><p style="margin:0;font-size:14px;line-height:1.55;color:${INK_MUTED};">${text}</p></td></tr></table>`;
}

function renderEmail({ preheader = '', badge, badgeTone = 'neutral', title, bodyHtml, ctaLabel, ctaUrl }) {
  const kickerColor = TONES[badgeTone] || TONES.neutral;
  const kickerHtml = badge
    ? `<p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:${kickerColor};">${esc(badge)}</p>`
    : '';
  const ctaHtml = ctaLabel && ctaUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 4px;"><tr><td style="border-radius:6px;background:${NAVY};"><a href="${ctaUrl}" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">${esc(ctaLabel)}</a></td></tr></table>`
    : '';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${esc(title)}</title></head><body style="margin:0;padding:0;background-color:${PAGE_BG};"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${PAGE_BG};padding:40px 12px;"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${BORDER};border-radius:8px;font-family:Arial,Helvetica,sans-serif;"><tr><td style="padding:20px 40px;border-bottom:1px solid ${BORDER};"><img src="${LOGO_URL}" alt="BuscoUnDoctor" height="26" style="height:26px;width:auto;display:inline-block;border:0;" /></td></tr><tr><td style="padding:36px 40px 4px;">${kickerHtml}<h1 style="margin:0;font-size:19px;line-height:1.4;color:${INK};font-weight:700;">${esc(title)}</h1></td></tr><tr><td style="padding:12px 40px 0;font-size:14.5px;line-height:1.65;color:${INK_MUTED};">${bodyHtml}${ctaHtml}</td></tr><tr><td style="padding:36px 40px 32px;"><div style="border-top:1px solid ${BORDER};padding-top:16px;font-size:12px;line-height:1.7;color:#98A2B3;">Este es un correo automatico de BuscoUnDoctor - no es necesario responderlo.<br/><a href="${SITE_URL}" style="color:#98A2B3;text-decoration:underline;">buscoundoctor.com</a> &middot; Monterrey, Nuevo Leon</div></td></tr></table></td></tr></table></body></html>`;
}

const SAMPLE_DOC = { full_name: 'Dra. Ana Sofia Martinez', specialty: 'Dermatologia', slug: 'ana-sofia-martinez' };

function buildEmails() {
  return [
    {
      subject: `Tu perfil en ${SITE_NAME} ya esta publicado`,
      html: renderEmail({
        preheader: 'Tu perfil ya esta aprobado y visible para pacientes.',
        badge: 'Perfil aprobado',
        badgeTone: 'green',
        title: 'Tu perfil ya esta publicado',
        bodyHtml: `<p>Hola ${esc(SAMPLE_DOC.full_name)},</p><p>Revisamos tu perfil y ya esta aprobado y publicado en ${SITE_NAME}. Los pacientes ya pueden encontrarte en el directorio.</p>${detailTable([
          detailRow('Doctor', esc(SAMPLE_DOC.full_name)),
          detailRow('Especialidad', esc(SAMPLE_DOC.specialty)),
          detailRow('Perfil publico', `<a href="${SITE_URL}/especialista/${SAMPLE_DOC.slug}" style="color:#2F6FED;text-decoration:none;">Ver mi perfil</a>`),
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
        bodyHtml: `<p>Hola ${esc(SAMPLE_DOC.full_name)},</p><p>Revisamos tu perfil y por ahora no pudimos publicarlo.</p>${infoBox('Motivo', escMultiline('La foto de perfil se ve borrosa y la descripcion tiene menos de 50 palabras. Subela de nuevo en mejor calidad y amplia un poco tu biografia.'))}<p>Puedes hacer los ajustes necesarios desde tu panel y volver a enviarlo.</p>`,
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
        bodyHtml: `<p>Hola ${esc(SAMPLE_DOC.full_name)},</p><p>Tu documento fue revisado y aprobado.</p>${detailTable([detailRow('Doctor', esc(SAMPLE_DOC.full_name)), detailRow('Documento', 'Cedula profesional')])}`,
        ctaLabel: 'Ver mis documentos',
        ctaUrl: PANEL_URL,
      }),
    },
    {
      subject: `Tu documento necesita revisarse de nuevo - ${SITE_NAME}`,
      html: renderEmail({
        preheader: 'Uno de tus documentos necesita revisarse de nuevo.',
        badge: 'Cambios necesarios',
        badgeTone: 'red',
        title: 'Tu documento necesita revisarse de nuevo',
        bodyHtml: `<p>Hola ${esc(SAMPLE_DOC.full_name)},</p><p>Revisamos tu documento y no pudimos aprobarlo.</p>${detailTable([detailRow('Documento', 'Identificacion oficial (INE/pasaporte)')])}${infoBox('Motivo', escMultiline('La foto esta borrosa y no se alcanza a leer el numero de identificacion.'))}<p>Puedes volver a subirlo desde tu panel.</p>`,
        ctaLabel: 'Subir de nuevo',
        ctaUrl: PANEL_URL,
      }),
    },
    {
      subject: `Tu articulo ya esta publicado en el blog de ${SITE_NAME}`,
      html: renderEmail({
        preheader: 'Tu articulo ya esta publicado en el blog.',
        badge: 'Articulo publicado',
        badgeTone: 'green',
        title: 'Tu articulo ya esta publicado',
        bodyHtml: `<p>Hola ${esc(SAMPLE_DOC.full_name)},</p><p>Tu articulo fue aprobado y ya esta publicado en el blog de ${SITE_NAME}.</p>${detailTable([
          detailRow('Articulo', '5 senales de que debes visitar a un dermatologo'),
          detailRow('Ver publicado', `<a href="${SITE_URL}/blog/5-senales-dermatologo" style="color:#2F6FED;text-decoration:none;">Leer articulo</a>`),
        ])}`,
        ctaLabel: 'Ir a mi panel',
        ctaUrl: PANEL_URL,
      }),
    },
    {
      subject: `Tu articulo necesita cambios - Blog de ${SITE_NAME}`,
      html: renderEmail({
        preheader: 'Tu articulo necesita algunos cambios.',
        badge: 'Cambios necesarios',
        badgeTone: 'red',
        title: 'Tu articulo necesita algunos cambios',
        bodyHtml: `<p>Hola ${esc(SAMPLE_DOC.full_name)},</p><p>Revisamos tu articulo y por ahora no pudimos publicarlo.</p>${detailTable([detailRow('Articulo', '5 senales de que debes visitar a un dermatologo')])}${infoBox('Motivo', escMultiline('El articulo menciona una marca comercial especifica. Por nuestras politicas editoriales no podemos publicar contenido promocional de marcas.'))}<p>Puedes hacer los ajustes y volver a enviarlo desde tu panel.</p>`,
        ctaLabel: 'Corregir articulo',
        ctaUrl: PANEL_URL,
      }),
    },
    {
      subject: `Nueva solicitud de cita - ${SITE_NAME}`,
      html: renderEmail({
        preheader: 'Tienes una nueva solicitud de cita.',
        badge: 'Nueva solicitud',
        badgeTone: 'neutral',
        title: 'Tienes una nueva solicitud de cita',
        bodyHtml: `<p>Hola ${esc(SAMPLE_DOC.full_name)},</p><p>Un paciente acaba de solicitar una cita contigo en ${SITE_NAME}.</p>${detailTable([
          detailRow('Paciente', 'Maria Fernanda Lopez'),
          detailRow('Telefono', '81 1234 5678'),
          detailRow('Motivo', 'Revision de lunar sospechoso'),
          detailRow('Fecha preferida', '20 de agosto a las 10:00'),
          detailRow('Comentarios', escMultiline('Prefiero cita en la manana si es posible, gracias.')),
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
          subject: `[Diseno v3] ${e.subject}`,
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
