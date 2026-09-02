// Open Graph / Twitter card helpers for client-side meta tag management.

const DEFAULT_OG_IMAGE = "https://media.base44.com/images/public/69daf616236dcba44672309d/cc72aad07_generated_image.png";

// Generic site-level fallback values (applied by the global Layout).
export const SITE_OG = {
  title: "BuscoUnDoctor — Directorio Médico Verificado en Monterrey",
  description: "BuscoUnDoctor es el directorio médico verificado de Monterrey y San Pedro Garza García: encuentra especialistas por especialidad y zona, compara perfiles con cédula profesional verificada y reseñas reales, y contacta directo por WhatsApp.",
  image: DEFAULT_OG_IMAGE,
  type: "website",
  twitterCard: "summary_large_image",
};

function upsertMeta(attr, key, content) {
  if (content === undefined || content === null || content === "") return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

// Apply the full set of default OG + twitter tags. Re-applied on every route
// change by the Layout so stale per-page overrides don't leak across views.
export function applyDefaultOG() {
  upsertMeta("property", "og:title", SITE_OG.title);
  upsertMeta("property", "og:description", SITE_OG.description);
  upsertMeta("property", "og:image", SITE_OG.image);
  upsertMeta("property", "og:type", SITE_OG.type);
  upsertMeta("name", "twitter:card", SITE_OG.twitterCard);
}

// Override specific OG tags from a page (title/description/image/url).
// og:type y twitter:card se quedan en los valores del sitio. Twitter/X lee
// primero sus propias etiquetas twitter:title/description/image si existen
// (no cae a las og:* automáticamente en todos los casos), así que aquí se
// escriben ambos juegos con el mismo contenido para que la tarjeta se vea
// igual en Facebook, WhatsApp, LinkedIn y X. og:image:alt ayuda a lectores
// de pantalla y a algunos crawlers que lo usan como texto de respaldo.
export function setOpenGraph({ title, description, image, imageAlt, url }) {
  if (title !== undefined) {
    upsertMeta("property", "og:title", title);
    upsertMeta("name", "twitter:title", title);
  }
  if (description !== undefined) {
    upsertMeta("property", "og:description", description);
    upsertMeta("name", "twitter:description", description);
  }
  if (image !== undefined) {
    upsertMeta("property", "og:image", image);
    upsertMeta("name", "twitter:image", image);
  }
  if (imageAlt !== undefined) upsertMeta("property", "og:image:alt", imageAlt);
  if (url !== undefined) upsertMeta("property", "og:url", url);
}

const SITE_ORIGIN = "https://buscoundoctor.com";

// Actualiza (o crea) el <link rel="canonical"> del documento. index.html trae
// uno fijo apuntando a "/" como valor por defecto estático; esta función toma
// el control de ese mismo tag en cuanto React monta, y lo actualiza en cada
// cambio de ruta. Por defecto usa la ruta actual sin query string ni hash,
// para que las variantes filtradas (ej. /especialistas?specialty=X) apunten
// a la versión limpia de la página en vez de indexarse como páginas aparte.
// Las páginas que necesiten algo distinto (ej. el blog, que ya arma su
// propio canonical tras cargar el post) pueden llamarla de nuevo después
// con una ruta explícita, y esa llamada posterior gana.
export function setCanonical(pathname) {
  const clean = (pathname || "/").split("?")[0].split("#")[0];
  const href = clean === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${clean}`;
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}