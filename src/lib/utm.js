// Parámetros utm_* de la dirección actual, como texto listo para pegar en otro enlace ("utm_source=tiktok&…"),
// sin ningún otro parámetro. Vacío si no hay. Lo usan los botones de /<especialidad> y el carrusel de categorías
// del inicio para que la medición siga viendo de dónde vino la visita (p. ej. TikTok).
export function utmQuery(search) {
  return new URLSearchParams([...new URLSearchParams(search || "")].filter(([k]) => k.toLowerCase().startsWith("utm_"))).toString();
}

// Agrega los utm_* a un enlace interno que ya puede traer su propia "?…".
export function withUtm(to, utm) {
  if (!utm) return to;
  return `${to}${to.includes("?") ? "&" : "?"}${utm}`;
}
