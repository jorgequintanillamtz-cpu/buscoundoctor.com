import { useEffect, useRef, useState } from "react";

// Nav sticky de escritorio con scroll-spy: resalta la sección visible usando
// IntersectionObserver en vez de calcular scroll a mano.
export default function ScrollSpyNav({ sections }) {
  const [active, setActive] = useState(sections[0]?.id);
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
      sections.forEach((s) => {
        if (observed.has(s.id)) return;
        const el = document.getElementById(s.id);
        if (el) {
          observed.add(s.id);
          observerRef.current.observe(el);
        }
      });
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
    <nav
      className="hidden lg:flex items-center gap-1 mt-8 mb-2 sticky top-20 z-30 bg-background/95 backdrop-blur-sm py-3 border-b border-border/50 text-sm overflow-x-auto"
      aria-label="Navegación del perfil"
    >
      {sections.map((s) => (
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
  );
}
