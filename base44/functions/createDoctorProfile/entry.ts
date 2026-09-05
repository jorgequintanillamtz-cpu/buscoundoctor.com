import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ADMIN_EMAIL = 'jorgequintanillamtz@gmail.com';
const SITE_NAME = 'BuscoUnDoctor';
const SITE_URL = 'https://buscoundoctor.com';
// Misma plantilla de marca que usa src/api/emailTemplate.js (renderEmail)
// para el resto de los correos automáticos — se reescribe aquí en vez de
// importarla porque este backend function corre en su propio runtime Deno,
// aislado del bundle de frontend, y no puede importar archivos de src/.
const NAVY = '#0B1E4D';
const BORDER = '#E4E7EC';
const INK = '#101828';
const INK_MUTED = '#475467';
const INK_FAINT = '#667085';
const PAGE_BG = '#F4F6F8';
// PNG (no webp): Outlook de escritorio y algunos proxies de imagen de Gmail
// no soportan bien el canal alfa de webp y el logo se ve con fondo sólido.
const LOGO_URL = 'https://base44.app/api/apps/69daf616236dcba44672309d/files/mp/public/69daf616236dcba44672309d/493678fd4_buscoundoctor-logo.png';

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[c];
  });
}

// Una fila "Etiqueta: valor" de la tarjeta de detalles (mismo patrón visual
// que detailRow() en emailTemplate.js). Se omite silenciosamente si el
// valor viene vacío (el doctor pudo no haber llegado a ese paso del wizard
// todavía cuando esto se dispara).
function row(label, value) {
  if (!value) return '';
  return '<tr>'
    + '<td style="padding:9px 0;font-size:13px;color:' + INK_FAINT + ';width:140px;vertical-align:top;border-bottom:1px solid ' + BORDER + ';">' + esc(label) + '</td>'
    + '<td style="padding:9px 0;font-size:14px;color:' + INK + ';font-weight:600;vertical-align:top;border-bottom:1px solid ' + BORDER + ';">' + esc(value) + '</td>'
    + '</tr>';
}

