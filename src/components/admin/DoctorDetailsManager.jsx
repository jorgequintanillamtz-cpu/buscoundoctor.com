import { Input } from "@/components/ui/input";
import { ChevronDown } from "lucide-react";

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
            <label className="text-xs font-medium mb-1 block">Precio de consulta desde (MXN)</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                value={form.price_from || ""}
                onChange={(e) => update("price_from", e.target.value)}
                className="rounded-xl text-sm pl-6"
                placeholder="500"
                min={0}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Se mostrará como “Desde ${form.price_from || "500"} MXN” en tu perfil.</p>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Rango de precio</label>
            <SelectBox value={form.price_range} onChange={(v) => update("price_range", v)} options={PRECIOS} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium mb-1 block">Modalidad</label>
            <SelectBox value={form.modality} onChange={(v) => update("modality", v)} options={MODALIDADES} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground pt-1 border-t border-border/40">
          Para listar tus servicios con precios específicos, usa la sección "Servicios y precios".
        </p>
      </div>
    </div>
  );
}
