import { useState, useEffect } from "react";
import { CheckCircle2, Star, Globe, Plus, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { base44 } from "@/api/base44Client";

const MODALIDADES = [
  { value: "presencial", label: "Presencial" },
  { value: "online", label: "En línea" },
  { value: "ambas", label: "Ambas" },
];

const PRECIOS = [
  { value: "$", label: "$ Económico" },
  { value: "$$", label: "$$ Moderado" },
  { value: "$$$", label: "$$$ Alto" },
  { value: "$$$$", label: "$$$$ Premium" },
];

const SelectBox = ({ value, onChange, options, placeholder }) => (
  <div className="relative">
    <select value={value || ""} onChange={e => onChange(e.target.value)}
      className="w-full h-9 pl-3 pr-8 text-sm bg-background border border-input rounded-xl appearance-none focus:outline-none focus:ring-1 focus:ring-ring">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
  </div>
);

export default function DoctorEditorSidebar({ form, update, onSaveDraft, saving }) {
  const completitud = form.completeness_score || 0;
  const [serviceInput, setServiceInput] = useState("");
  const [insurers, setInsurers] = useState([]);

  useEffect(() => {
    base44.entities.Insurer.list('name', 50).then(setInsurers).catch(() => {});
  }, []);

  const toggleInsurer = (id) => {
    const cur = form.insurers_relation || [];
    update("insurers_relation", cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
  };

  const addService = () => {
    const v = serviceInput.trim();
    if (v && !(form.services || []).includes(v)) update("services", [...(form.services || []), v]);
    setServiceInput("");
  };

  return (
    <div className="space-y-4 xl:sticky xl:top-4">

      {/* Publicación */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-4">
        <h3 className="font-heading font-semibold text-sm">Publicación</h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Globe className="w-4 h-4 text-blue-500" />
            Perfil activo (visible al público)
          </div>
          <Switch checked={!!form.active} onCheckedChange={v => update("active", v)} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Star className="w-4 h-4 text-amber-400" />
            Perfil destacado
          </div>
          <Switch checked={!!form.featured} onCheckedChange={v => update("featured", v)} />
        </div>

        <Button variant="outline" size="sm" onClick={onSaveDraft} disabled={saving} className="w-full rounded-xl">
          Guardar borrador
        </Button>

        <div className="space-y-1.5 pt-1 border-t border-border/40">
          <div className="flex justify-between text-xs">
            <span className="font-medium text-muted-foreground">Completitud del perfil</span>
            <span className={`font-semibold ${completitud >= 80 ? "text-green-600" : completitud >= 50 ? "text-amber-600" : "text-red-500"}`}>{completitud}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className={`h-2 rounded-full transition-all duration-500 ${completitud >= 80 ? "bg-green-500" : completitud >= 50 ? "bg-amber-400" : "bg-red-400"}`}
              style={{ width: `${completitud}%` }} />
          </div>
          {completitud >= 80 && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Perfil completo
            </p>
          )}
        </div>
      </div>

      {/* Datos profesionales */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-4">
        <h3 className="font-heading font-semibold text-sm">Datos profesionales</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium mb-1 block">Años de experiencia</label>
            <Input type="number" value={form.years_experience} onChange={e => update("years_experience", e.target.value)}
              className="rounded-xl text-sm" placeholder="10" min={0} max={60} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Calificación</label>
            <Input type="number" step="0.1" value={form.rating} onChange={e => update("rating", e.target.value)}
              className="rounded-xl text-sm" placeholder="4.7" min={0} max={5} />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium mb-1 block">Precio de consulta</label>
          <SelectBox value={form.price_range} onChange={v => update("price_range", v)} options={PRECIOS} />
        </div>

        <div>
          <label className="text-xs font-medium mb-1 block">Modalidad</label>
          <SelectBox value={form.modality} onChange={v => update("modality", v)} options={MODALIDADES} />
        </div>
      </div>

      {/* Servicios */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
        <h3 className="font-heading font-semibold text-sm">Servicios</h3>
        <div className="flex flex-wrap gap-1.5">
          {(form.services || []).map((s, i) => (
            <span key={i} className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
              {s}
              <button type="button" onClick={() => update("services", form.services.filter((_, j) => j !== i))}>
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={serviceInput} onChange={e => setServiceInput(e.target.value)} className="rounded-xl text-sm h-8"
            placeholder="Ej: Ortodoncia" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addService())} />
          <Button type="button" variant="outline" size="sm" className="rounded-xl h-8 px-2" onClick={addService}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Aseguradoras (catálogo Insurer) */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
        <h3 className="font-heading font-semibold text-sm">Aseguradoras aceptadas</h3>
        {insurers.length === 0 ? (
          <p className="text-xs text-muted-foreground">Cargando catálogo…</p>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {insurers.map(ins => (
              <label key={ins.id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={(form.insurers_relation || []).includes(ins.id)} onChange={() => toggleInsurer(ins.id)}
                  className="w-4 h-4 rounded border-input accent-primary" />
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  {ins.logo_url && <img src={ins.logo_url} alt={ins.name} className="w-4 h-4 object-contain" />}
                  {ins.name}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}