// Configuración y utilidades de Google Maps.
//
// La llave del navegador NO es secreta: se protege en Google Cloud con
// restricción de sitios (buscoundoctor.com) y de APIs. Si no hay llave
// configurada (ej. desarrollo local sin .env), el sitio sigue funcionando:
// las direcciones se escriben a mano y el mapa muestra un aviso.

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// Los marcadores avanzados exigen un Map ID; "DEMO_MAP_ID" es el de pruebas
// de Google y sirve como respaldo hasta configurar el propio.
export const GOOGLE_MAP_ID = import.meta.env.VITE_GOOGLE_MAP_ID || "DEMO_MAP_ID";

export const hasGoogleMaps = Boolean(GOOGLE_MAPS_API_KEY);

// Centro por defecto: Monterrey / San Pedro Garza García
export const MTY_CENTER = { lat: 25.6714, lng: -100.3096 };

function component(components, type) {
  return components?.find((c) => c.types?.includes(type));
}

/**
 * Convierte un Place (Places API New, ya con fetchFields) en los campos de
 * dirección que usa el registro y el panel.
 */
export function parsePlace(place) {
  const comps = place.addressComponents || [];
  const location = place.location;
  const lat = typeof location?.lat === "function" ? location.lat() : location?.lat;
  const lng = typeof location?.lng === "function" ? location.lng() : location?.lng;
  const neighborhood =
    component(comps, "sublocality_level_1") ||
    component(comps, "sublocality") ||
    component(comps, "neighborhood");
  return {
    street: component(comps, "route")?.longText || "",
    ext_number: component(comps, "street_number")?.longText || "",
    neighborhood: neighborhood?.longText || "",
    postal_code: component(comps, "postal_code")?.longText || "",
    locality: component(comps, "locality")?.longText || "",
    formatted_address: place.formattedAddress || "",
    place_id: place.id || "",
    latitude: lat ?? null,
    longitude: lng ?? null,
  };
}

/** Enlace público "Abrir en Google Maps" para un punto exacto. */
export function buildPlaceMapsUrl({ latitude, longitude, place_id }) {
  if (latitude == null || longitude == null) return "";
  const base = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  return place_id ? `${base}&query_place_id=${encodeURIComponent(place_id)}` : base;
}

/** URL de la API Maps Embed (gratuita) para un punto exacto. */
export function buildEmbedUrl(latitude, longitude, zoom = 16) {
  if (!hasGoogleMaps || latitude == null || longitude == null) return "";
  return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${latitude},${longitude}&zoom=${zoom}&language=es`;
}
