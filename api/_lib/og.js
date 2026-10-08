// Ayudantes de las vistas previas al compartir (api/og.js y api/og-image.js).
// Corren en el servidor de Vercel, no en el navegador. Solo leen datos PÚBLICOS:
// usan la llave anon de Supabase, así que la base de datos misma garantiza que
// un perfil que no está publicado y activo (borrador, en revisión, en pausa,
// armado por el equipo sin reclamar) nunca devuelve nada.
import { buildProfileMetaText } from "../../src/lib/profileMeta.js";

export const SITE = "https://buscoundoctor.com";
export const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://iiklgyzyvbrtrxjfucoc.supabase.co";
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "";

export const PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/`;

// ¿La foto del perfil es de nuestro Storage público? (la única que se procesa; ver og-image.js)
export const hasUsablePhoto = (s) => !!s?.profile_photo && s.profile_photo.startsWith(PUBLIC_PREFIX);

export const GENERIC = {
  title: "BuscoUnDoctor — Directorio Médico Verificado en Monterrey",
  description:
    "El directorio médico verificado de Monterrey y San Pedro Garza García: compara perfiles con cédula profesional verificada, reseñas reales y contacta directo por WhatsApp.",
};

export const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");


async function rest(path, extraHeaders = {}) {
  if (!ANON_KEY) throw new Error("sin llave anon");
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, ...extraHeaders },
    signal: AbortSignal.timeout(5000),
  });
}

export const validSlug = (slug) => /^[a-z0-9][a-z0-9-]{0,150}$/.test(slug || "");

// Devuelve null si el perfil no existe o no es público (la base lo filtra sola).
export async function loadPublicSpecialist(slug) {
  if (!validSlug(slug)) return null;
  const cols = "id,full_name,slug,specialty,zone,location,description,rating,profile_photo,updated_date,license_verification_status";
  const r = await rest(`specialist?slug=eq.${encodeURIComponent(slug)}&select=${cols}&limit=1`);
  if (!r.ok) return null;
  const rows = await r.json();
  return rows[0] || null;
}

// Mismas reglas de texto que la página del perfil: viven en src/lib/profileMeta.js (un solo lugar).
export async function buildProfileMeta(s) {
  let specialtyDisplay = null;
  let reviewCount = 0;
  try {
    const [sp, rv] = await Promise.all([
      rest(`specialty?name=eq.${encodeURIComponent(s.specialty || "")}&select=display_name&limit=1`),
      rest(`review?specialist_id=eq.${s.id}&approved=eq.true&select=id`, { Range: "0-0", Prefer: "count=exact" }),
    ]);
    if (sp.ok) { const row = (await sp.json())[0]; if (row?.display_name) specialtyDisplay = row.display_name; }
    const range = rv.headers.get("content-range") || "";
    reviewCount = Number(range.split("/")[1]) || 0;
  } catch { /* texto sin esos extras */ }

  return buildProfileMetaText({
    fullName: s.full_name,
    specialty: s.specialty,
    specialtyDisplay,
    zone: s.zone,
    location: s.location,
    description: s.description,
    rating: s.rating,
    reviewCount,
    verified: s.license_verification_status === "verified",
  });
}

export function renderHtml({ title, description, url, image, imageAlt, heading, bodyText, noindex, imageWidth = 1200, imageHeight = 630, ogTitle }) {
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
${noindex ? '<meta name="robots" content="noindex, nofollow" />\n' : ""}<link rel="canonical" href="${esc(url)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="BuscoUnDoctor" />
<meta property="og:locale" content="es_MX" />
<meta property="og:title" content="${esc(ogTitle || title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${esc(url)}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:image:type" content="image/jpeg" />
<meta property="og:image:width" content="${imageWidth}" />
<meta property="og:image:height" content="${imageHeight}" />
<meta property="og:image:alt" content="${esc(imageAlt)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(ogTitle || title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(image)}" />
</head><body>
<h1>${esc(heading)}</h1>
<p>${esc(bodyText)}</p>
<p><a href="${esc(url)}">Ver en BuscoUnDoctor</a></p>
</body></html>`;
}
