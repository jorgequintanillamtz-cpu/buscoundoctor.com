import { useEffect, useRef, useState } from "react";

// Nav sticky de escritorio con scroll-spy: resalta la sección visible usando
// IntersectionObserver en vez de calcular scroll a mano.
export default function ScrollSpyNav({ sections }) {
  const [active, setActive] = useState(sections[0]?.id);
  const observerRef = useRef(null);

  useEffect(() => {
    const elements = sections.map((s) => document.getElementById(s.id)).filter(Boolean);
    if (elements.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-150px 0px -60% 0px", threshold: 0 }
    );

    elements.forEach((el) => observerRef.current.observe(el));
    return () => observerRef.current?.disconnect();
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
