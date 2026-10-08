import { SITE, GENERIC, loadPublicSpecialist, buildProfileMeta, renderHtml, validSlug } from "./_lib/og.js";

// Vista previa al compartir un perfil (WhatsApp, Facebook, iMessage, Telegram, LinkedIn,
// X, Slack, Discord). Esas apps leen la página SIN ejecutar código, y el sitio es una
// aplicación que arma el título y la foto después de cargar, así que veían siempre la
// tarjeta genérica del inicio. vercel.json manda aquí SOLO las visitas de esas apps
// (por su user-agent) a /especialista/:slug; las personas y Google reciben el sitio normal.
// CLAUDE.md §8p.
export default async function handler(req, res) {
  const slug = String(req.query.slug || "").toLowerCase();
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");

  let page = null;
  try {
    if (validSlug(slug)) {
      const s = await loadPublicSpecialist(slug);
      if (s) {
        const meta = await buildProfileMeta(s);
        const v = s.updated_date ? Date.parse(s.updated_date) || 0 : 0;
        page = renderHtml({
          title: meta.title,
          description: meta.description,
          url: `${SITE}/especialista/${s.slug}`,
          image: `${SITE}/api/og-image?slug=${encodeURIComponent(s.slug)}&v=${v}`,
          imageAlt: `${s.full_name}, ${meta.specialtyName} en ${meta.zoneLabel}`,
          heading: s.full_name,
          bodyText: meta.description,
        });
      }
    }
  } catch { /* cae a la tarjeta genérica */ }

  // Perfil inexistente, no publicado o error: tarjeta genérica del sitio (sin datos del doctor).
  res.status(200).send(
    page ||
      renderHtml({
        title: GENERIC.title,
        description: GENERIC.description,
        url: `${SITE}/`,
        image: `${SITE}/api/og-image`,
        imageAlt: "BuscoUnDoctor",
        heading: "BuscoUnDoctor",
        bodyText: GENERIC.description,
      })
  );
}
