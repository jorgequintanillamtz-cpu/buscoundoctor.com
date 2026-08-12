// Plantilla HTML compartida por todos los correos automáticos que manda la
// plataforma (avisos al doctor, solicitudes de cita, etc.). Base44 SendEmail
// acepta HTML en el body, así que aquí armamos un layout de tabla (el
// estándar para que se vea bien en Gmail/Outlook/Apple Mail) con el logo y
// los colores de marca, en vez de mandar texto plano.
//
// Diseño sobrio pero con presencia de marca: header sólido en azul marino
// (para que se distinga de inmediato en la bandeja de entrada) y cuerpo
// restringido — sin píldoras de color ni cajas saturadas, un solo acento
// para el botón y texto de color solo para indicar estado. El objetivo es
// que se vea como el correo transaccional de un producto serio (Stripe,
// Linear) y no como una plantilla genérica de newsletter.
//
// No usamos JSX/React aquí a propósito: esto corre como string plano que se
// manda tal cual al proveedor de correo, no se renderiza en el navegador.

export const BRAND = {
  navy: "#0B1E4D",
  blue: "#2F6FED",
  blueLight: "#EAF2FF",
  bluePale: "#DCE9FF",
};

export const SITE_URL = "https://buscoundoctor.com";
// PNG (no webp): varios clientes de correo (Outlook de escritorio, algunos
// proxies de imágenes de Gmail) no soportan webp o no respetan bien su canal
// alfa, y el logo terminaba viéndose con un fondo sólido en vez de
// transparente. PNG tiene soporte universal de transparencia en correo.
export const LOGO_URL =
  "https://base44.app/api/apps/69daf616236dcba44672309d/files/mp/public/69daf616236dcba44672309d/493678fd4_buscoundoctor-logo.png";

const INK = "#101828";
const INK_MUTED = "#475467";
const INK_FAINT = "#667085";
const BORDER = "#E4E7EC";
const PAGE_BG = "#F4F6F8";

// Solo texto de color para indicar estado — sin fondos ni píldoras.
const TONES = {
  neutral: BRAND.navy,
  green: "#0F7B4E",
  red: "#B3261E",
};

