// Combina especialidades, subespecialidades y enfermedades en una sola
// lista de opciones para los buscadores del sitio (encabezado y home),
// igual que hace Doctoralia con su buscador de "especialidad, enfermedad o
// nombre". Cada opción lleva un id con prefijo para distinguir su tipo al
// resolver la selección, y un "hint" por fila para que el usuario vea si
// eligió una especialidad, una subespecialidad o una enfermedad.
export function buildSearchOptions(specialties = [], conditions = [], subspecialties = []) {
  const specialtyOptions = specialties.map((s) => ({
    id: `spec:${s.slug}`,
    name: s.display_name || s.name,
    hint: "Especialidad",
    type: "specialty",
    ref: s,
  }));
  const subspecialtyOptions = subspecialties.map((s) => ({
    id: `sub:${s.slug}`,
    name: s.name,
    hint: "Subespecialidad",
    type: "subspecialty",
    ref: s,
  }));
  const conditionOptions = conditions.map((c) => ({
    id: `cond:${c.slug}`,
    name: c.name,
    hint: "Enfermedad",
    type: "condition",
    ref: c,
  }));
  return [...specialtyOptions, ...subspecialtyOptions, ...conditionOptions];
}
