import { useEffect, useState } from "react";

// Contador tipo reloj (una cajita por dígito) del estilo "flow": aparece en ceros y, pasados `delayMs` (en el
// inicio, lo que tarda en entrar el título) y con el dato ya cargado, sube hasta `total` en ~1.5 s.
// `total` es null mientras carga. Con "reducir movimiento", muestra el número directo.
// `srLabel`: lo que lee un lector de pantalla después del número (p. ej. "recomendaciones de dentistas").
// Salió de RecomendacionesFlow.jsx el 2026-11-01 sin cambios visuales.
export default function RecommendationCounter({ total, delayMs = 0, srLabel = "recomendaciones" }) {
  const [n, setN] = useState(0);
  const [ready, setReady] = useState(delayMs <= 0);
  useEffect(() => {
    if (delayMs <= 0) return undefined;
    const t = setTimeout(() => setReady(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);
  useEffect(() => {
    if (total == null || !ready) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setN(total); return undefined; }
    const ms = 1500;
    let start = null;
    let raf = 0;
    const tick = (t) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / ms);
      setN(Math.round(total * (1 - Math.pow(1 - p, 3)))); // arranca rápido y frena al llegar
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [total, ready]);
  // Una cajita por dígito, con tantas cajitas como dígitos tiene el total (rellena con ceros mientras sube:
  // 000 → 125), para que no cambie de ancho durante la animación.
  const digits = String(n).padStart(String(total ?? 0).length, "0").split("");
  return (
    <div className="mt-5 text-white/85">
      <div className="flex justify-center gap-1.5" aria-hidden="true">
        {digits.map((dg, i) => (
          <span key={i} className="relative w-11 h-14 sm:w-12 sm:h-16 rounded-lg bg-white/10 border border-white/20 shadow-inner flex items-center justify-center font-heading font-bold text-3xl sm:text-4xl text-white tabular-nums overflow-hidden">
            {dg}
            {/* Línea del medio, como en los relojes de paletas */}
            <span className="absolute inset-x-0 top-1/2 h-px bg-brand-navy/60" />
          </span>
        ))}
      </div>
      {total != null && <span className="sr-only">{total} {srLabel}</span>}
    </div>
  );
}
