import { base44 } from "@/api/base44Client";

// Contador de vistas e impresiones de los doctores recomendados (CLAUDE.md §8r, paso 30). "view" = alguien abrió
// la página del doctor; "impression" = el doctor apareció en una lista. La base de datos cuenta una por visitante
// por doctor por día y descarta bots y al equipo; aquí solo se avisa, sin esperar y sin mostrar nunca un error.
// `seen` evita repetir el aviso en la misma visita a la página.
const seen = new Set();

export function recordRecommendedViews(slugs, kind) {
  try {
    const fresh = [...new Set((slugs || []).filter(Boolean))].filter((s) => !seen.has(`${kind}:${s}`)).slice(0, 60);
    if (fresh.length === 0) return;
    fresh.forEach((s) => seen.add(`${kind}:${s}`));
    base44.functions.invoke("recordRecommendedViews", { slugs: fresh, kind }).catch(() => {});
  } catch { /* contar nunca debe romper la página */ }
}
