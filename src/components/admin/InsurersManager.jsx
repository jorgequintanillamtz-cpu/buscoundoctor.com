import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ShieldCheck, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function InsurersManager({ form, update }) {
  const [insurers, setInsurers] = useState([]);
  const [customName, setCustomName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    base44.entities.Insurer.list("name", 100).then(setInsurers).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const toggleInsurer = (id) => {
    const cur = form.insurers_relation || [];
    update("insurers_relation", cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  };

  const addCustomInsurer = async () => {
    const name = customName.trim();
    if (!name) return;
    setSaving(true);
    try {
      // Si ya existe una aseguradora con ese nombre (sin importar may\u00fasculas), la reutilizamos.
      let insurer = insurers.find((i) => i.name.toLowerCase() === name.toLowerCase());
      if (!insurer) {
        insurer = await base44.entities.Insurer.create({ name });
        setInsurers((prev) => [...prev, insurer].sort((a, b) => a.name.localeCompare(b.name, "es")));
      }
      const cur = form.insurers_relation || [];
      if (!cur.includes(insurer.id)) {
        update("insurers_relation", [...cur, insurer.id]);
      }
      setCustomName("");
      toast.success(`"${name}" agregada`);
    } catch (e) {
      toast.error("Error al agregar aseguradora: " + e.message);
    }
    setSaving(false);
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

      <div className="pt-3 border-t border-border/40">
        <label className="text-xs font-medium mb-1.5 block">¿No encuentras tu aseguradora? Escríbela aquí</label>
        <div className="flex gap-2">
          <Input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Ej: Seguros Ve por Más"
            className="rounded-xl text-sm h-9"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomInsurer())}
          />
          <Button type="button" variant="outline" size="sm" className="rounded-xl h-9 px-3 flex-shrink-0" onClick={addCustomInsurer} disabled={saving || !customName.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
