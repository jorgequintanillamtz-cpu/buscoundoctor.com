// Etiquetas de las recomendaciones de pacientes (CLAUDE.md §8r). Los valores (`v`) deben ser
// EXACTAMENTE los que acepta la función `submit_recommendation` de la base de datos (y el tope de
// MAX_TAGS también se aplica ahí). Van agrupadas por tema para que sea fácil elegir; el paciente
// escoge hasta MAX_TAGS en total (así no se puede marcar todo y las etiquetas sí distinguen a un doctor).
// Solo cualidades positivas y generales: nada de promesas de curación ni de enfermedades concretas.
export const MAX_TAGS = 5;

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
  { key: "tratamiento", label: "Tratamiento", tags: [
    { v: "sin_tratamientos_innecesarios", label: "Sin tratamientos innecesarios" },
    { v: "cuidadoso", label: "Cuidadoso en los procedimientos" },
    { v: "tratamiento_a_medida", label: "Tratamiento a mi medida" },
  ] },
  { key: "para_quien", label: "Lo recomiendo para", tags: [
    { v: "para_ninos", label: "Niños" },
    { v: "para_adultos_mayores", label: "Adultos mayores" },
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
};

// Lista plana (la usan el admin, la página del doctor y el panel para poner el nombre de cada etiqueta).
export const RECOMMENDATION_TAGS = RECOMMENDATION_SECTIONS.flatMap((s) => s.tags);

export const recommendationTagLabel = (v) => RECOMMENDATION_TAGS.find((t) => t.v === v)?.label || RETIRED_TAGS[v] || v;
