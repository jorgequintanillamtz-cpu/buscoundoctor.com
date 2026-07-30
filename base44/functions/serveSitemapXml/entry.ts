import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const ORIGIN = "https://buscoundoctor.com";

    const esc = (s) => String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    const slugify = (s) => (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    const [specialties, zones, specialists, posts, conditions] = await Promise.all([
      base44.asServiceRole.entities.Specialty.filter({ active: true }),
      base44.asServiceRole.entities.Zone.filter({ active: true }),
      base44.asServiceRole.entities.Specialist.filter({ publication_status: 'published' }),
      base44.asServiceRole.entities.BlogPost.filter({ published: true }),
      base44.asServiceRole.entities.Condition.filter({ active: true }),
    ]);

    const specByName = {};
    specialties.forEach((s) => { specByName[s.name] = s.slug; });
    const zoneByName = {};
    zones.forEach((z) => { zoneByName[z.name] = slugify(z.name); });

    const urls = [];

    // 1) Páginas estáticas
    const staticPaths = ["/", "/especialistas", "/blog", "/nosotros", "/contacto", "/preguntas-frecuentes", "/planes", "/para-medicos"];
    staticPaths.forEach((p) => urls.push({ loc: ORIGIN + p, priority: "1.0", changefreq: "weekly" }));

    // 2) Especialidades publicadas -> /especialidad/:slug
    specialties.forEach((s) => {
      if (s.slug) urls.push({ loc: `${ORIGIN}/especialidad/${s.slug}`, priority: "0.8", changefreq: "weekly" });
    });

    // 3) Combinaciones especialidad + zona con >=1 médico publicado -> /especialidad/:slug/:zonaSlug
    const comboSet = new Set();
    specialists.forEach((sp) => {
      const specSlug = specByName[sp.specialty];
      const zoneName = sp.zone || sp.location;
      const zoneSlug = zoneByName[zoneName];
      if (specSlug && zoneSlug) comboSet.add(`${specSlug}/${zoneSlug}`);
    });
    Array.from(comboSet).forEach((combo) => {
      urls.push({ loc: `${ORIGIN}/especialidad/${combo}`, priority: "0.7", changefreq: "weekly" });
    });

    // 4) Especialistas publicados -> /especialista/:slug
    specialists.forEach((sp) => {
      if (sp.slug) urls.push({ loc: `${ORIGIN}/especialista/${sp.slug}`, priority: "0.7", changefreq: "weekly" });
    });

    // 5) Blog posts publicados -> /blog/:slug
    posts.forEach((p) => {
      if (p.slug) urls.push({ loc: `${ORIGIN}/blog/${p.slug}`, priority: "0.6", changefreq: "weekly" });
    });

    // 6) Enfermedades con contenido revisado/publicado -> /enfermedades/:slug
    // Las que están en "borrador" (o sin content_status, catálogo viejo sin contenido)
    // se dejan fuera a propósito: la página las marca noindex hasta que alguien las revise.
    conditions.forEach((c) => {
      if (c.slug && (c.content_status === 'revisado' || c.content_status === 'publicado')) {
        urls.push({ loc: `${ORIGIN}/enfermedades/${c.slug}`, priority: "0.7", changefreq: "monthly" });
      }
    });

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map((u) =>
        `  <url>\n` +
        `    <loc>${esc(u.loc)}</loc>\n` +
        `    <changefreq>${u.changefreq}</changefreq>\n` +
        `    <priority>${u.priority}</priority>\n` +
        `  </url>`
      ).join("\n") +
      `\n</urlset>\n`;

    console.log("SITEMAP_COUNTS", JSON.stringify({
      estaticas: staticPaths.length,
      especialidades: specialties.length,
      combinaciones: comboSet.size,
      especialistas: specialists.length,
      blogPosts: posts.length,
      enfermedades: conditions.filter(c => c.content_status === 'revisado' || c.content_status === 'publicado').length,
      total: urls.length,
    }));

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("SITEMAP_ERROR", error.message);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      { status: 500, headers: { "Content-Type": "application/xml; charset=utf-8" } }
    );
  }
});