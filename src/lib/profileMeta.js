// Textos de un perfil de médico para el <title>, la descripción y la tarjeta que se ve al
// compartirlo (WhatsApp, Facebook…). UN solo lugar, sin imports: lo usan la página del perfil
// (SpecialistProfile.jsx) y la función del servidor que arma la tarjeta (api/_lib/og.js).
// CLAUDE.md §8p.

export const isFemaleName = (fullName) => /^\s*(dra\.?|doctora)\s/i.test(fullName || "");

// Pasa el nombre "como lo busca el paciente" del catálogo a femenino cuando el médico se
// presenta como "Dra." (Cardiólogo → Cardióloga, Cirujano Plástico → Cirujana Plástica, Médico
// General → Médica General). Las que ya sirven para ambos (Pediatra, Dentista, Psiquiatra,
// Internista…) no cambian porque no terminan en "o". Revisado con las 64 especialidades del
// catálogo. Si el nombre no es "Dra.", se deja tal cual.
export function genderSpecialty(display, fullName) {
  if (!display || !isFemaleName(fullName)) return display;
  return display
    .split(" ")
    .map((w) => (w.length > 2 && /o$/i.test(w) ? w.slice(0, -1) + (w.endsWith("O") ? "A" : "a") : w))
    .join(" ");
}

const plain = (s) => String(s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

// Recorta a `max` letras en un límite de palabra y agrega "…" (antes se cortaba a media frase).
export function truncateText(text, max = 160) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max - 40 ? cut.slice(0, lastSpace) : cut;
  return base.replace(/[\s,;:.\-–—]+$/, "") + "…";
}

// fullName, specialty (nombre formal), specialtyDisplay (nombre del catálogo "como lo busca el
// paciente"), zone/location, description (la que escribió el doctor), rating, reviewCount
// (reseñas aprobadas) y verified (license_verification_status === "verified").
export function buildProfileMetaText({ fullName, specialty, specialtyDisplay, zone, location, description, rating, reviewCount, verified }) {
  const zoneLabel = zone || location || "Monterrey";
  const specialtyName = genderSpecialty(specialtyDisplay || specialty || "Especialista", fullName);
  const brand = "BuscoUnDoctor";
  const cardTitle = `${fullName} — ${specialtyName} en ${zoneLabel}`;
  const title = `${cardTitle} | ${brand}`;

  const ratingPrefix = reviewCount > 0 && rating
    ? `⭐ ${Number(rating).toFixed(1)} (${reviewCount} reseña${reviewCount !== 1 ? "s" : ""}) · `
    : "";
  // El texto genérico usa el nombre formal ("Especialista en Cardiología") y solo dice
  // "cédula verificada" cuando de verdad lo está.
  const formal = specialty || "su especialidad";
  const fallback = `Especialista en ${formal} en ${zoneLabel}.${verified ? " Cédula profesional verificada." : ""} Contacta directo y agenda tu cita.`;
  const base = plain(description) || fallback;
  return {
    title,
    cardTitle,
    description: truncateText(`${ratingPrefix}${base}`, 160),
    specialtyName,
    zoneLabel,
  };
}
