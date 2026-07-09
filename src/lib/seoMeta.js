// Open Graph / Twitter card helpers for client-side meta tag management.

const DEFAULT_OG_IMAGE = "https://media.base44.com/images/public/69daf616236dcba44672309d/cc72aad07_generated_image.png";

// Generic site-level fallback values (applied by the global Layout).
export const SITE_OG = {
  title: "BuscoUnDoctor — Directorio Médico Verificado en Monterrey",
  description: "Encuentra especialistas verificados en Monterrey y San Pedro Garza García. Busca por especialidad y zona, compara perfiles con cédula profesional verificada y contacta directo.",
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

// Override specific OG tags from a page (title/description/image).
// og:type and twitter:card are left at the site defaults; Twitter falls back
// to the og:* tags for title/description/image, so the card stays coherent.
export function setOpenGraph({ title, description, image }) {
  if (title !== undefined) upsertMeta("property", "og:title", title);
  if (description !== undefined) upsertMeta("property", "og:description", description);
  if (image !== undefined) upsertMeta("property", "og:image", image);
}