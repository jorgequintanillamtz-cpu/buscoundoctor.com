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
    // top-20 fijo antes: si el banner "¿Eres médico?" del header estaba
    // visible, el header quedaba más alto que ese offset y este nav se
    // metía parcialmente debajo (mismo bug que tenía la tarjeta de Agendar
    // cita). Usa --header-h (medido en vivo por Header.jsx) igual que ella.
    <nav
      className="hidden lg:flex items-center gap-1 mt-8 mb-2 sticky z-30 bg-background/95 backdrop-blur-sm py-3 border-b border-border/50 text-sm overflow-x-auto"
      style={{ top: "var(--header-h, 5rem)" }}
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
  );
}
