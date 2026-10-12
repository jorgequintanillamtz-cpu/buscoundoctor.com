import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Nav sticky de escritorio con scroll-spy: resalta la sección visible usando
// IntersectionObserver en vez de calcular scroll a mano.
// Cada sección puede juntar varios bloques de la página (`ids`): por ejemplo "Formación" lleva a
// Experiencia y a Estudios, que van seguidos. Se identifica por su primer id; el enlace apunta al
// primer bloque que sí exista.
const idsOf = (s) => s.ids || [s.id];

export default function ScrollSpyNav({ sections }) {
  const [active, setActive] = useState(sections[0]?.id);
  // Solo mostramos en la barra las secciones que de verdad tienen contenido
  // -- varias (estudios, tecnología y tratamientos, hospitales, servicios,
  // faq...) se auto-ocultan (return null) cuando el doctor no cargó nada, y
  // antes el título seguía apareciendo en la barra aunque llevara a nada.
  // Se va llenando conforme el mismo scan() de abajo va detectando qué ids
  // sí llegaron a montarse en el DOM.
  const [presentIds, setPresentIds] = useState(() => new Set());
  const observerRef = useRef(null);

  useEffect(() => {
    const observed = new Set();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const hit = sections.find((s) => idsOf(s).includes(visible[0].target.id));
          if (hit) setActive(hit.id);
        }
      },
      { rootMargin: "-150px 0px -60% 0px", threshold: 0 }
    );

    // Varias secciones (reseñas, servicios, hospitales, especialidades...)
    // cargan su contenido de forma asíncrona y solo entonces montan su div
    // con el id correspondiente. Si escáneamos el DOM una sola vez al montar
    // (como antes), cualquier sección que aún no hubiera terminado de cargar
    // se quedaba sin observar para siempre — por eso la barra "a veces
      // funcionaba y otras no", según qué tan rápido respondiera cada fetch.
    // Con un MutationObserver reescaneamos cada vez que cambia el DOM y
    // vamos sumando a observar las secciones que van apareciendo.
    const scan = () => {
      let found = null;
      sections.forEach((s) => {
        idsOf(s).forEach((id) => {
          if (observed.has(id)) return;
          const el = document.getElementById(id);
          if (el) {
            observed.add(id);
            observerRef.current.observe(el);
            found = found || [];
            found.push(id);
          }
        });
      });
      if (found) setPresentIds((prev) => new Set([...prev, ...found]));
    };

    scan();
    const mutationObserver = new MutationObserver(scan);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observerRef.current?.disconnect();
      mutationObserver.disconnect();
    };
  }, [sections]);

  const visibleSections = sections.filter((s) => idsOf(s).some((id) => presentIds.has(id)));

  // Si las secciones no caben en un renglón, la barra se desliza de lado: flechas y desvanecido
  // avisan que hay más, y la sección activa se trae a la vista sola.
  const scrollRef = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const updateEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    updateEdges();
    const el = scrollRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    window.addEventListener("resize", updateEdges);
    return () => { ro.disconnect(); window.removeEventListener("resize", updateEdges); };
  }, [updateEdges, visibleSections.length]);

  useEffect(() => {
    const el = scrollRef.current;
    const pill = el?.querySelector(`[data-section="${active}"]`);
    if (!el || !pill) return;
    const target = pill.offsetLeft - (el.clientWidth - pill.offsetWidth) / 2;
    el.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [active, visibleSections.length]);

  const slide = (dir) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.6, behavior: "smooth" });
  };

  return (
    // La barra es una tarjeta con esquinas redondeadas y se queda fija al hacer scroll. Por eso va
    // dentro de un contenedor fijo con el color del fondo de la página: sin él, el contenido de las
    // secciones se veía pasar por el hueco de arriba y por las esquinas redondeadas (se "ponía por
    // encima"). El contenedor llega hasta el borde inferior del menú de arriba (--header-h, medido
    // en vivo por Header.jsx; antes un top-20 fijo se metía debajo del header cuando el banner
    // "¿Eres médico?" estaba visible) y deja 0.5 rem de aire arriba y abajo de la tarjeta.
    <div
      className="hidden lg:block sticky z-30 bg-brand-canvas pt-2 pb-2 mt-4"
      style={{ top: "var(--header-h, 5rem)" }}
    >
      <div className="relative bg-card rounded-3xl border border-border/50 overflow-hidden">
        <nav
          ref={scrollRef}
          onScroll={updateEdges}
          className="flex items-center gap-1 px-3 py-2.5 text-sm overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Navegación del perfil"
        >
          {visibleSections.map((s) => {
            const target = idsOf(s).find((id) => presentIds.has(id)) || s.id;
            return (
              <a
                key={s.id}
                data-section={s.id}
                href={`#${target}`}
                className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors font-medium ${
                  active === s.id
                    ? "bg-brand-navy text-white"
                    : "text-muted-foreground hover:text-brand-navy hover:bg-brand-bluePale"
                }`}
              >
                {s.label}
              </a>
            );
          })}
        </nav>
        {edges.left && (
          <div className="absolute inset-y-0 left-0 w-14 flex items-center pl-2 bg-gradient-to-r from-card via-card/90 to-transparent pointer-events-none">
            <button
              type="button"
              onClick={() => slide(-1)}
              aria-label="Ver secciones anteriores"
              className="pointer-events-auto w-7 h-7 rounded-full border border-border bg-card shadow-sm flex items-center justify-center text-brand-navy hover:bg-brand-bluePale"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
        {edges.right && (
          <div className="absolute inset-y-0 right-0 w-14 flex items-center justify-end pr-2 bg-gradient-to-l from-card via-card/90 to-transparent pointer-events-none">
            <button
              type="button"
              onClick={() => slide(1)}
              aria-label="Ver más secciones"
              className="pointer-events-auto w-7 h-7 rounded-full border border-border bg-card shadow-sm flex items-center justify-center text-brand-navy hover:bg-brand-bluePale"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
