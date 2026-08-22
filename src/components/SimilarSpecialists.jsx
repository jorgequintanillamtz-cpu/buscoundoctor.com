import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import CompactSpecialistCard from "./CompactSpecialistCard";
import { Users, ChevronLeft, ChevronRight } from "lucide-react";

export default function SimilarSpecialists({ specialistId, specialty, zone }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollerRef = useRef(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const all = await base44.entities.Specialist.filter({ active: true });
        if (!active) return;
        const matches = all
          .filter((s) => s.id !== specialistId)
          .filter((s) => (specialty && s.specialty === specialty) || (zone && s.zone === zone));
        // Antes eran solo 4 en una lista vertical de tarjetas grandes; con el
        // slider horizontal de tarjetas chicas caben muchas más a la vista sin
        // ocupar espacio vertical, así que mostramos hasta 10.
        setItems(matches.slice(0, 10));
      } catch {}
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [specialistId, specialty, zone]);

  if (loading || items.length === 0) return null;

  const heading = specialty ? `Compara con otros ${specialty} cerca de ti` : "Especialistas similares";

  // Ancho aproximado de una tarjeta (w-56/60) + el gap-3 entre ellas, para
  // que cada click de flecha avance ~1 tarjeta completa.
  const scrollBy = (dir) => scrollerRef.current?.scrollBy({ left: dir * 250, behavior: "smooth" });

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-lg text-foreground">{heading}</h2>
        </div>
        {/* Flechas solo en escritorio: en móvil el slider ya se desliza con el dedo */}
        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Ver anteriores"
            className="w-8 h-8 rounded-full border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Ver siguientes"
            className="w-8 h-8 rounded-full border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1"
      >
        {items.map((s) => (
          <CompactSpecialistCard key={s.id} specialist={s} sourcePage="similares" />
        ))}
      </div>
    </div>
  );
}