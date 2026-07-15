import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ShieldCheck } from "lucide-react";

export default function InsurersManager({ form, update }) {
  const [insurers, setInsurers] = useState([]);

  useEffect(() => {
    base44.entities.Insurer.list("name", 50).then(setInsurers).catch(() => {});
  }, []);

  const toggleInsurer = (id) => {
    const cur = form.insurers_relation || [];
    update("insurers_relation", cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">Aseguradoras aceptadas</h2>
      </div>
      {insurers.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Cargando catálogo…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {insurers.map((ins) => (
            <label key={ins.id} className="flex items-center gap-2 cursor-pointer border border-border/50 rounded-xl px-3 py-2 hover:bg-accent/30 transition-colors">
              <input
                type="checkbox"
                checked={(form.insurers_relation || []).includes(ins.id)}
                onChange={() => toggleInsurer(ins.id)}
                className="w-4 h-4 rounded border-input accent-primary"
              />
              <span className="text-sm text-foreground flex items-center gap-1.5">
                {ins.logo_url && <img src={ins.logo_url} alt={ins.name} className="w-4 h-4 object-contain" />}
                {ins.name}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
