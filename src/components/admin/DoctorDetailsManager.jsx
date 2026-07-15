import { useState } from "react";
import { Plus, X, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-9 pl-3 pr-8 text-sm bg-background border border-input rounded-xl appearance-none focus:outline-none focus:ring-1 focus:ring-ring"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
    <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
  </div>
);

export default function DoctorDetailsManager({ form, update }) {
  const [serviceInput, setServiceInput] = useState("");

  const addService = () => {
    const v = serviceInput.trim();
    if (v && !(form.services || []).includes(v)) update("services", [...(form.services || []), v]);
    setServiceInput("");
  };

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
        <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">Detalles de consulta</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium mb-1 block">Años de experiencia</label>
            <Input
              type="number"
              value={form.years_experience}
              onChange={(e) => update("years_experience", e.target.value)}
              className="rounded-xl text-sm"
              placeholder="10"
              min={0}
              max={60}
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Precio de consulta</label>
            <SelectBox value={form.price_range} onChange={(v) => update("price_range", v)} options={PRECIOS} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium mb-1 block">Modalidad</label>
            <SelectBox value={form.modality} onChange={(v) => update("modality", v)} options={MODALIDADES} />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-3">
        <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">Servicios que ofreces</h2>
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
          <Input
            value={serviceInput}
            onChange={(e) => setServiceInput(e.target.value)}
            className="rounded-xl text-sm h-8"
            placeholder="Ej: Ortodoncia"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addService())}
          />
          <Button type="button" variant="outline" size="sm" className="rounded-xl h-8 px-2" onClick={addService}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
