// Plantilla de las landings /recomendados/:especialidad (2026-11-01, pedido de David). La llave es el
// `profession_slug` del catálogo (la ruta); `slug` es `specialty.slug`, que la ruta también acepta y redirige a la
// llave. Textos: `plural` en títulos, `lower` dentro de frases ("recomendaciones de dentistas"), `your` en
// "Sé el primero en recomendar a tu dentista" y `my` en el botón "Recomendar a mi dentista".
// Solo estas 10 tienen página; cualquier otra especialidad da "no encontrada".
// `title`, `from` y `to` (2026-11-02): nombre y degradado de su tarjeta en el carrusel "Recomendados por
// especialidad" del inicio. Tonos pastel (paleta Pantone de David: Delicate Blue, Flushing Pink, Fall Fantasy, Ice Green,
// Atomizer, Coral Chic, Orchid Bloom, Green Glow, Hot Pink, Sunshine); el `to` es el mismo tono 6% más oscuro. El texto
// es azul marino de la marca (brand.navy #0B1E4D). Contraste del texto contra `from` / `to` (WCAG):
// Médico General 11.20/9.85 · Ginecólogo 11.24/9.90 · Pediatra 6.93/6.14 · Dentista 9.85/8.67 · Dermatólogo 9.93/8.72 ·
// Cardiólogo 6.45/5.73 · Psicólogo 7.95/7.00 · Nutriólogo 8.84/7.79 · Endocrinólogo 5.09/4.53 · Gastroenterólogo 11.96/10.51.
// Hot Pink (#D56383) se aclaró 8.5% (#D9708E) para que también el `to` pase 4.5:1. Si cambias un color, mantén 4.5:1 o
// más en los dos extremos. Excepción deliberada a la regla de tokens de CLAUDE.md §11: van aquí como datos.
const ENTRIES = [
  ["medico-general", { title: "Médico General", from: "#C8DAE7", to: "#BCCDD9", slug: "medicina-general", plural: "Médicos generales", lower: "médicos generales", your: "tu médico general", my: "mi médico general" }],
  ["ginecologo", { title: "Ginecólogo", from: "#F4CEDB", to: "#E5C2CE", slug: "ginecologia", plural: "Ginecólogos", lower: "ginecólogos", your: "tu ginecólogo", my: "mi ginecólogo" }],
  ["pediatra", { title: "Pediatra", from: "#EF9544", to: "#E18C40", slug: "pediatria", plural: "Pediatras", lower: "pediatras", your: "tu pediatra", my: "mi pediatra" }],
  ["dentista", { title: "Dentista", from: "#9AD7C2", to: "#91CAB6", slug: "dentista", plural: "Dentistas", lower: "dentistas", your: "tu dentista", my: "mi dentista" }],
  ["dermatologo", { title: "Dermatólogo", from: "#A6D2E6", to: "#9CC5D8", slug: "dermatologia", plural: "Dermatólogos", lower: "dermatólogos", your: "tu dermatólogo", my: "mi dermatólogo" }],
  ["cardiologo", { title: "Cardiólogo", from: "#EE8878", to: "#E08071", slug: "cardiologia", plural: "Cardiólogos", lower: "cardiólogos", your: "tu cardiólogo", my: "mi cardiólogo" }],
  ["psicologo", { title: "Psicólogo", from: "#C4AFD0", to: "#B8A4C4", slug: "psicologia", plural: "Psicólogos", lower: "psicólogos", your: "tu psicólogo", my: "mi psicólogo" }],
  ["nutriologo", { title: "Nutriólogo", from: "#B5C96F", to: "#AABD68", slug: "nutricion", plural: "Nutriólogos", lower: "nutriólogos", your: "tu nutriólogo", my: "mi nutriólogo" }],
  ["endocrinologo", { title: "Endocrinólogo", from: "#D9708E", to: "#CC6985", slug: "endocrinologia", plural: "Endocrinólogos", lower: "endocrinólogos", your: "tu endocrinólogo", my: "mi endocrinólogo" }],
  ["gastroenterologo", { title: "Gastroenterólogo", from: "#F2DE90", to: "#E3D187", slug: "gastroenterologia", plural: "Gastroenterólogos", lower: "gastroenterólogos", your: "tu gastroenterólogo", my: "mi gastroenterólogo" }],
];

export const SPECIALTY_LANDINGS = Object.fromEntries(ENTRIES.map(([key, v]) => [key, { key, ...v }]));

// Busca por profession_slug (la llave) o por specialty.slug. Devuelve siempre el mismo objeto, o null.
export function findSpecialtyLanding(param) {
  const p = String(param || "").toLowerCase();
  return SPECIALTY_LANDINGS[p] || Object.values(SPECIALTY_LANDINGS).find((x) => x.slug === p) || null;
}
