// Plantilla de las landings /recomendados/:especialidad (2026-11-01, pedido de David). La llave es el
// `profession_slug` del catálogo (la ruta); `slug` es `specialty.slug`, que la ruta también acepta y redirige a la
// llave. Textos: `plural` en títulos, `lower` dentro de frases ("recomendaciones de dentistas"), `your` en
// "Sé el primero en recomendar a tu dentista" y `my` en el botón "Recomendar a mi dentista".
// Solo estas 10 tienen página; cualquier otra especialidad da "no encontrada".
// `title`, `from` y `to` (2026-11-02): nombre y color de su tarjeta en el carrusel "Recomendados por especialidad"
// del inicio. Hex EXACTOS de la paleta Pantone de David (Delicate Blue, Flushing Pink, Fall Fantasy, Ice Green,
// Atomizer, Coral Chic, Orchid Bloom, Green Glow, Hot Pink, Sunshine), sin ajustar. Color plano (`from` = `to`): con un
// degradado 4% más oscuro, Endocrinólogo bajaba a 4.41:1. Las tarjetas son de "vidrio claro" (HomeCategorySlider.jsx):
// este hex al 74% con desenfoque, o al 100% como respaldo sólido. Texto en BLANCO por decisión de David (2026-11-02),
// sabiendo que NO llega a 4.5:1; medido en el navegador sobre el fondo real (peor píxel bajo el texto): Médico General
// 1.37 · Ginecólogo 1.36 · Pediatra 1.96 · Dentista 1.54 · Dermatólogo 1.49 · Cardiólogo 2.07 · Psicólogo 1.77 ·
// Nutriólogo 1.64 · Endocrinólogo 2.66 · Gastroenterólogo 1.30. Con texto azul marino (brand.navy) pasaban todas (de
// 6.73 a 12.31 con el vidrio al 62%). Excepción deliberada a la regla de tokens de CLAUDE.md §11: los colores van aquí
// como datos.
const ENTRIES = [
  ["medico-general", { title: "Médico General", from: "#c4dbe9", to: "#c4dbe9", slug: "medicina-general", plural: "Médicos generales", lower: "médicos generales", your: "tu médico general", my: "mi médico general" }],
  ["ginecologo", { title: "Ginecólogo", from: "#fdccdd", to: "#fdccdd", slug: "ginecologia", plural: "Ginecólogos", lower: "ginecólogos", your: "tu ginecólogo", my: "mi ginecólogo" }],
  ["pediatra", { title: "Pediatra", from: "#ff9225", to: "#ff9225", slug: "pediatria", plural: "Pediatras", lower: "pediatras", your: "tu pediatra", my: "mi pediatra" }],
  ["dentista", { title: "Dentista", from: "#86d8c2", to: "#86d8c2", slug: "dentista", plural: "Dentistas", lower: "dentistas", your: "tu dentista", my: "mi dentista" }],
  ["dermatologo", { title: "Dermatólogo", from: "#9bd5ec", to: "#9bd5ec", slug: "dermatologia", plural: "Dermatólogos", lower: "dermatólogos", your: "tu dermatólogo", my: "mi dermatólogo" }],
  ["cardiologo", { title: "Cardiólogo", from: "#ff8270", to: "#ff8270", slug: "cardiologia", plural: "Cardiólogos", lower: "cardiólogos", your: "tu cardiólogo", my: "mi cardiólogo" }],
  ["psicologo", { title: "Psicólogo", from: "#c6add0", to: "#c6add0", slug: "psicologia", plural: "Psicólogos", lower: "psicólogos", your: "tu psicólogo", my: "mi psicólogo" }],
  ["nutriologo", { title: "Nutriólogo", from: "#afca65", to: "#afca65", slug: "nutricion", plural: "Nutriólogos", lower: "nutriólogos", your: "tu nutriólogo", my: "mi nutriólogo" }],
  ["endocrinologo", { title: "Endocrinólogo", from: "#e85a83", to: "#e85a83", slug: "endocrinologia", plural: "Endocrinólogos", lower: "endocrinólogos", your: "tu endocrinólogo", my: "mi endocrinólogo" }],
  ["gastroenterologo", { title: "Gastroenterólogo", from: "#f8de85", to: "#f8de85", slug: "gastroenterologia", plural: "Gastroenterólogos", lower: "gastroenterólogos", your: "tu gastroenterólogo", my: "mi gastroenterólogo" }],
];

export const SPECIALTY_LANDINGS = Object.fromEntries(ENTRIES.map(([key, v]) => [key, { key, ...v }]));

// Busca por profession_slug (la llave) o por specialty.slug. Devuelve siempre el mismo objeto, o null.
export function findSpecialtyLanding(param) {
  const p = String(param || "").toLowerCase();
  return SPECIALTY_LANDINGS[p] || Object.values(SPECIALTY_LANDINGS).find((x) => x.slug === p) || null;
}
