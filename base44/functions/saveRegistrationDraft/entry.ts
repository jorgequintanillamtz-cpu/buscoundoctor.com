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

// Compone el campo plano "address" (usado como fallback en JSON-LD y en el
// resto del sitio) a partir de los campos estructurados que llena el doctor
// en el paso de ubicación del wizard.
function composeAddress({ street, ext_number, int_number, floor, neighborhood, postal_code }) {
  const parts = [];
  if (street) parts.push(ext_number ? `${street} ${ext_number}` : street);
  if (int_number) parts.push(`Int. ${int_number}`);
  if (floor) parts.push(`Piso ${floor}`);
  if (neighborhood) parts.push(`Col. ${neighborhood}`);
  if (postal_code) parts.push(`CP ${postal_code}`);
  return parts.join(', ');
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
    if (body.years_experience) {
      const years = Number(body.years_experience);
      if (!Number.isNaN(years)) fields.years_experience = years;
    }
    if (body.address_street) fields.address_street = body.address_street;
    if (body.address_neighborhood) fields.address_neighborhood = body.address_neighborhood;
    if (body.address_ext_number) fields.address_ext_number = body.address_ext_number;
    if (body.address_int_number) fields.address_int_number = body.address_int_number;
    if (body.address_floor) fields.address_floor = body.address_floor;
    if (body.address_postal_code) fields.address_postal_code = body.address_postal_code;
    const composedAddress = composeAddress({
      street: body.address_street,
      ext_number: body.address_ext_number,
      int_number: body.address_int_number,
      floor: body.address_floor,
      neighborhood: body.address_neighborhood,
      postal_code: body.address_postal_code,
    });
    if (composedAddress) fields.address = composedAddress;
    if (body.profile_photo) fields.profile_photo = body.profile_photo;
    if (Array.isArray(body.gallery) && body.gallery.length > 0) fields.gallery = body.gallery;

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

    // Precios de consulta (paso "servicios" del wizard): upsert por nombre fijo
    // para no duplicar el registro si el usuario retrocede y vuelve a avanzar.
    async function upsertService(name, priceRaw) {
      const price = Number(priceRaw);
      if (!priceRaw || Number.isNaN(price) || price <= 0) return;
      const existingServices = await base44.asServiceRole.entities.SpecialistService
        .filter({ specialist_id: specialistId, name })
        .catch(() => []);
      if (existingServices.length > 0) {
        await base44.asServiceRole.entities.SpecialistService.update(existingServices[0].id, { price }).catch(() => {});
      } else {
        await base44.asServiceRole.entities.SpecialistService.create({ specialist_id: specialistId, name, price, display_order: 0 }).catch(() => {});
      }
    }
    if (body.service_price) await upsertService('Consulta de primera vez', body.service_price);

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
