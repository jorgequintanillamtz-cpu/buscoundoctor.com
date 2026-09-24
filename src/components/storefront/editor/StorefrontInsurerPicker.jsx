import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Sparkles, Loader2, ShieldCheck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const COLLAPSED_COUNT = 3;

/**
 * Selector de seguros para la página pública, contra el mismo catálogo de
 * aseguradoras (con logo) que usa el perfil real (ver InsurersManager.jsx).
 * Reemplaza el campo de texto libre anterior -- ahora es una copia propia
 * del storefront (insurer_id + logo_url denormalizado), independiente de
 * `specialist.insurers_relation`: marcar/desmarcar aquí no toca el perfil
 * real del directorio.
 *
 * props:
 * - storefrontId
 * - items: filas actuales de StorefrontInsurance
 * - setItems
 * - specialistInsurerIds: specialist.insurers_relation, para el botón de
 *   prellenado (solo se ofrece mientras `items` está vacío)
 */
export default function StorefrontInsurerPicker({ storefrontId, items, setItems, specialistInsurerIds = [] }) {
  const [catalog, setCatalog] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [prefilling, setPrefilling] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    base44.entities.Insurer.list("name", 200).then((list) => {
      const sorted = [...list].sort((a, b) => {
        if (a.name === "Particular/Sin seguro") return 1;
        if (b.name === "Particular/Sin seguro") return -1;
        return a.name.localeCompare(b.name, "es");
      });
      setCatalog(sorted);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const addedByInsurerId = new Map(items.filter((i) => i.insurer_id).map((i) => [i.insurer_id, i]));

  // Las ya marcadas siempre van primero, para que "ver menos" nunca las
  // esconda -- de ahí en adelante, orden alfabético del catálogo.
  const sortedCatalog = useMemo(() => {
    const added = catalog.filter((c) => addedByInsurerId.has(c.id));
    const rest = catalog.filter((c) => !addedByInsurerId.has(c.id));
    return [...added, ...rest];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, items]);

  const visibleCount = showAll ? sortedCatalog.length : Math.max(COLLAPSED_COUNT, addedByInsurerId.size);
  const visibleCatalog = sortedCatalog.slice(0, visibleCount);

  const toggle = async (insurer) => {
    const existing = addedByInsurerId.get(insurer.id);
    setTogglingId(insurer.id);
    try {
      if (existing) {
        await base44.entities.StorefrontInsurance.delete(existing.id);
        setItems((prev) => prev.filter((i) => i.id !== existing.id));
      } else {
        const created = await base44.entities.StorefrontInsurance.create({
          storefront_id: storefrontId,
          insurer_id: insurer.id,
          name: insurer.name,
          logo_url: insurer.logo_url || null,
          position: items.length,
        });
        setItems((prev) => [...prev, created]);
      }
    } catch (e) {
      toast.error("Error: " + e.message);
    }
    setTogglingId(null);
  };

  const prefillFromProfile = async () => {
    const toAdd = catalog.filter((ins) => specialistInsurerIds.includes(ins.id) && !addedByInsurerId.has(ins.id));
    if (toAdd.length === 0) {
      toast.error("Tu perfil no tiene seguros capturados todavía");
      return;
    }
    setPrefilling(true);
    try {
      const created = await Promise.all(
        toAdd.map((ins, i) => base44.entities.StorefrontInsurance.create({
          storefront_id: storefrontId,
          insurer_id: ins.id,
          name: ins.name,
          logo_url: ins.logo_url || null,
          position: items.length + i,
        }))
      );
      setItems((prev) => [...prev, ...created]);
    } catch (e) {
      toast.error("Error: " + e.message);
    }
    setPrefilling(false);
  };

  return (
    <div>
      <h3 className="font-heading font-semibold text-sm text-foreground mb-3">Seguros que cubre</h3>
      {items.length === 0 && specialistInsurerIds.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={prefillFromProfile}
          disabled={prefilling}
          className="rounded-lg mb-3 gap-1.5"
        >
          {prefilling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Prellenar desde tu perfil
        </Button>
      )}
      {!loaded ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Cargando catálogo…</p>
      ) : (
        <>
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${showAll ? "max-h-72 overflow-y-auto pr-1" : ""}`}>
            {visibleCatalog.map((ins) => {
              const isAdded = addedByInsurerId.has(ins.id);
              return (
                <label
                  key={ins.id}
                  className="flex items-center gap-2 cursor-pointer border border-border/50 rounded-xl px-3 py-2 hover:bg-accent/30 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isAdded}
                    onChange={() => toggle(ins)}
                    disabled={togglingId === ins.id}
                    className="w-4 h-4 rounded border-input accent-primary"
                  />
                  <span className="text-sm text-foreground flex items-center gap-1.5 min-w-0">
                    {ins.logo_url ? (
                      <img src={ins.logo_url} alt={ins.name} className="w-4 h-4 object-contain flex-shrink-0" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                    )}
                    <span className="truncate">{ins.name}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {sortedCatalog.length > COLLAPSED_COUNT && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium text-brand-blue hover:text-brand-navy mt-2.5 transition-colors"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} />
              {showAll ? "Ver menos" : `Ver más (${sortedCatalog.length - visibleCatalog.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
