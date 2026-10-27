import { SITE, GENERIC, loadPublicSpecialist, loadRecommendedDoctor, buildProfileMeta, renderHtml, validSlug, hasUsablePhoto } from "./_lib/og.js";

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

  // Enlace para reclamar un perfil armado por el equipo (/reclamar/:token, CLAUDE.md §8o):
  // tarjeta fija con el logo. NO consulta la base ni muestra ningún dato del doctor: el
  // perfil es privado y el enlace puede reenviarse; el token solo se repite en la dirección.
  if (req.query.tipo === "reclamar") {
    const token = String(req.query.token || "");
    const url = /^[A-Za-z0-9_-]{20,80}$/.test(token) ? `${SITE}/reclamar/${token}` : `${SITE}/`;
    res.status(200).send(
      renderHtml({
        title: "Reclama tu perfil en BuscoUnDoctor",
        description: "Armamos tu perfil médico en el directorio verificado de Monterrey y San Pedro. Reclámalo en un minuto con tu cuenta.",
        url,
        image: `${SITE}/api/og-image`,
        imageAlt: "BuscoUnDoctor",
        heading: "Reclama tu perfil en BuscoUnDoctor",
        bodyText: "Armamos tu perfil médico en el directorio verificado de Monterrey y San Pedro.",
        noindex: true,
      })
    );
    return;
  }

  // Doctor recomendado por pacientes (/recomendado/:slug): tarjeta con su nombre y cuántos pacientes lo recomiendan,
  // con el logo (nunca su foto: es un perfil sin verificar). Perfil sin verificar = lo dice la descripción.
  if (req.query.tipo === "recomendado") {
    let card = null;
    try {
      const d = await loadRecommendedDoctor(slug);
      if (d) {
        const n = Number(d.count) || 0;
        const where = [d.specialty, d.zone].filter(Boolean).join(" en ");
        card = renderHtml({
          title: `${d.full_name}${where ? ` — ${where}` : ""} | BuscoUnDoctor`,
          ogTitle: `${d.full_name}${d.specialty ? ` — ${d.specialty}` : ""}`,
          description: `${n} ${n === 1 ? "paciente recomienda" : "pacientes recomiendan"} a ${d.full_name}. Perfil sin verificar: son opiniones de pacientes, no una valoración médica.`,
          url: `${SITE}/recomendado/${d.slug}`,
          image: `${SITE}/api/og-image`,
          imageAlt: "BuscoUnDoctor",
          heading: d.full_name,
          bodyText: `${n} ${n === 1 ? "paciente recomienda" : "pacientes recomiendan"} a ${d.full_name}.`,
          noindex: !d.indexable,
        });
      }
    } catch { /* cae a la tarjeta genérica */ }
    res.status(200).send(
      card ||
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
    return;
  }

  let page = null;
  try {
    if (validSlug(slug)) {
      const s = await loadPublicSpecialist(slug);
      if (s) {
        const meta = await buildProfileMeta(s);
        const v = s.updated_date ? Date.parse(s.updated_date) || 0 : 0;
        page = renderHtml({
          title: meta.title,
          ogTitle: meta.cardTitle, // la tarjeta no repite "| BuscoUnDoctor": WhatsApp ya muestra el dominio
          description: meta.description,
          url: `${SITE}/especialista/${s.slug}`,
          // d = versión del diseño de la imagen: al cambiarlo, CDN y apps de mensajes la vuelven a pedir.
          image: `${SITE}/api/og-image?slug=${encodeURIComponent(s.slug)}&v=${v}&d=3`,
          // con foto la imagen es cuadrada (1200×1200); sin foto, la tarjeta del logo (1200×630)
          imageHeight: hasUsablePhoto(s) ? 1200 : 630,
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
