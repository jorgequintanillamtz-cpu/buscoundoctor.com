import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const full_name = body.full_name;
    const cedula = body.professional_license_number || null;
    if (!full_name) {
      return Response.json({ error: 'Falta el nombre completo (full_name)' }, { status: 400 });
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
      whatsapp: '',
      owner_user_id: user.id,
      publication_status: 'draft',
      license_verification_status: 'pending',
      active: false,
    };
    // Solo incluir la cédula si el usuario ya la proporcionó, para no chocar
    // con la restricción de unicidad si se manda vacía.
    if (cedula) {
      payload.professional_license_number = cedula;
    }

    const created = await base44.asServiceRole.entities.Specialist.create(payload);

    return Response.json({ specialist: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});