import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const NAVY = '#0B1E4D';
const BLUE = '#2F6FED';
const BLUE_LIGHT = '#EAF2FF';
const INK = '#101828';
const INK_MUTED = '#475467';
const BORDER = '#E4E7EC';
const PAGE_BG = '#F4F6F8';
const SITE_NAME = 'BuscoUnDoctor';
const SITE_URL = 'https://buscoundoctor.com';
const LOGO_URL = 'https://base44.app/api/apps/69daf616236dcba44672309d/files/mp/public/69daf616236dcba44672309d/493678fd4_buscoundoctor-logo.png';
const PANEL_URL = `${SITE_URL}/panel-medico`;

const ICONS = {
  cedula: 'https://media.base44.com/images/public/69daf616236dcba44672309d/0dc3ab7b1_generated_image.png',
  biografia: 'https://media.base44.com/images/public/69daf616236dcba44672309d/1ef57c620_generated_image.png',
  zona: 'https://media.base44.com/images/public/69daf616236dcba44672309d/7bf1e1f1b_generated_image.png',
  formacion: 'https://media.base44.com/images/public/69daf616236dcba44672309d/885688158_generated_image.png',
  aseguradoras: 'https://media.base44.com/images/public/69daf616236dcba44672309d/53f0eb4be_generated_image.png',
  servicios: 'https://media.base44.com/images/public/69daf616236dcba44672309d/59e74a669_generated_image.png',
};

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stepRow(number, iconUrl, title, description, linkLabel, linkUrl) {
  const link = linkLabel && linkUrl
    ? `<a href="${linkUrl}" style="font-size:13px;font-weight:600;color:${BLUE};text-decoration:none;">${esc(linkLabel)} &rarr;</a>`
    : '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;"><tr><td width="52" valign="top" style="padding-right:14px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="48" height="48" style="width:48px;height:48px;border-radius:10px;background:${BLUE_LIGHT};text-align:center;"><img src="${iconUrl}" width="30" height="30" alt="" style="width:30px;height:30px;margin-top:9px;border:0;" /></td></tr></table></td><td valign="top"><p style="margin:0 0 2px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${BLUE};">Paso ${number}</p><p style="margin:0 0 3px;font-size:14.5px;font-weight:700;color:${INK};">${esc(title)}</p><p style="margin:0 0 6px;font-size:13.5px;line-height:1.55;color:${INK_MUTED};">${esc(description)}</p>${link}</td></tr></table>`;
}

function renderEmail({ preheader, title, bodyHtml, ctaLabel, ctaUrl, hero }) {
  const ctaHtml = ctaLabel && ctaUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 4px;"><tr><td style="border-radius:6px;background:${NAVY};"><a href="${ctaUrl}" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">${esc(ctaLabel)}</a></td></tr></table>`
    : '';
  const heroTitleHtml = esc(hero?.title || '');
  const heroHtml = hero
    ? `<tr><td style="background-color:${BLUE_LIGHT};padding:32px 40px;text-align:center;">${hero.eyebrow ? `<p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:${BLUE};">${esc(hero.eyebrow)}</p>` : ''}<h1 style="margin:0;font-size:22px;line-height:1.35;color:${NAVY};font-weight:700;">${heroTitleHtml}</h1>${hero.subtitle ? `<p style="margin:8px 0 0;font-size:14.5px;line-height:1.6;color:${INK_MUTED};">${esc(hero.subtitle)}</p>` : ''}</td></tr>`
    : '';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${esc(title)}</title></head><body style="margin:0;padding:0;background-color:${PAGE_BG};"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader || '')}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${PAGE_BG};padding:40px 12px;"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${BORDER};border-radius:8px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;"><tr><td style="background-color:${NAVY};padding:24px 40px;text-align:center;"><img src="${LOGO_URL}" alt="BuscoUnDoctor" height="30" style="height:30px;width:auto;display:inline-block;border:0;" /></td></tr>${heroHtml}<tr><td style="padding:36px 40px 4px;"><h1 style="margin:0;font-size:19px;line-height:1.4;color:${INK};font-weight:700;">${esc(title)}</h1></td></tr><tr><td style="padding:12px 40px 0;font-size:14.5px;line-height:1.65;color:${INK_MUTED};">${bodyHtml}${ctaHtml}</td></tr><tr><td style="padding:36px 40px 32px;"><div style="border-top:1px solid ${BORDER};padding-top:16px;font-size:12px;line-height:1.7;color:#98A2B3;">Este es un correo automatico de BuscoUnDoctor - no es necesario responderlo.<br/><a href="${SITE_URL}" style="color:#98A2B3;text-decoration:underline;">buscoundoctor.com</a> &middot; Monterrey, Nuevo Leon</div></td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const isAdmin = user.role === 'admin' || user.role === 'superadmin';
    if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const to = body.to;
    if (!to) return Response.json({ error: 'Falta "to"' }, { status: 400 });

    const steps = [
      stepRow(1, ICONS.cedula, 'Verifica tu cedula profesional', 'Sube tu cedula y tu identificacion oficial. Los perfiles verificados generan mas confianza y se destacan con un sello especial en tu perfil publico.', 'Subir documentos', PANEL_URL),
      stepRow(2, ICONS.biografia, 'Completa tu biografia', 'Escribe al menos 50 palabras sobre tu experiencia y enfoque. Es lo que mas ayuda a que Google y tus pacientes confien en tu perfil.', 'Escribir biografia', PANEL_URL),
      stepRow(3, ICONS.zona, 'Agrega tu zona de cobertura', 'Registra tu consultorio con su zona para aparecer en busquedas como "cardiologo en San Pedro".', 'Agregar consultorio', PANEL_URL),
      stepRow(4, ICONS.formacion, 'Suma tu formacion e idiomas', 'Agrega tus estudios, certificaciones y los idiomas que hablas - ayuda a que los pacientes elijan tu perfil.', 'Completar formacion', PANEL_URL),
      stepRow(5, ICONS.aseguradoras, 'Indica las aseguradoras que aceptas', 'Si trabajas con seguros de gastos medicos, marcarlas en tu perfil ayuda a que pacientes con esa cobertura te encuentren primero.', 'Elegir aseguradoras', PANEL_URL),
      stepRow(6, ICONS.servicios, 'Agrega tus servicios y precios', 'Lista los servicios que ofreces y, si quieres, un rango de precio - le da al paciente una idea clara antes de contactarte.', 'Agregar servicios', PANEL_URL),
    ].join('');

    const html = renderEmail({
      preheader: 'Bienvenido a BuscoUnDoctor. Sigue estos pasos para completar tu perfil.',
      hero: {
        eyebrow: 'Cuenta creada',
        title: '¡Bienvenido, Dr. Roberto!',
        subtitle: 'Tu perfil ya existe, pero le faltan algunos datos para verse profesional y aparecer bien en las búsquedas. Toma unos minutos para completarlo.',
      },
      title: 'Primeros pasos para completar tu perfil',
      bodyHtml: `<div style="margin:18px 0 4px;">${steps}</div><p style="margin:8px 0 0;font-size:13px;color:#98A2B3;">Un admin de nuestro equipo revisará tu cédula en cuanto la subas — normalmente en menos de 24 horas.</p>`,
      ctaLabel: 'Completar mi perfil',
      ctaUrl: PANEL_URL,
    });

    await base44.integrations.Core.SendEmail({ to, subject: 'Bienvenido a BuscoUnDoctor — completa tu perfil (v8, sin logo en título)', body: html, from_name: SITE_NAME });
    return Response.json({ ok: true, sent_to: to });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