// Correo al admin (Jorge) cada vez que un doctor completa su registro, con
// todo lo importante que dio de alta en el wizard. Se manda desde aquí (no
// desde doctorNotify.js en el frontend) porque este backend function es el
// único punto que corre garantizado exactamente una vez por registro real,
// sin importar si el doctor entró por Google o por correo/contraseña.
// Best effort: nunca debe tumbar la creación real del perfil del doctor.
async function notifyAdminNewRegistration(base44, specialist) {
  let priceLine = '';
  try {
    const services = await base44.asServiceRole.entities.SpecialistService.filter({ specialist_id: specialist.id, name: 'Consulta de primera vez' });
    if (services?.[0]?.price) priceLine = `$${services[0].price} MXN`;
  } catch {
    // No es crítico para el aviso: si falla, simplemente no se muestra el precio.
  }

  const specialtyLine = specialist.subspecialty ? `${specialist.specialty} — ${specialist.subspecialty}` : specialist.specialty;
  const address = specialist.address || [specialist.address_street, specialist.address_neighborhood].filter(Boolean).join(', ');
  const rows = [
    row('Nombre', specialist.full_name),
    row('Especialidad', specialtyLine),
    row('Cédula profesional', specialist.professional_license_number),
    row('WhatsApp', specialist.whatsapp),
    row('Modalidad', specialist.modality),
    row('Ciudad / zona', specialist.zone),
    row('Dirección', address),
    row('Años de experiencia', specialist.years_experience),
    row('Precio 1ra consulta', priceLine),
  ].join('');

  const subject = `Nuevo registro de doctor — ${specialist.full_name}`;
  const adminUrl = `${SITE_URL}/admin/doctores`;
  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${PAGE_BG};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Un doctor acaba de completar su registro en ${SITE_NAME}.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${PAGE_BG};padding:40px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${BORDER};border-radius:8px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
            <tr>
              <td style="background-color:${NAVY};padding:24px 40px;text-align:center;">
                <img src="${LOGO_URL}" alt="${SITE_NAME}" height="39" style="height:39px;width:auto;display:inline-block;border:0;" />
              </td>
            </tr>
            <tr>
              <td style="padding:36px 40px 4px;">
                <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#2F6FED;">Nuevo registro</p>
                <h1 style="margin:0;font-size:19px;line-height:1.4;color:${INK};font-weight:700;">Un doctor acaba de registrarse</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 40px 0;font-size:14.5px;line-height:1.65;color:${INK_MUTED};">
                <p style="margin:0 0 4px;">Esto fue lo que dio de alta en el wizard de registro:</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-top:1px solid ${BORDER};">${rows}</table>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 4px;">
                  <tr>
                    <td style="border-radius:6px;background:${NAVY};">
                      <a href="${adminUrl}" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">Revisar en el admin</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 40px 32px;">
                <div style="border-top:1px solid ${BORDER};padding-top:16px;font-size:12px;line-height:1.7;color:#98A2B3;">
                  Este es un correo automático de ${SITE_NAME} — no es necesario responderlo.<br/>
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

  try {
    await base44.integrations.Core.SendEmail({ to: ADMIN_EMAIL, subject, body: html, from_name: SITE_NAME });
    await base44.asServiceRole.entities.EmailLog.create({ to: ADMIN_EMAIL, subject, type: 'nuevo_registro_doctor_admin', specialist_id: specialist.id, specialist_name: specialist.full_name, status: 'sent' });
  } catch (e) {
    try {
      await base44.asServiceRole.entities.EmailLog.create({ to: ADMIN_EMAIL, subject, type: 'nuevo_registro_doctor_admin', specialist_id: specialist.id, specialist_name: specialist.full_name, status: 'failed', error_message: String(e?.message || e).slice(0, 500) });
    } catch {
      // Si ni siquiera se pudo dejar constancia del fallo, no hay nada más que hacer aquí.
    }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    let full_name = body.full_name;
    const cedula = body.professional_license_number || null;
    if (!full_name) {
      return Response.json({ error: 'Falta el nombre completo (full_name)' }, { status: 400 });
    }

    // Siempre se registra con el prefijo "Dr." salvo que la persona ya haya
    // puesto su propio prefijo (Dr., Dra., Doctor, Doctora), para no duplicarlo.
    const yaTienePrefijo = /^(dr\.?|dra\.?|doctor|doctora)\s+/i.test(full_name.trim());
    if (!yaTienePrefijo) {
      full_name = `Dr. ${full_name.trim()}`;
    }

    // Si el usuario ya tiene un perfil, devolverlo (evita duplicados)
    const existing = await base44.asServiceRole.entities.Specialist.filter({ owner_user_id: user.id });
    if (existing.length > 0) {
      return Response.json({ specialist: existing[0], already_existed: true });
    }

    const slug = full_name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    const payload = {
      full_name,
      slug,
      specialty: body.specialty || '',
      subspecialty: body.subspecialty || '',
      subspecialties_relation: Array.isArray(body.subspecialties_relation) ? body.subspecialties_relation.filter(Boolean) : [],
      whatsapp: body.whatsapp || '',
      modality: body.modality || 'presencial',
      zone: body.zone || '',
      location: body.zone || '',
      owner_user_id: user.id,
      publication_status: 'pending_review',
      license_verification_status: 'pending',
      active: false,
    };
    // Solo incluir la cédula si el usuario ya la proporcionó, para no chocar
    // con la restricción de unicidad si se manda vacía.
    if (cedula) {
      payload.professional_license_number = cedula;
    }

    // Si el wizard de /registro-medico ya había ido guardando un borrador
    // anónimo paso a paso (sin dueño todavía), lo reclamamos asignándole
    // owner_user_id en vez de crear un registro duplicado.
    if (body.draft_id) {
      try {
        await base44.asServiceRole.entities.Specialist.update(body.draft_id, payload);
        const full = await base44.asServiceRole.entities.Specialist.get(body.draft_id).catch(() => ({ id: body.draft_id, ...payload }));
        // Se espera a que termine (best effort, nunca lanza) para que el aviso
        // no se pierda si el runtime corta las promesas pendientes al responder.
        await notifyAdminNewRegistration(base44, full);
        return Response.json({ specialist: full });
      } catch {
        // El borrador ya no existe o no es válido: sigue al flujo normal de creación.
      }
    }

    const created = await base44.asServiceRole.entities.Specialist.create(payload);
    await notifyAdminNewRegistration(base44, created);

    return Response.json({ specialist: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});