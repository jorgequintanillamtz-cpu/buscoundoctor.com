// "Guardar doctor": lista de favoritos persistida solo en el navegador del
// visitante (localStorage). El sitio no tiene cuentas de paciente, así que
// esto es intencionalmente local-only y anónimo — no se sincroniza entre
// dispositivos ni se asocia a ninguna cuenta.

const KEY = "bud_saved_doctors";

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(ids) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // localStorage puede fallar en modo incógnito estricto; fallamos en silencio,
    // el botón simplemente no persistirá entre recargas.
  }
}

export function isDoctorSaved(id) {
  if (!id) return false;
  return readAll().includes(id);
}

export function toggleSavedDoctor(id) {
  if (!id) return false;
  const all = readAll();
  const wasSaved = all.includes(id);
  const next = wasSaved ? all.filter((x) => x !== id) : [...all, id];
  writeAll(next);
  return !wasSaved;
}

export function getSavedDoctorIds() {
  return readAll();
}
