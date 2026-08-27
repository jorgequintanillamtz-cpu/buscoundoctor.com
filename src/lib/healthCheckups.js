// Motor de recomendaciones de la calculadora de chequeos médicos preventivos.
// Lógica pura: recibe los inputs del usuario y devuelve la lista de estudios
// recomendados con su frecuencia y urgencia ajustadas por los factores de
// riesgo. No depende de React ni del DOM, así se puede testear y reutilizar.

export const URGENCY_LEVELS = {
  alta: { label: "Prioridad alta", rank: 3 },
  media: { label: "Prioridad media", rank: 2 },
  baja: { label: "Prioridad baja", rank: 1 },
};

// Cada estudio define:
//   applies(i)  -> si corresponde para este perfil
//   frequency(i)-> texto de la frecuencia recomendada
//   urgency(i) -> "alta" | "media" | "baja"
// `order` solo ordena de forma estable dentro de la misma urgencia.
const STUDIES = [
  {
    key: "presion_arterial",
    name: "Presión arterial",
    why: "La hipertensión no suele dar síntomas hasta que causa daño. Medirla a tiempo permite actuar antes de que afecte al corazón, los riñones o el cerebro.",
    specialty: { name: "Cardiología", profession_slug: "cardiologo" },
    order: 1,
    applies: (i) => i.age >= 18,
    frequency: (i) => {
      if (i.chronic) return "Al menos cada 6 meses (o según indicación de tu médico)";
      if (i.smokes || i.familyHistory || i.age >= 40) return "Cada 6 a 12 meses";
      return "Anual";
    },
    urgency: (i) => {
      if (i.chronic || (i.smokes && i.familyHistory)) return "alta";
      if (i.age >= 40 || i.smokes || i.familyHistory) return "media";
      return "baja";
    },
  },
  {
    key: "perfil_lipidos",
    name: "Perfil de lípidos (colesterol y triglicéridos)",
    why: "El colesterol alto no avisa. Un perfil de lípidos detecta dislipidemias que, sin tratamiento, aceleran la arteriosclerosis y el riesgo cardiovascular.",
    specialty: { name: "Medicina Interna", profession_slug: "internista" },
    order: 2,
    applies: (i) => i.age >= 20,
    frequency: (i) => {
      if (i.chronic || i.familyHistory) return "Cada 6 meses";
      if (i.smokes || i.age >= 40) return "Anual";
      return "Cada 3 a 5 años";
    },
    urgency: (i) => {
      if (i.chronic || i.familyHistory) return "alta";
      if (i.smokes || i.age >= 40) return "media";
      return "baja";
    },
  },
  {
    key: "glucosa",
    name: "Glucosa y hemoglobina glicada (HbA1c)",
    why: "La diabetes tipo 2 puede estar presente años antes del diagnóstico. La glucosa y la HbA1c identifican prediabetes y diabetes de forma temprana, cuando todavía se puede revertir.",
    specialty: { name: "Endocrinología", profession_slug: "endocrinologo" },
    order: 3,
    applies: (i) => i.age >= 18,
    frequency: (i) => {
      if (i.chronic) return "Cada 3 meses (HbA1c)";
      if (i.familyHistory || i.activity === "sedentario") return "Anual";
      if (i.age >= 45) return "Anual";
      return "Cada 3 años";
    },
    urgency: (i) => {
      if (i.chronic) return "alta";
      if (i.familyHistory || i.activity === "sedentario") return "media";
      return "baja";
    },
  },
  {
    key: "chequeo_general",
    name: "Chequeo médico general",
    why: "Una consulta preventiva anual revisa peso, presión, antecedentes y signos de alarma que los exámenes de laboratorio por sí solos no detectan.",
    specialty: { name: "Medicina Familiar", profession_slug: "medico-familiar" },
    order: 4,
    applies: (i) => i.age >= 18,
    frequency: (i) => (i.chronic || i.age >= 40 ? "Anual" : "Cada 1 a 2 años"),
    urgency: (i) => {
      if (i.chronic || i.age >= 50) return "media";
      return "baja";
    },
  },
  {
    key: "papanicolaou",
    name: "Papanicolaou (citología cervical)",
    why: "Detecta cambios celulares en el cuello uterino antes de que se conviertan en cáncer. Es uno de los estudios de tamizaje con mayor impacto en la supervivencia.",
    specialty: { name: "Ginecología", profession_slug: "ginecologo" },
    order: 5,
    applies: (i) => i.sex === "femenino" && i.age >= 21 && i.age <= 65,
    frequency: (i) => (i.familyHistory ? "Anual" : "Cada 3 años"),
    urgency: (i) => (i.familyHistory ? "media" : "baja"),
  },
  {
    key: "mastografia",
    name: "Mastografía",
    why: "La mastografía detecta tumores mamarios cuando todavía son demasiado pequeños para palparse. El diagnóstico temprano marca la diferencia en el pronóstico.",
    specialty: { name: "Ginecología", profession_slug: "ginecologo" },
    order: 6,
    applies: (i) => i.sex === "femenino" && (i.age >= 40 || (i.familyHistory && i.age >= 35)),
    frequency: (i) => (i.familyHistory ? "Anual" : "Anual o cada 2 años"),
    urgency: (i) => {
      if (i.familyHistory) return "alta";
      if (i.age >= 50) return "media";
      return "media";
    },
  },
  {
    key: "psa_prostata",
    name: "Antígeno prostático (PSA) y exploración prostática",
    why: "El PSA y el tacto prostático ayudan a detectar cáncer de próstata y crecimiento benigno en etapas en las que el tratamiento es más efectivo.",
    specialty: { name: "Urología", profession_slug: "urologo" },
    order: 7,
    applies: (i) => i.sex === "masculino" && (i.age >= 50 || (i.familyHistory && i.age >= 45)),
    frequency: () => "Anual",
    urgency: (i) => (i.familyHistory ? "alta" : "media"),
  },
  {
    key: "colonoscopia",
    name: "Colonoscopía",
    why: "Es el estándar de oro para detectar pólipos antes de que se transformen en cáncer de colon. Retirarlos durante el estudio previene la enfermedad.",
    specialty: { name: "Gastroenterología", profession_slug: "gastroenterologo" },
    order: 8,
    applies: (i) => i.age >= 45 && i.age <= 75,
    frequency: (i) => (i.familyHistory ? "Cada 5 años (o antes según indicación)" : "Cada 10 años"),
    urgency: (i) => (i.familyHistory ? "alta" : "media"),
  },
  {
    key: "densitometria",
    name: "Densitometría ósea",
    why: "Mide la densidad mineral del hueso y detecta osteoporosis antes de que ocurra una fractura. Es clave en mujeres postmenopáusicas y adultos mayores.",
    specialty: { name: "Geriatría", profession_slug: "geriatra" },
    order: 9,
    applies: (i) =>
      (i.sex === "femenino" && i.age >= 65) || (i.sex === "masculino" && i.age >= 70),
    frequency: () => "Cada 2 años",
    urgency: () => "media",
  },
  {
    key: "exploracion_piel",
    name: "Exploración de piel (detección de melanoma)",
    why: "El melanoma es altamente curable cuando se detecta temprano. Una revisión dermatológica anual identifica lunares sospechosos que pasan desapercibidos.",
    specialty: { name: "Dermatología", profession_slug: "dermatologo" },
    order: 10,
    applies: (i) => i.age >= 18,
    frequency: (i) => (i.familyHistory ? "Anual" : "Cada 1 a 2 años"),
    urgency: (i) => (i.familyHistory ? "media" : "baja"),
  },
  {
    key: "electrocardiograma",
    name: "Electrocardiograma (ECG)",
    why: "Registra la actividad eléctrica del corazón y puede revelar arritmias, daño previo silente o signos de isquemia que justifican un estudio más profundo.",
    specialty: { name: "Cardiología", profession_slug: "cardiologo" },
    order: 11,
    applies: (i) => i.age >= 40 || i.smokes || i.familyHistory || i.chronic,
    frequency: (i) => (i.chronic || i.familyHistory ? "Anual" : "Cada 2 a 3 años"),
    urgency: (i) => {
      if (i.chronic || (i.smokes && i.familyHistory)) return "alta";
      if (i.smokes || i.familyHistory || i.age >= 50) return "media";
      return "baja";
    },
  },
  {
    key: "salud_mental",
    name: "Evaluación de salud mental y estrés",
    why: "El sedentarismo, el tabaco y el estrés crónico elevan el riesgo cardiovascular y empeoran la calidad de vida. Una valoración psicológica ayuda a prevenirlos.",
    specialty: { name: "Psicología", profession_slug: "psicologo" },
    order: 12,
    applies: (i) => i.activity === "sedentario" || i.smokes || i.age >= 60,
    frequency: () => "Anual",
    urgency: (i) => ((i.activity === "sedentario" && i.smokes) || i.age >= 70 ? "media" : "baja"),
  },
  {
    key: "limpieza_dental",
    name: "Limpieza y chequeo dental",
    why: "La salud bucal está ligada a la salud general. Una limpieza profesional cada seis meses previene caries, enfermedad de las encías y detecta problemas bucales a tiempo.",
    specialty: null,
    order: 13,
    applies: (i) => i.age >= 18,
    frequency: () => "Cada 6 meses",
    urgency: () => "baja",
  },
];

// Recibe los inputs del formulario y devuelve la lista de estudios
// recomendados, ordenada por urgencia (alta -> media -> baja) y luego por
// el orden de definición para un ordenamiento estable.
export function recommendCheckups(input) {
  return STUDIES
    .map((s) => {
      if (!s.applies(input)) return null;
      const urgency = s.urgency(input);
      return {
        key: s.key,
        name: s.name,
        why: s.why,
        specialty: s.specialty,
        frequency: s.frequency(input),
        urgency,
        _rank: URGENCY_LEVELS[urgency].rank,
        _order: s.order,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b._rank - a._rank || a._order - b._order);
}