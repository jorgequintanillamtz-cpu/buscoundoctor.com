// Otros nombres con los que la gente busca una especialidad (CLAUDE.md §8r, paso 33). El catálogo tiene "Dentista",
// pero en Monterrey también se dice "odontólogo": en la lista de recomendados y en el formulario de /recomendaciones
// la etiqueta lo dice y la búsqueda lo encuentra. Las claves son el `name` de la especialidad en el catálogo; el valor
// guardado en la base no cambia (siguen siendo los mismos doctores).
const ALIASES = {
  "Dentista": { label: "Dentista / Odontólogo", search: ["odontologo", "odontologa", "odontologia", "dental"] },
  "Odontopediatría": { search: ["odontologo", "odontologa", "dentista infantil", "dentista de ninos"] },
};

// Etiqueta para mostrar (con el otro nombre si lo tiene).
export const specialtyLabel = (name, fallback) => ALIASES[name]?.label || fallback || name;

// Texto en el que busca el buscador de la lista: el nombre y sus alias (sin acentos; quien llama también los quita al escribir).
export const specialtySearchText = (name) => [name, ...(ALIASES[name]?.search || [])].join(" ");
