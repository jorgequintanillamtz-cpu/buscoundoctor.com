// Tipos de paciente que un médico puede marcar en "Detalles de consulta" (panel y admin) y que se
// muestran en "Sobre el especialista" del perfil público. Un solo lugar para valores y etiquetas.
// El campo `specialist.patient_types` es un arreglo de texto sin restricción en la base de datos:
// agregar un tipo nuevo aquí basta (no hace falta migración). Los valores ya guardados
// (ninos, adolescentes, adultos, adultos_mayores) no cambian.
export const PATIENT_TYPES = [
  { value: "bebes", label: "Bebés" },
  { value: "ninos", label: "Niños" },
  { value: "adolescentes", label: "Adolescentes" },
  { value: "adultos", label: "Adultos" },
  { value: "adultos_mayores", label: "Adultos mayores" },
  { value: "hombres", label: "Hombres" },
  { value: "mujeres", label: "Mujeres" },
];

export const PATIENT_TYPE_LABELS = Object.fromEntries(PATIENT_TYPES.map((t) => [t.value, t.label]));
