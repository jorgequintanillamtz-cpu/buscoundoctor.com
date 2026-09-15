import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles } from "lucide-react";

export default function SpecialistCases({ specialistId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await base44.entities.SpecialistCase.filter({ specialist_id: specialistId });
        if (!active) return;
        setItems(list.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
      } catch {}
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [specialistId]);

  if (loading || items.length === 0) return null;

  return (
    <div className="mt-6 bg-card rounded-3xl border border-border/50 p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="font-heading font-bold text-lg text-foreground">Casos de éxito</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((c) => (
          <div key={c.id} className="border border-border/50 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-2">
              <div className="relative">
                <img src={c.before_photo} alt={`Antes — ${c.title}`} loading="lazy" className="w-full h-32 sm:h-40 object-cover" />
                <span className="absolute bottom-1.5 left-1.5 text-[10px] font-semibold bg-black/60 text-white px-1.5 py-0.5 rounded">Antes</span>
              </div>
              <div className="relative">
                <img src={c.after_photo} alt={`Después — ${c.title}`} loading="lazy" className="w-full h-32 sm:h-40 object-cover" />
                <span className="absolute bottom-1.5 left-1.5 text-[10px] font-semibold bg-black/60 text-white px-1.5 py-0.5 rounded">Después</span>
              </div>
            </div>
            <div className="p-3">
              <p className="text-sm font-semibold text-foreground">{c.title}</p>
              {c.description && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
