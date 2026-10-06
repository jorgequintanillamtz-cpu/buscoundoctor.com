import { hasGoogleMaps, GOOGLE_MAPS_API_KEY, buildEmbedUrl, buildPlaceMapsUrl } from "@/lib/googleMaps";

// Páginas por hospital (CLAUDE.md §8n). Un hospital es una fila del catálogo
// `hospital` (lo administra el equipo en Catálogo médico → Hospitales); un
// consultorio se enlaza a él con office.hospital_id.

export const hospitalPath = (slug) => `/hospital/${slug}`;

// Texto de consulta para el mapa cuando el hospital todavía no tiene punto exacto.
const mapQuery = (h, zoneName) =>
  [h.name, h.address_line, zoneName || "Monterrey", "Nuevo León, México"].filter(Boolean).join(", ");

export function hospitalEmbedUrl(h, zoneName) {
  if (h.latitude != null && h.longitude != null) {
    const exact = buildEmbedUrl(h.latitude, h.longitude);
    if (exact) return exact;
    return `https://www.google.com/maps?q=${h.latitude},${h.longitude}&z=16&output=embed`;
  }
  const q = encodeURIComponent(mapQuery(h, zoneName));
  if (hasGoogleMaps) return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${q}&zoom=16&language=es`;
  return `https://www.google.com/maps?q=${q}&output=embed`;
}

export function hospitalMapsLink(h, zoneName) {
  if (h.latitude != null && h.longitude != null) return buildPlaceMapsUrl(h);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery(h, zoneName))}`;
}

// Teléfono para enlace tel: (solo dígitos; los de México van con +52).
export function hospitalTelHref(phone) {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `tel:+52${digits.slice(-10)}`;
}

// Un médico elige su hospital al capturar su consultorio, pero solo cuenta
// (y aparece en la página del hospital) cuando el EQUIPO lo confirma:
// office.hospital_status = 'pending' (por confirmar) | 'confirmed' | 'rejected'.
// La regla vive en la base de datos (trigger office_hospital_guard): el médico
// nunca puede fijar ni cambiar ese estado por su cuenta.
export const HOSPITAL_STATUS_UI = {
  pending: { label: "Por confirmar: revisaremos que atiendes aquí antes de mostrarte en la página del hospital.", tone: "text-amber-700 bg-amber-50" },
  confirmed: { label: "Confirmado: apareces en la página del hospital.", tone: "text-emerald-700 bg-emerald-50" },
  rejected: { label: "No pudimos confirmarlo. Revisa que sea el hospital correcto o escríbenos por WhatsApp.", tone: "text-red-700 bg-red-50" },
};

// Médicos visibles de un hospital: los consultorios de médicos publicados y
// activos ya llegan filtrados por la base de datos (office_select), así que
// basta quedarse con los CONFIRMADOS y cruzarlos con la lista pública de médicos.
export function specialistsAtHospital(hospitalId, offices, specialists) {
  const ids = new Set(
    offices.filter((o) => o.hospital_id === hospitalId && o.hospital_status === "confirmed").map((o) => o.specialist_id)
  );
  return specialists.filter((s) => ids.has(s.id));
}
