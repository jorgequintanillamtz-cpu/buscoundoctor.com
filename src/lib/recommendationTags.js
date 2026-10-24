// Etiquetas de las recomendaciones de pacientes (CLAUDE.md §8r). Los valores (`v`) deben ser
// EXACTAMENTE los que acepta la función `submit_recommendation` de la base de datos.
export const RECOMMENDATION_TAGS = [
  { v: "explica_claro", label: "Explica con claridad" },
  { v: "puntual", label: "Puntual" },
  { v: "buen_trato", label: "Buen trato" },
  { v: "instalaciones_limpias", label: "Instalaciones limpias" },
  { v: "precio_justo", label: "Precio justo" },
  { v: "resolvio_problema", label: "Resolvió mi problema" },
];

export const recommendationTagLabel = (v) => RECOMMENDATION_TAGS.find((t) => t.v === v)?.label || v;
