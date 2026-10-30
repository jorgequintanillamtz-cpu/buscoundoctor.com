// Etiquetas de las recomendaciones de pacientes (CLAUDE.md §8r). Los valores (`v`) deben ser
// EXACTAMENTE los que acepta la función `submit_recommendation` de la base de datos (y el tope de
// MAX_TAGS también se aplica ahí). Van agrupadas por tema para que sea fácil elegir; el paciente
// escoge hasta MAX_TAGS en total (así no se puede marcar todo y las etiquetas sí distinguen a un doctor).
// Solo cualidades positivas y generales: nada de promesas de curación ni de enfermedades concretas.
export const MAX_TAGS = 5;
// /recomendaciones-flow deja marcar varias opciones por tema: ahí el tope es 10 (2026-10-29, pedido de David).
// La base de datos acepta hasta 10; las otras páginas, con una opción por tema, nunca pasan de 5.
export const MAX_TAGS_FLOW = 10;
// Servicios por los que se recomienda (specialty_service): hasta 3 por recomendación; la base también lo exige.
export const MAX_SERVICES = 3;

export const RECOMMENDATION_SECTIONS = [
  { key: "doctor", label: "El doctor", tags: [
    { v: "explica_claro", label: "Explica con claridad" },
    { v: "escucha", label: "Escucha con atención" },
    { v: "buen_trato", label: "Buen trato" },
    { v: "resolvio_problema", label: "Resolvió mi problema" },
    { v: "da_seguimiento", label: "Da seguimiento" },
  ] },
  { key: "consultorio", label: "El consultorio", tags: [
    { v: "instalaciones_limpias", label: "Instalaciones limpias" },
    { v: "personal_amable", label: "Personal amable" },
    { v: "agendar_facil", label: "Agendar es fácil" },
    { v: "facil_llegar", label: "Fácil de llegar y estacionar" },
    { v: "acceso_silla_ruedas", label: "Acceso para silla de ruedas" },
  ] },
  { key: "tiempo", label: "Tiempo y puntualidad", tags: [
    { v: "puntual", label: "Puntual" },
    { v: "sin_prisa", label: "Me atendió sin prisa" },
    { v: "responde_whatsapp", label: "Responde rápido por WhatsApp" },
  ] },
  { key: "precio", label: "Precio de la consulta", tags: [
    { v: "precio_justo", label: "Precio justo" },
    { v: "acepta_seguros", label: "Acepta seguros" },
    { v: "da_factura", label: "Da factura" },
    { v: "facilidades_pago", label: "Facilidades de pago" },
  ] },
  { key: "para_quien", label: "Lo recomiendo para", tags: [
    { v: "para_ninos", label: "Niños" },
    { v: "para_adultos_mayores", label: "Adultos mayores" },
    { v: "para_hombres", label: "Hombres" },
    { v: "para_mujeres", label: "Mujeres" },
    { v: "para_embarazadas", label: "Embarazadas" },
    { v: "segunda_opinion", label: "Una segunda opinión" },
  ] },
];

// Etiquetas que existieron un momento (2026-10-26) y se quitaron por parecerse a otras: ya no se pueden
// elegir, pero si alguna llegó a guardarse se sigue leyendo bien.
const RETIRED_TAGS = {
  da_confianza: "Me dio confianza", responde_dudas: "Responde dudas después de la consulta",
  estacionamiento: "Hay estacionamiento", sala_espera_comoda: "Sala de espera cómoda", poca_espera: "Poca espera",
  precio_claro: "Precio claro desde el inicio", explica_opciones: "Explica las opciones de tratamiento",
  indicaciones_claras: "Indicaciones claras", resultados_esperados: "Resultados como me explicó",
  // Se quitó la sección "Tratamiento" completa (2026-10-26, pedido de Jorge).
  sin_tratamientos_innecesarios: "Sin tratamientos innecesarios", cuidadoso: "Cuidadoso en los procedimientos", tratamiento_a_medida: "Tratamiento a mi medida",
};

// Lista plana (la usan el admin, la página del doctor y el panel para poner el nombre de cada etiqueta).
export const RECOMMENDATION_TAGS = RECOMMENDATION_SECTIONS.flatMap((s) => s.tags);

export const recommendationTagLabel = (v) => RECOMMENDATION_TAGS.find((t) => t.v === v)?.label || RETIRED_TAGS[v] || v;
