import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Borra un perfil de Specialist junto con TODO lo que cuelga de él, para que
// no queden restos huérfanos dando vueltas por la plataforma (reseñas en el
// home, consultorios/pines en el mapa, estadísticas de clicks, documentos,
// servicios, casos de antes/después, publicaciones, educación, checklist SEO,
// idiomas, solicitudes de cita). Solo administradores pueden ejecutarlo.

async function deleteAllByFilter(entity, filterObj) {
  const rows = await entity.filter(filterObj).catch(() => []);
  await Promise.all(rows.map((r) => entity.delete(r.id).catch(() => {})));
  return rows;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const isAdmin = user.role === 'admin' || user.role === 'superadmin';
    if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const specialistId = body.specialist_id;
    if (!specialistId) {
      return Response.json({ error: 'Falta specialist_id' }, { status: 400 });
    }

    const svc = base44.asServiceRole.entities;

    // Consultorios: primero sus horarios (dependen del id del consultorio),
    // luego los consultorios mismos.
    const offices = await svc.Office.filter({ specialist_id: specialistId }).catch(() => []);
    await Promise.all(
      offices.map((o) => deleteAllByFilter(svc.OfficeHours, { office_id: o.id }))
    );
    await Promise.all(offices.map((o) => svc.Office.delete(o.id).catch(() => {})));

    // Resto de contenido propio del perfil.
    await Promise.all([
      deleteAllByFilter(svc.SpecialistDocument, { specialist_id: specialistId }),
      deleteAllByFilter(svc.SpecialistLanguage, { specialist_id: specialistId }),
      deleteAllByFilter(svc.Review, { specialist_id: specialistId }),
      deleteAllByFilter(svc.SpecialistSeoChecklist, { specialist_id: specialistId }),
      deleteAllByFilter(svc.SpecialistService, { specialist_id: specialistId }),
      deleteAllByFilter(svc.SpecialistCase, { specialist_id: specialistId }),
      deleteAllByFilter(svc.SpecialistPost, { specialist_id: specialistId }),
      deleteAllByFilter(svc.SpecialistEducation, { specialist_id: specialistId }),
      deleteAllByFilter(svc.AppointmentRequest, { specialist_id: specialistId }),
    ]);

    // Analítica asociada (clicks, contactos, impresiones) — usan doctor_id.
    await Promise.all([
      deleteAllByFilter(svc.DoctorClick, { doctor_id: specialistId }),
      deleteAllByFilter(svc.DoctorContact, { doctor_id: specialistId }),
      deleteAllByFilter(svc.DoctorImpression, { doctor_id: specialistId }),
    ]);

    // Quita al especialista de cualquier artículo de blog que lo tuviera
    // como "especialista destacado".
    const posts = await svc.BlogPost.filter({ featured_specialists: specialistId }).catch(() => []);
    await Promise.all(
      posts.map((p) =>
        svc.BlogPost.update(p.id, {
          featured_specialists: (p.featured_specialists || []).filter((id) => id !== specialistId),
        }).catch(() => {})
      )
    );

    // Por último, el perfil mismo.
    await svc.Specialist.delete(specialistId);

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
