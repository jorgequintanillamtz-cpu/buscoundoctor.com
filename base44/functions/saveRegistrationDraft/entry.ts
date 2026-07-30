import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Autoguardado progresivo del wizard de /registro-medico. Se llama sin
// autenticación (todavía no existe cuenta) en cada paso que el usuario
// completa, para que el perfil quede visible en el panel de admin
// (pendientes / en progreso) aunque la persona abandone el registro antes
// de crear su cuenta.

function withPrefix(title, name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return '';
  const yaTienePrefijo = /^(dr\.?|dra\.?|doctor|doctora)\s+/i.test(trimmed);
  if (yaTienePrefijo) return trimmed;
  const prefix = title === 'Dra.' ? 'Dra.' : 'Dr.';
  return `${prefix} ${trimmed}`;
}

function slugify(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const full_name = body.full_name ? withPrefix(body.title, body.full_name) : '';
    const whatsapp = body.whatsapp || '';
    const specialty = body.specialty || '';

    // El esquema de Specialist exige full_name, slug, specialty y whatsapp.
    // Hasta que esos tres campos (más allá de slug, que generamos aquí)
    // estén disponibles, no hay nada válido que guardar todavía.
    const canPersist = !!(full_name && whatsapp && specialty);
    if (!canPersist) {
      return Response.json({ skipped: true });
    }

    const fields = {
      full_name,
      specialty,
      subspecialty: body.subspecialty || '',
      whatsapp,
      modality: body.modality || 'presencial',
      zone: body.zone || '',
      location: body.zone || '',
      registration_step: body.step || '',
    };
    if (body.cedula) fields.professional_license_number = body.cedula;

    let specialistId = body.draft_id || null;

    if (specialistId) {
      try {
        await base44.asServiceRole.entities.Specialist.update(specialistId, fields);
      } catch {
        // El borrador ya no existe (o fue reclamado/editado de otra forma):
        // se crea uno nuevo abajo en vez de fallar el autoguardado.
        specialistId = null;
      }
    }

    if (!specialistId) {
      const slug = `${slugify(full_name)}-${Math.random().toString(36).slice(2, 7)}`;
      const created = await base44.asServiceRole.entities.Specialist.create({
        ...fields,
        slug,
        publication_status: 'draft',
        license_verification_status: 'pending',
        active: false,
      });
      specialistId = created.id;
    }

    // Sincroniza los idiomas seleccionados hasta el momento (si el wizard ya
    // llegó a ese paso). No se eliminan los que el usuario deseleccione a
    // mitad del registro; solo se agregan los nuevos.
    if (Array.isArray(body.languages) && body.languages.length > 0) {
      const existingLangs = await base44.asServiceRole.entities.SpecialistLanguage
        .filter({ specialist_id: specialistId })
        .catch(() => []);
      const existingIds = new Set(existingLangs.map((l) => l.language_id));
      const toCreate = body.languages.filter((id) => !existingIds.has(id));
      await Promise.all(
        toCreate.map((languageId) =>
          base44.asServiceRole.entities.SpecialistLanguage.create({
            specialist_id: specialistId,
            language_id: languageId,
            level: 'avanzado',
          }).catch(() => {})
        )
      );
    }

    return Response.json({ id: specialistId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
