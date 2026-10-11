import { useEffect, useRef, useState } from "react";

// Nav sticky de escritorio con scroll-spy: resalta la sección visible usando
// IntersectionObserver en vez de calcular scroll a mano.
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
        if (visible[0]) setActive(visible[0].target.id);
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
        if (observed.has(s.id)) return;
        const el = document.getElementById(s.id);
        if (el) {
          observed.add(s.id);
          observerRef.current.observe(el);
          found = found || [];
          found.push(s.id);
        }
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
      <nav
        className="flex items-center gap-1 bg-card rounded-3xl border border-border/50 px-3 py-2.5 text-sm overflow-x-auto"
        aria-label="Navegación del perfil"
      >
        {sections.filter((s) => presentIds.has(s.id)).map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors font-medium ${
              active === s.id
                ? "bg-brand-navy text-white"
                : "text-muted-foreground hover:text-brand-navy hover:bg-brand-bluePale"
            }`}
          >
            {s.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
