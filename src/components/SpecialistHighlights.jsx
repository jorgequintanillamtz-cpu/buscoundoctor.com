import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Cpu, CheckCircle2 } from "lucide-react";

const TYPE_META = {
  tecnologia: { label: "Tecnología", icon: Cpu },
  tratamiento: { label: "Tratamiento especial", icon: Sparkles },
};

// Muestra las tecnologías/equipos y tratamientos especiales que el doctor
// cargó desde su panel (ver HighlightsManager.jsx). Opcional: si no hay
// ninguno, la sección no se renderiza -- mismo patrón que EducationTimeline.
export default function SpecialistHighlights({ specialistId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await base44.entities.SpecialistHighlight.filter({ specialist_id: specialistId });
        if (!active) return;
        list.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        setItems(list);
      } catch {}
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [specialistId]);

  if (loading || items.length === 0) return null;

  return (
    <div id="tecnologia-tratamientos" className="mt-6 bg-card rounded-3xl border border-border/50 p-6 sm:p-8 scroll-mt-32">
      <div className="flex items-center gap-2 mb-5">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="font-heading font-bold text-lg text-foreground">Tecnología y tratamientos</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((h) => {
          const meta = TYPE_META[h.type] || TYPE_META.tecnologia;
          const Icon = meta.icon;
          const benefits = (h.benefits || "").split("\n").map((b) => b.trim()).filter(Boolean);
          return (
            <div key={h.id} className="border border-border/60 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{meta.label}</span>
              </div>
              <h3 className="font-heading font-semibold text-base text-foreground mb-2">{h.name}</h3>
              {benefits.length > 0 && (
                <ul className="space-y-1.5">
                  {benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
