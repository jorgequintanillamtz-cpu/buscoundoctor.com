// Recarga la página UNA vez cuando la versión del sitio que el visitante tiene abierta quedó vieja
// (después de un despliegue, los archivos de la versión anterior ya no existen y pedir una sección
// nueva falla). Guarda la hora del último intento en sessionStorage para no entrar en un ciclo de
// recargas si el problema es otro (por ejemplo, sin internet): si ya se recargó hace menos de 30 s,
// no vuelve a hacerlo.
const KEY = "bud_chunk_reload_at";
const WINDOW_MS = 30000;

export function reloadOnceForNewVersion() {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < WINDOW_MS) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // sin sessionStorage: se recarga igual, una sola vez por carga de página
    if (window.__budReloaded) return false;
    window.__budReloaded = true;
  }
  window.location.reload();
  return true;
}

// Errores de "no pude descargar un pedazo del sitio" (nombres distintos según el navegador).
export function isChunkLoadError(error) {
  const msg = String(error?.message || error || "");
  return /dynamically imported module|importing a module script failed|Failed to fetch dynamically|error loading dynamically|Loading chunk|Unable to preload CSS/i.test(msg);
}
