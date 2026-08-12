import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Funcion temporal: correo de bienvenida (diseno nuevo, con hero + pasos)
// y un correo transaccional de ejemplo con el header a color restaurado.
// Se borra despues de la revision.

const INK = '#101828';
const INK_MUTED = '#475467';
const INK_FAINT = '#667085';
const BORDER = '#E4E7EC';
const PAGE_BG = '#F4F6F8';
const NAVY = '#0B1E4D';
const BLUE = '#2F6FED';
const BLUE_LIGHT = '#EAF2FF';
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

function detailRow(label, value) {
  if (!value) return '';
  return `<tr><td style="padding:9px 0;font-size:13px;color:${INK_FAINT};width:132px;vertical-align:top;border-bottom:1px solid ${BORDER};">${esc(label)}</td><td style="padding:9px 0;font-size:14px;color:${INK};font-weight:600;vertical-align:top;border-bottom:1px solid ${BORDER};">${value}</td></tr>`;
}

function detailTable(rowsHtml) {
  const rows = rowsHtml.filter(Boolean).join('');
  if (!rows) return '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-top:1px solid ${BORDER};">${rows}</table>`;
}

function stepRow(number, title, description, linkLabel, linkUrl) {
  const link = linkLabel && linkUrl
    ? `<a href="${linkUrl}" style="font-size:13px;font-weight:600;color:${BLUE};text-decoration:none;">${esc(linkLabel)} &rarr;</a>`
    : '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td width="34" valign="top" style="padding-right:14px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="26" height="26" style="width:26px;height:26px;border-radius:50%;background:${NAVY};font-size:12px;font-weight:700;color:#ffffff;text-align:center;line-height:26px;">${number}</td></tr></table></td><td valign="top" style="padding-top:2px;"><p style="margin:0 0 3px;font-size:14.5px;font-weight:700;color:${INK};">${esc(title)}</p><p style="margin:0 0 6px;font-size:13.5px;line-height:1.55;color:${INK_MUTED};">${esc(description)}</p>${link}</td></tr></table>`;
}

function renderEmail({ preheader, badge, badgeTone, title, bodyHtml, ctaLabel, ctaUrl, hero }) {
  const kickerColor = TONES[badgeTone] || TONES.neutral;
  const kickerHtml = badge
    ? `<p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:${kickerColor};">${esc(badge)}</p>`
    : '';
  const ctaHtml = ctaLabel && ctaUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 4px;"><tr><td style="border-radius:6px;background:${NAVY};"><a href="${ctaUrl}" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">${esc(ctaLabel)}</a></td></tr></table>`
    : '';
  const heroHtml = hero
    ? `<tr><td style="background-color:${BLUE_LIGHT};padding:32px 40px;text-align:center;">${hero.eyebrow ? `<p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:${BLUE};">${esc(hero.eyebrow)}</p>` : ''}<h1 style="margin:0;font-size:22px;line-height:1.35;color:${NAVY};font-weight:700;">${esc(hero.title)}</h1>${hero.subtitle ? `<p style="margin:8px 0 0;font-size:14.5px;line-height:1.6;color:${INK_MUTED};">${esc(hero.subtitle)}</p>` : ''}</td></tr>`
    : '';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${esc(title)}</title></head><body style="margin:0;padding:0;background-color:${PAGE_BG};"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader || '')}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${PAGE_BG};padding:40px 12px;"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${BORDER};border-radius:8px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;"><tr><td style="background-color:${NAVY};padding:24px 40px;text-align:center;"><img src="${LOGO_URL}" alt="BuscoUnDoctor" height="30" style="height:30px;width:auto;display:inline-block;border:0;" /></td></tr>${heroHtml}<tr><td style="padding:36px 40px 4px;">${kickerHtml}<h1 style="margin:0;font-size:19px;line-height:1.4;color:${INK};font-weight:700;">${esc(title)}</h1></td></tr><tr><td style="padding:12px 40px 0;font-size:14.5px;line-height:1.65;color:${INK_MUTED};">${bodyHtml}${ctaHtml}</td></tr><tr><td style="padding:36px 40px 32px;"><div style="border-top:1px solid ${BORDER};padding-top:16px;font-size:12px;line-height:1.7;color:#98A2B3;">Este es un correo automatico de BuscoUnDoctor - no es necesario responderlo.<br/><a href="${SITE_URL}" style="color:#98A2B3;text-decoration:underline;">buscoundoctor.com</a> &middot; Monterrey, Nuevo Leon</div></td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const to = body.to;
    if (!to) return Response.json({ error: 'Falta "to"' }, { status: 400 });

    const welcomeHtml = renderEmail({
      preheader: 'Bienvenido a BuscoUnDoctor. Sigue estos pasos para completar tu perfil.',
      hero: {
        eyebrow: 'Cuenta creada',
        title: `¡Bienvenido a ${SITE_NAME}, Dr. Roberto Trevino!`,
        subtitle: 'Tu perfil ya existe, pero le faltan algunos datos para verse profesional y aparecer bien en las busquedas. Toma unos minutos para completarlo.',
      },
      title: 'Primeros pasos para completar tu perfil',
      bodyHtml: `<div style="margin:18px 0 4px;">${stepRow(1, 'Verifica tu cedula profesional', 'Sube tu cedula y tu identificacion oficial. Los perfiles verificados generan mas confianza y se destacan con un sello especial.', 'Subir documentos', PANEL_URL)}${stepRow(2, 'Completa tu biografia', 'Escribe al menos 50 palabras sobre tu experiencia y enfoque. Es lo que mas ayuda a que Google y tus pacientes confien en tu perfil.', 'Escribir biografia', PANEL_URL)}${stepRow(3, 'Agrega tu zona de cobertura', 'Registra tu consultorio con su zona para aparecer en busquedas como "cardiologo en San Pedro".', 'Agregar consultorio', PANEL_URL)}${stepRow(4, 'Suma tu formacion e idiomas', 'Agrega tus estudios, certificaciones y los idiomas que hablas.', 'Completar formacion', PANEL_URL)}</div><p style="margin:8px 0 0;font-size:13px;color:#98A2B3;">Un admin de nuestro equipo revisara tu cedula en cuanto la subas - normalmente en menos de 24 horas.</p>`,
      ctaLabel: 'Completar mi perfil',
      ctaUrl: PANEL_URL,
    });

    const approvedHtml = renderEmail({
      preheader: 'Tu perfil ya esta aprobado y visible para pacientes.',
      badge: 'Perfil aprobado',
      badgeTone: 'green',
      title: 'Tu perfil ya esta publicado',
      bodyHtml: `<p>Hola Dra. Ana Sofia Martinez,</p><p>Revisamos tu perfil y ya esta aprobado y publicado en ${SITE_NAME}.</p>${detailTable([detailRow('Doctor', 'Dra. Ana Sofia Martinez'), detailRow('Especialidad', 'Dermatologia')])}`,
      ctaLabel: 'Ir a mi panel',
      ctaUrl: PANEL_URL,
    });

    const results = [];
    for (const e of [
      { subject: `Bienvenido a ${SITE_NAME} - completa tu perfil`, html: welcomeHtml },
      { subject: `Tu perfil en ${SITE_NAME} ya esta publicado`, html: approvedHtml },
    ]) {
      try {
        await base44.integrations.Core.SendEmail({ to, subject: `[Diseno v4] ${e.subject}`, body: e.html, from_name: SITE_NAME });
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
