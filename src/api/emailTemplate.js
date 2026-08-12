// Plantilla HTML compartida por todos los correos automáticos que manda la
// plataforma (avisos al doctor, solicitudes de cita, etc.). Base44 SendEmail
// acepta HTML en el body, así que aquí armamos un layout de tabla (el
// estándar para que se vea bien en Gmail/Outlook/Apple Mail) con el logo y
// los colores de marca, en vez de mandar texto plano.
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

const TONES = {
  blue: { bg: "#DCE9FF", text: "#0B1E4D" },
  green: { bg: "#D1FAE5", text: "#047857" },
  red: { bg: "#FEE2E2", text: "#B91C1C" },
  purple: { bg: "#F3E8FF", text: "#7E22CE" },
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
      <td style="padding:7px 0;font-size:13px;color:#64748B;width:130px;vertical-align:top;">${esc(label)}</td>
      <td style="padding:7px 0;font-size:14px;color:#0B1E4D;font-weight:600;vertical-align:top;">${value}</td>
    </tr>`;
}

export function detailTable(rowsHtml) {
  const rows = rowsHtml.filter(Boolean).join("");
  if (!rows) return "";
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border-top:1px solid #EAF2FF;border-bottom:1px solid #EAF2FF;">
      ${rows}
    </table>`;
}

// Caja destacada para motivos de rechazo (o cualquier texto que merezca
// resaltarse). `text` debe venir ya escapado (usa escMultiline()).
export function infoBox(label, text, tone = "red") {
  const t = TONES[tone] || TONES.red;
  return `
    <div style="background:${t.bg};border-radius:12px;padding:14px 16px;margin:18px 0;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:${t.text};text-transform:uppercase;letter-spacing:.04em;">${esc(label)}</p>
      <p style="margin:0;font-size:14px;line-height:1.55;color:#334155;">${text}</p>
    </div>`;
}

// Arma el correo completo. `bodyHtml` es HTML ya construido (párrafos,
// detailTable, infoBox, etc.) que se inserta dentro de la tarjeta.
export function renderEmail({
  preheader = "",
  badge,
  badgeTone = "blue",
  title,
  bodyHtml,
  ctaLabel,
  ctaUrl,
}) {
  const tone = TONES[badgeTone] || TONES.blue;
  const badgeHtml = badge
    ? `<span style="display:inline-block;background:${tone.bg};color:${tone.text};font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:6px 12px;border-radius:999px;">${esc(badge)}</span>`
    : "";
  const ctaHtml = ctaLabel && ctaUrl
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 4px;">
        <tr>
          <td style="border-radius:10px;background:${BRAND.blue};">
            <a href="${ctaUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">${esc(ctaLabel)} &rarr;</a>
          </td>
        </tr>
      </table>`
    : "";

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${BRAND.blueLight};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.blueLight};padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
            <tr>
              <td style="background-color:${BRAND.navy};padding:22px 32px;text-align:center;">
                <img src="${LOGO_URL}" alt="BuscoUnDoctor" height="34" style="height:34px;width:auto;display:inline-block;border:0;" />
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px;">
                ${badgeHtml}
                <h1 style="margin:14px 0 0;font-size:21px;line-height:1.35;color:${BRAND.navy};font-family:Georgia,'Times New Roman',serif;">${esc(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 32px 0;font-size:14.5px;line-height:1.65;color:#334155;">
                ${bodyHtml}
                ${ctaHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 28px;">
                <div style="border-top:1px solid #EAF2FF;padding-top:18px;font-size:12px;line-height:1.7;color:#94A3B8;">
                  Este es un correo automático de BuscoUnDoctor — no es necesario responderlo.<br/>
                  <a href="${SITE_URL}" style="color:${BRAND.blue};text-decoration:none;">buscoundoctor.com</a> · Monterrey, Nuevo León
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
