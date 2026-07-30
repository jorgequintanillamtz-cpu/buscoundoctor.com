import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DollarSign, ChevronDown } from "lucide-react";

export default function SpecialistServices({ specialistId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await base44.entities.SpecialistService.filter({ specialist_id: specialistId });
        if (!active) return;
        setItems(list.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
      } catch {}
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [specialistId]);

  if (loading || items.length === 0) return null;

  return (
    <div id="servicios" className="mt-6 bg-card rounded-3xl border border-border/50 p-6 sm:p-8 scroll-mt-32">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-5 h-5 text-primary" />
        <h2 className="font-heading font-bold text-lg text-foreground">Servicios y precios</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((s) => {
          const isOpen = openId === s.id;
          return (
            <div
              key={s.id}
              className="rounded-2xl border border-border/50 p-4 sm:p-5 hover:border-brand-blue/30 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-foreground leading-snug">{s.name}</p>
                <span className="text-sm font-bold text-brand-blue whitespace-nowrap">
                  ${s.price?.toLocaleString("es-MX")}
                </span>
              </div>
              {s.details && (
                <>
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : s.id)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-brand-blue transition-colors"
                  >
                    Detalles
                    <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{s.details}</p>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border/50">
        <strong className="text-foreground">¿Cómo funcionan los precios?</strong> Son precios de referencia proporcionados por el especialista — confírmalos directamente antes de tu cita, ya que pueden variar según tu caso.
      </p>
    </div>
  );
}
