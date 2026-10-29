import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Carrusel horizontal compartido (CLAUDE.md §8r, pasos 38 y 41): lo usan los doctores y los comentarios de la landing
// /recomendaciones y las recomendaciones de /recomendado/:slug en celular.

// Ancho de cada tarjeta del carrusel: en celular una y un pedacito de la siguiente; desde tableta dos y un pedacito de la tercera.
// Con una sola tarjeta, centrada y sin pedacito.
export const slideWidth = (n) => (n === 1 ? "w-full max-w-md mx-auto" : "w-[calc(100%_-_3rem)] sm:w-[calc((100%_-_3.75rem)/2)]");

// Carrusel horizontal (doctores y comentarios): se desliza con el dedo, con las flechas (escritorio) o tocando los puntos de abajo
// (uno por tarjeta; el marcado es la primera tarjeta visible). Si `onSeen` existe, cada tarjeta con `data-slug` cuenta como
// impresión solo cuando se ve de verdad (IntersectionObserver), no por estar fuera de pantalla.
// `dots={false}` quita los puntos de abajo (la copia /recomendaciones-nueva no los usa).
export default function CardSlider({ children, resetKey, onSeen, label, prevLabel, nextLabel, className = "mt-6", dots = true }) {
  const ref = useRef(null);
  const seen = useRef(new Set());
  const [edge, setEdge] = useState({ prev: false, next: false });
  const [pos, setPos] = useState({ active: 0, count: 0 });
  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const kids = [...el.children];
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    const left = el.getBoundingClientRect().left;
    let active = kids.findIndex((k) => k.getBoundingClientRect().left >= left - 8);
    if (atEnd || active < 0) active = Math.max(kids.length - 1, 0);
    setPos({ active, count: kids.length });
    setEdge({ prev: el.scrollLeft > 4, next: !atEnd });
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    el.scrollTo({ left: 0 });
    update();
    window.addEventListener("resize", update);
    let io = null;
    if (onSeen) {
      if (typeof IntersectionObserver !== "undefined") {
        io = new IntersectionObserver((entries) => {
          entries.forEach((e) => {
            const slug = e.target.getAttribute("data-slug");
            if (e.isIntersecting && slug && !seen.current.has(slug)) { seen.current.add(slug); onSeen(slug); }
          });
        }, { root: el, threshold: 0.6 });
        el.querySelectorAll("[data-slug]").forEach((n) => io.observe(n));
      } else {
        el.querySelectorAll("[data-slug]").forEach((n) => onSeen(n.getAttribute("data-slug")));
      }
    }
    return () => { window.removeEventListener("resize", update); if (io) io.disconnect(); };
  }, [resetKey]);
  const go = (dir) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.9, behavior: "smooth" });
  const goTo = (i) => {
    const el = ref.current; const k = el?.children[i];
    if (el && k) el.scrollTo({ left: el.scrollLeft + k.getBoundingClientRect().left - el.getBoundingClientRect().left, behavior: "smooth" });
  };
  const arrow = "hidden md:flex absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-white border border-border shadow-md text-foreground hover:border-brand-augusta hover:text-brand-augusta transition-colors";
  return (
    <div className={className}>
      <div className="relative">
        <div ref={ref} onScroll={update} className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="list" aria-label={label}>
          {children}
        </div>
        {edge.prev && <button type="button" onClick={() => go(-1)} aria-label={prevLabel} className={`${arrow} left-0 -translate-x-1/2`}><ChevronLeft className="w-5 h-5" /></button>}
        {edge.next && <button type="button" onClick={() => go(1)} aria-label={nextLabel} className={`${arrow} right-0 translate-x-1/2`}><ChevronRight className="w-5 h-5" /></button>}
      </div>
      {dots && pos.count > 1 && (
        <div className="flex justify-center items-center mt-3" role="group" aria-label={`${label}: ${pos.count} en total`}>
          {Array.from({ length: pos.count }, (_, i) => (
            <button key={i} type="button" onClick={() => goTo(i)} aria-label={`Ir al ${i + 1} de ${pos.count}`} aria-current={i === pos.active ? "true" : undefined} className="p-1.5">
              <span className={`block h-2 rounded-full transition-all ${i === pos.active ? "w-5 bg-brand-augusta" : "w-2 bg-border"}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