// Escapa cualquier texto que venga de un formulario (nombre, comentario,
// motivo de rechazo...) antes de meterlo en el HTML. Sin esto, un paciente
// o doctor podría escribir algo como "<b>" en un campo y romper el layout
// del correo — o, en el peor caso, meter HTML/links no deseados.
export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Igual que esc(), pero conserva saltos de línea (para comentarios/motivos
// escritos en un textarea).
export function escMultiline(value) {
  return esc(value).replace(/\n/g, "<br/>");
}

// Una fila "Etiqueta: valor" dentro de la tarjeta de detalles. `value` debe
// venir ya escapado si es texto libre (usa esc()/escMultiline() antes).
export function detailRow(label, value) {
  if (!value) return "";
  return `
    <tr>
      <td style="padding:9px 0;font-size:13px;color:${INK_FAINT};width:132px;vertical-align:top;border-bottom:1px solid ${BORDER};">${esc(label)}</td>
      <td style="padding:9px 0;font-size:14px;color:${INK};font-weight:600;vertical-align:top;border-bottom:1px solid ${BORDER};">${value}</td>
    </tr>`;
}

export function detailTable(rowsHtml) {
  const rows = rowsHtml.filter(Boolean).join("");
  if (!rows) return "";
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-top:1px solid ${BORDER};">
      ${rows}
    </table>`;
}

// Caja de motivo (rechazo, etc.): franja de color a la izquierda sobre
// fondo neutro, no un bloque saturado. `text` debe venir ya escapado (usa
// escMultiline() antes).
export function infoBox(label, text, tone = "red") {
  const color = TONES[tone] || TONES.red;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr>
        <td style="width:3px;background:${color};border-radius:0;"></td>
        <td style="background:#FAFAFB;padding:12px 16px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.04em;">${esc(label)}</p>
          <p style="margin:0;font-size:14px;line-height:1.55;color:${INK_MUTED};">${text}</p>
        </td>
      </tr>
    </table>`;
}

// Iconos generados para cada paso del correo de bienvenida (planos, en los
// colores de marca, subidos al storage de la plataforma). Viven aquí para
// que doctorNotify.js solo tenga que referenciarlos por nombre.
export const STEP_ICONS = {
  cedula: "https://media.base44.com/images/public/69daf616236dcba44672309d/0dc3ab7b1_generated_image.png",
  biografia: "https://media.base44.com/images/public/69daf616236dcba44672309d/1ef57c620_generated_image.png",
  zona: "https://media.base44.com/images/public/69daf616236dcba44672309d/7bf1e1f1b_generated_image.png",
  formacion: "https://media.base44.com/images/public/69daf616236dcba44672309d/885688158_generated_image.png",
  aseguradoras: "https://media.base44.com/images/public/69daf616236dcba44672309d/53f0eb4be_generated_image.png",
  servicios: "https://media.base44.com/images/public/69daf616236dcba44672309d/59e74a669_generated_image.png",
};

// Un paso ilustrado (para el correo de bienvenida: "completa tu perfil paso
// a paso"). Icono a la izquierda, "Paso N" + título en negrita + descripción
// corta + link opcional. `title`/`description` deben venir ya escapados si
// son texto libre.
export function stepRow(number, iconUrl, title, description, linkLabel, linkUrl) {
  const link = linkLabel && linkUrl
    ? `<a href="${linkUrl}" style="font-size:13px;font-weight:600;color:${BRAND.blue};text-decoration:none;">${esc(linkLabel)} &rarr;</a>`
    : "";
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
      <tr>
        <td width="52" valign="top" style="padding-right:14px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="48" height="48" style="width:48px;height:48px;border-radius:10px;background:${BRAND.blueLight};text-align:center;">
            <img src="${iconUrl}" width="30" height="30" alt="" style="width:30px;height:30px;margin-top:9px;border:0;" />
          </td></tr></table>
        </td>
        <td valign="top">
          <p style="margin:0 0 2px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${BRAND.blue};">Paso ${number}</p>
          <p style="margin:0 0 3px;font-size:14.5px;font-weight:700;color:${INK};">${title}</p>
          <p style="margin:0 0 6px;font-size:13.5px;line-height:1.55;color:${INK_MUTED};">${description}</p>
          ${link}
        </td>
      </tr>
    </table>`;
}

export function stepList(rowsHtml) {
  return rowsHtml.filter(Boolean).join("");
}

// Arma el correo completo. `bodyHtml` es HTML ya construido (párrafos,
// detailTable, infoBox, stepRow, etc.) que se inserta dentro de la tarjeta.
// `badge`/`badgeTone` se muestran como una pequeña etiqueta de texto (sin
// fondo) encima del título, no como píldora de color.
// `hero` (opcional): franja de bienvenida justo debajo del header, para
// correos que necesitan más presencia visual (ej. bienvenida) — el resto
// de los correos no la usan.
export function renderEmail({
  preheader = "",
  badge,
  badgeTone = "neutral",
  title,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  hero,
}) {
  const kickerColor = TONES[badgeTone] || TONES.neutral;
  const kickerHtml = badge
    ? `<p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:${kickerColor};">${esc(badge)}</p>`
    : "";
  const ctaHtml = ctaLabel && ctaUrl
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 4px;">
        <tr>
          <td style="border-radius:6px;background:${BRAND.navy};">
            <a href="${ctaUrl}" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">${esc(ctaLabel)}</a>
          </td>
        </tr>
      </table>`
    : "";
  const heroHtml = hero
    ? `
      <tr>
        <td style="background-color:${BRAND.blueLight};padding:32px 40px;text-align:center;">
          <img src="${LOGO_URL}" alt="BuscoUnDoctor" height="22" style="height:22px;width:auto;display:inline-block;border:0;margin-bottom:16px;" />
          ${hero.eyebrow ? `<p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:${BRAND.blue};">${esc(hero.eyebrow)}</p>` : ""}
          <h1 style="margin:0;font-size:22px;line-height:1.35;color:${BRAND.navy};font-weight:700;">${esc(hero.title)}</h1>
          ${hero.subtitle ? `<p style="margin:8px 0 0;font-size:14.5px;line-height:1.6;color:${INK_MUTED};">${esc(hero.subtitle)}</p>` : ""}
        </td>
      </tr>`
    : "";

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${PAGE_BG};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${PAGE_BG};padding:40px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${BORDER};border-radius:8px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
            <tr>
              <td style="background-color:${BRAND.navy};padding:24px 40px;text-align:center;">
                <img src="${LOGO_URL}" alt="BuscoUnDoctor" height="30" style="height:30px;width:auto;display:inline-block;border:0;" />
              </td>
            </tr>
            ${heroHtml}
            <tr>
              <td style="padding:36px 40px 4px;">
                ${kickerHtml}
                <h1 style="margin:0;font-size:19px;line-height:1.4;color:${INK};font-weight:700;">${esc(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 40px 0;font-size:14.5px;line-height:1.65;color:${INK_MUTED};">
                ${bodyHtml}
                ${ctaHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:36px 40px 32px;">
                <div style="border-top:1px solid ${BORDER};padding-top:16px;font-size:12px;line-height:1.7;color:#98A2B3;">
                  Este es un correo automático de BuscoUnDoctor — no es necesario responderlo.<br/>
                  <a href="${SITE_URL}" style="color:#98A2B3;text-decoration:underline;">buscoundoctor.com</a> · Monterrey, Nuevo León
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
