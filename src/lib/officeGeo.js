// Utilidades para ubicar consultorios en el mapa.
//
// Fuente de coordenadas, en orden de preferencia:
// 1) lat/lng ya guardados en el registro (más rápido, sin llamadas de red).
// 2) el enlace de Google Maps, SOLO si es un enlace largo de escritorio que
//    trae "@lat,lng" en la URL (los enlaces cortos "compartir" de celular,
//    tipo maps.app.goo.gl, NO traen coordenadas visibles y no se pueden leer
//    así).
// 3) geocodificar la dirección de texto con Nominatim (OpenStreetMap), que
//    es gratuito y no requiere llave de API. Este es el método que sí
//    funciona sin importar el formato del enlace que haya pegado el médico.

const GEOCODE_CACHE_KEY = "busco_geocode_cache_v1";

function readCache() {
  try {
    return JSON.parse(sessionStorage.getItem(GEOCODE_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeCache(cache) {
  try {
    sessionStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // sessionStorage no disponible o llena: no es crítico, seguimos sin cache.
  }
}

export function extractCoordsFromMapsUrl(mapsUrl) {
  if (!mapsUrl) return null;
  const match = mapsUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { latitude: lat, longitude: lng };
}

/**
 * Geocodifica una dirección de texto usando Nominatim (OpenStreetMap).
 * Devuelve { latitude, longitude } o null si no se encontró nada.
 * Usa un cache en sessionStorage para no repetir la misma consulta varias
 * veces durante la misma visita (Nominatim pide uso moderado: ~1 solicitud
 * por segundo).
 */
export async function geocodeAddress(query) {
  if (!query || !query.trim()) return null;
  const cache = readCache();
  if (cache[query]) return cache[query];

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=mx&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data[0]) return null;
    const result = { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    if (Number.isNaN(result.latitude) || Number.isNaN(result.longitude)) return null;
    cache[query] = result;
    writeCache(cache);
    return result;
  } catch {
    return null;
  }
}

/**
 * Arma la cadena de búsqueda para geocodificar un consultorio: dirección +
 * zona + ciudad + estado, para que Nominatim ubique bien el punto dentro del
 * área metropolitana de Monterrey.
 */
export function buildGeocodeQuery({ addressLine, zoneName, city, state }) {
  const parts = [
    addressLine,
    zoneName,
    city || "Monterrey",
    state || "Nuevo León",
    "México",
  ].filter(Boolean);
  return parts.join(", ");
}

/**
 * Resuelve coordenadas para un consultorio probando, en orden: lat/lng ya
 * guardados, el enlace de Maps (si trae "@lat,lng"), y geocodificación por
 * dirección como último recurso.
 */
export async function resolveOfficeCoords(office, { zoneName, city, state } = {}) {
  if (office.latitude != null && office.longitude != null) {
    return { latitude: office.latitude, longitude: office.longitude, source: "cached" };
  }
  const fromUrl = extractCoordsFromMapsUrl(office.maps_url);
  if (fromUrl) return { ...fromUrl, source: "maps_url" };

  const query = buildGeocodeQuery({ addressLine: office.address_line, zoneName, city, state });
  const geocoded = await geocodeAddress(query);
  if (geocoded) return { ...geocoded, source: "geocoded" };

  return null;
}
