// Plantilla de las landings /recomendados/:especialidad (2026-11-01, pedido de David). La llave es el
// `profession_slug` del catálogo (la ruta); `slug` es `specialty.slug`, que la ruta también acepta y redirige a la
// llave. Textos: `plural` en títulos, `lower` dentro de frases ("recomendaciones de dentistas"), `your` en
// "Sé el primero en recomendar a tu dentista" y `my` en el botón "Recomendar a mi dentista".
// Solo estas 10 tienen página; cualquier otra especialidad da "no encontrada".
// `title`, `from` y `to` (2026-11-02): nombre y degradado de su tarjeta en el carrusel "Recomendados por
// especialidad" del inicio. Excepción deliberada a la regla de tokens de CLAUDE.md §11: van aquí como datos para
// editarlos en un solo lugar. Contraste contra texto blanco (WCAG), `from` -> `to` (el `to` es 18% más oscuro):
// Médico General 6.70/8.82 · Ginecólogo 6.04/8.10 · Pediatra 5.18/7.03 · Dentista 5.47/7.40 · Dermatólogo 5.36/7.20 ·
// Cardiólogo 6.47/8.60 · Psicólogo 7.10/9.27 · Nutriólogo 5.02/6.89 · Endocrinólogo 10.36/12.47 ·
// Gastroenterólogo 7.09/9.21. Si cambias un color, mantén 4.5:1 o más en el más claro de los dos.
const ENTRIES = [
  ["medico-general", { title: "Médico General", from: "#1D4ED8", to: "#173FB1", slug: "medicina-general", plural: "Médicos generales", lower: "médicos generales", your: "tu médico general", my: "mi médico general" }],
  ["ginecologo", { title: "Ginecólogo", from: "#BE185D", to: "#9B134C", slug: "ginecologia", plural: "Ginecólogos", lower: "ginecólogos", your: "tu ginecólogo", my: "mi ginecólogo" }],
  ["pediatra", { title: "Pediatra", from: "#C2410C", to: "#9F3509", slug: "pediatria", plural: "Pediatras", lower: "pediatras", your: "tu pediatra", my: "mi pediatra" }],
  ["dentista", { title: "Dentista", from: "#0F766E", to: "#0C605A", slug: "dentista", plural: "Dentistas", lower: "dentistas", your: "tu dentista", my: "mi dentista" }],
  ["dermatologo", { title: "Dermatólogo", from: "#8A6416", to: "#715212", slug: "dermatologia", plural: "Dermatólogos", lower: "dermatólogos", your: "tu dermatólogo", my: "mi dermatólogo" }],
  ["cardiologo", { title: "Cardiólogo", from: "#B91C1C", to: "#971616", slug: "cardiologia", plural: "Cardiólogos", lower: "cardiólogos", your: "tu cardiólogo", my: "mi cardiólogo" }],
  ["psicologo", { title: "Psicólogo", from: "#6D28D9", to: "#5920B1", slug: "psicologia", plural: "Psicólogos", lower: "psicólogos", your: "tu psicólogo", my: "mi psicólogo" }],
  ["nutriologo", { title: "Nutriólogo", from: "#15803D", to: "#116832", slug: "nutricion", plural: "Nutriólogos", lower: "nutriólogos", your: "tu nutriólogo", my: "mi nutriólogo" }],
  ["endocrinologo", { title: "Endocrinólogo", from: "#1E3A8A", to: "#182F71", slug: "endocrinologia", plural: "Endocrinólogos", lower: "endocrinólogos", your: "tu endocrinólogo", my: "mi endocrinólogo" }],
  ["gastroenterologo", { title: "Gastroenterólogo", from: "#92400E", to: "#77340B", slug: "gastroenterologia", plural: "Gastroenterólogos", lower: "gastroenterólogos", your: "tu gastroenterólogo", my: "mi gastroenterólogo" }],
];

export const SPECIALTY_LANDINGS = Object.fromEntries(ENTRIES.map(([key, v]) => [key, { key, ...v }]));

// Busca por profession_slug (la llave) o por specialty.slug. Devuelve siempre el mismo objeto, o null.
export function findSpecialtyLanding(param) {
  const p = String(param || "").toLowerCase();
  return SPECIALTY_LANDINGS[p] || Object.values(SPECIALTY_LANDINGS).find((x) => x.slug === p) || null;
}
