import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Stethoscope, ChevronRight } from "lucide-react";

// Sección "Especialidades": no repite solo lo del hero, suma valor real
// enlazando a las páginas de enfermedades que atiende esta especialidad
// (buen extra de SEO/UX vía enlazado interno, con datos reales existentes).
export default function EspecialidadesSection({ specialist }) {
  const [conditions, setConditions] = useState([]);

  useEffect(() => {
    let active = true;
    if (!specialist.specialty) return;
    (async () => {
      try {
        const list = await base44.entities.Condition.filter({ specialty: specialist.specialty, active: true });
        if (!active) return;
        setConditions(list.slice(0, 8));
      } catch {}
    })();
    return () => { active = false; };
  }, [specialist.specialty]);

  return (
    <div id="especialidades" className="mt-6 bg-card rounded-3xl border border-border/50 p-6 sm:p-8 scroll-mt-32">
      <div className="flex items-center gap-2 mb-4">
        <Stethoscope className="w-5 h-5 text-primary" />
        <h2 className="font-heading font-bold text-lg text-foreground">Especialidades</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-semibold bg-brand-navy text-white px-4 py-2 rounded-full">
          {specialist.specialty}
        </span>
        {specialist.subspecialty && (
          <span className="text-sm font-medium bg-brand-bluePale text-brand-navy px-4 py-2 rounded-full">
            {specialist.subspecialty}
          </span>
        )}
      </div>

      {conditions.length > 0 && (
        <div className="mt-5 pt-5 border-t border-border/50">
          <p className="text-sm font-semibold text-foreground mb-3">Enfermedades y padecimientos que trata</p>
          <div className="flex flex-wrap gap-2">
            {conditions.map((c) => (
              <Link
                key={c.id}
                to={`/enfermedades/${c.slug}`}
                className="inline-flex items-center gap-1 text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/70 px-3 py-1.5 rounded-full transition-colors"
              >
                {c.name}
                <ChevronRight className="w-3 h-3" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
