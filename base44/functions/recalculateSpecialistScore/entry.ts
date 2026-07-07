import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const specialistId = body.specialist_id;
    if (!specialistId) return Response.json({ error: 'specialist_id required' }, { status: 400 });

    const s = base44.asServiceRole.entities;

    const sp = await s.Specialist.get(specialistId);
    if (!sp) return Response.json({ error: 'Specialist not found' }, { status: 404 });

    const [offices, docs, edu, langs] = await Promise.all([
      s.Office.filter({ specialist_id: specialistId }),
      s.SpecialistDocument.filter({ specialist_id: specialistId, document_type: 'cedula_profesional' }),
      s.SpecialistEducation.filter({ specialist_id: specialistId }),
      s.SpecialistLanguage.filter({ specialist_id: specialistId }),
    ]);

    const wordCount = (sp.description || '').trim().split(/\s+/).filter(Boolean).length;

    // 9 criterios de completitud
    const criteria = [
      !!sp.full_name,
      !!sp.professional_license_number,
      wordCount >= 50,
      !!sp.specialty,
      offices.length > 0,
      docs.length > 0,
      edu.length > 0,
      langs.length > 0,
      !!sp.profile_photo,
    ];
    const completeness_score = Math.round((criteria.filter(Boolean).length / criteria.length) * 100);

    // Checklist SEO
    const hasZone = offices.some((o) => !!o.zone_id);
    const checklist = {
      has_optimized_title: !!(sp.full_name && sp.specialty),
      has_meta_description: !!((sp.description || '').trim().length > 0),
      has_specialty_zone_keywords: !!(sp.specialty && hasZone),
      has_alt_text_images: !!(sp.profile_photo || (sp.gallery && sp.gallery.length > 0)),
      has_min_word_biography: wordCount >= 50,
    };
    const seo_score = Math.round(Object.values(checklist).filter(Boolean).length / 5 * 100);

    await s.Specialist.update(specialistId, { completeness_score, seo_score });

    const existing = await s.SpecialistSeoChecklist.filter({ specialist_id: specialistId });
    if (existing.length > 0) {
      await s.SpecialistSeoChecklist.update(existing[0].id, checklist);
    } else {
      await s.SpecialistSeoChecklist.create({ specialist_id: specialistId, ...checklist });
    }

    return Response.json({ completeness_score, seo_score, checklist });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});