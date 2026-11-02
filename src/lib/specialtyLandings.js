// Plantilla de las landings /recomendados/:especialidad (2026-11-01, pedido de David). La llave es el
// `profession_slug` del catálogo (la ruta); `slug` es `specialty.slug`, que la ruta también acepta y redirige a la
// llave. Textos: `plural` en títulos, `lower` dentro de frases ("recomendaciones de dentistas"), `your` en
// "Sé el primero en recomendar a tu dentista" y `my` en el botón "Recomendar a mi dentista".
// Solo estas 10 tienen página; cualquier otra especialidad da "no encontrada".
const ENTRIES = [
  ["medico-general", { slug: "medicina-general", plural: "Médicos generales", lower: "médicos generales", your: "tu médico general", my: "mi médico general" }],
  ["ginecologo", { slug: "ginecologia", plural: "Ginecólogos", lower: "ginecólogos", your: "tu ginecólogo", my: "mi ginecólogo" }],
  ["pediatra", { slug: "pediatria", plural: "Pediatras", lower: "pediatras", your: "tu pediatra", my: "mi pediatra" }],
  ["dentista", { slug: "dentista", plural: "Dentistas", lower: "dentistas", your: "tu dentista", my: "mi dentista" }],
  ["dermatologo", { slug: "dermatologia", plural: "Dermatólogos", lower: "dermatólogos", your: "tu dermatólogo", my: "mi dermatólogo" }],
  ["cardiologo", { slug: "cardiologia", plural: "Cardiólogos", lower: "cardiólogos", your: "tu cardiólogo", my: "mi cardiólogo" }],
  ["psicologo", { slug: "psicologia", plural: "Psicólogos", lower: "psicólogos", your: "tu psicólogo", my: "mi psicólogo" }],
  ["nutriologo", { slug: "nutricion", plural: "Nutriólogos", lower: "nutriólogos", your: "tu nutriólogo", my: "mi nutriólogo" }],
  ["endocrinologo", { slug: "endocrinologia", plural: "Endocrinólogos", lower: "endocrinólogos", your: "tu endocrinólogo", my: "mi endocrinólogo" }],
  ["gastroenterologo", { slug: "gastroenterologia", plural: "Gastroenterólogos", lower: "gastroenterólogos", your: "tu gastroenterólogo", my: "mi gastroenterólogo" }],
];

export const SPECIALTY_LANDINGS = Object.fromEntries(ENTRIES.map(([key, v]) => [key, { key, ...v }]));

// Busca por profession_slug (la llave) o por specialty.slug. Devuelve siempre el mismo objeto, o null.
export function findSpecialtyLanding(param) {
  const p = String(param || "").toLowerCase();
  return SPECIALTY_LANDINGS[p] || Object.values(SPECIALTY_LANDINGS).find((x) => x.slug === p) || null;
}
