// Los formularios públicos (cita, reseña, pregunta, contacto, interés) tienen límites
// anti-spam en la base de datos (ver CLAUDE.md §8m). Cuando se pasan, la base responde
// con un mensaje YA en español (código P0001 = "demasiadas solicitudes", 22023 = "datos
// no válidos"). Esta función lo muestra tal cual; para cualquier otro error (red, etc.)
// se usa el texto genérico de cada pantalla.
export function formErrorMessage(err, fallback) {
  if ((err?.code === "P0001" || err?.code === "22023") && err?.message) return err.message;
  return fallback;
}
