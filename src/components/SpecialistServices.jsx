import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DollarSign } from "lucide-react";

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
    <div className="mt-6 bg-card rounded-3xl border border-border/50 p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-5 h-5 text-primary" />
        <h2 className="font-heading font-bold text-lg text-foreground">Servicios y precios</h2>
      </div>
      <div className="space-y-0">
        {items.map((s, i) => {
          const isOpen = openId === s.id;
          return (
            <div key={s.id} className={`py-4 ${i > 0 ? "border-t border-border/50" : ""}`}>
              <p className="text-sm font-semibold text-foreground">{s.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-medium text-brand-blue">${s.price?.toLocaleString("es-MX")}</span>
                {s.details && (
                  <>
                    <span className="text-border">·</span>
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : s.id)}
                      className="text-sm font-medium text-brand-blue underline decoration-brand-blue/40 underline-offset-2 hover:decoration-brand-blue"
                    >
                      Detalles
                    </button>
                  </>
                )}
              </div>
              {isOpen && s.details && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{s.details}</p>
              )}
            </div>
          );
        })}
      </div>
      <div className="pt-4 mt-2 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">¿Cómo funcionan los precios?</strong> Son precios de referencia proporcionados por el especialista — confírmalos directamente antes de tu cita, ya que pueden variar según tu caso.
        </p>
      </div>
    </div>
  );
}
