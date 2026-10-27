// Eventos para Microsoft Clarity (CLAUDE.md §13b). Seguro de llamar siempre: si Clarity no cargó, no hace nada.
export function trackEvent(name) {
  try { if (typeof window !== "undefined" && typeof window.clarity === "function") window.clarity("event", name); } catch { /* medir nunca debe romper la página */ }
}
export function trackTag(key, value) {
  try { if (typeof window !== "undefined" && typeof window.clarity === "function") window.clarity("set", key, String(value)); } catch { /* idem */ }
}
