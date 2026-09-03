import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ADMIN_EMAIL = 'jorgequintanillamtz@gmail.com';
const SITE_NAME = 'BuscoUnDoctor';
const NAVY = '#0B1E4D';
const BORDER = '#E4E7EC';
const INK = '#101828';
const INK_MUTED = '#475467';

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[c];
  });
}

// Una fila de la tabla de datos del correo de aviso al admin. Se omite
// silenciosamente si el valor viene vacío (el doctor pudo no haber llegado
// a ese paso del wizard todavía cuando esto se dispara).
function row(label, value) {
  if (!value) return '';
  return '<tr><td style="padding:8px 12px;border-bottom:1px solid ' + BORDER + ';color:' + INK_MUTED + ';font-size:13px;white-space:nowrap;">' + esc(label) + '</td>'
    + '<td style="padding:8px 12px;border-bottom:1px solid ' + BORDER + ';color:' + INK + ';font-size:13px;font-weight:500;">' + esc(value) + '</td></tr>';
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
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;">
      <div style="background:${NAVY};padding:20px 24px;border-radius:12px 12px 0 0;">
        <p style="color:#fff;font-size:15px;font-weight:600;margin:0;">${SITE_NAME} — Nuevo registro de doctor</p>
      </div>
      <div style="border:1px solid ${BORDER};border-top:none;border-radius:0 0 12px 12px;padding:20px 24px;">
        <p style="color:${INK};font-size:14px;margin:0 0 14px;">Un doctor acaba de completar su registro. Esto fue lo que dio de alta:</p>
        <table style="width:100%;border-collapse:collapse;">${rows}</table>
        <p style="margin:18px 0 0;"><a href="https://buscoundoctor.com/admin/doctores" style="color:#2F6FED;text-decoration:none;font-size:13px;font-weight:600;">Revisar en el admin &rarr;</a></p>
      </div>
    </div>
  `;

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