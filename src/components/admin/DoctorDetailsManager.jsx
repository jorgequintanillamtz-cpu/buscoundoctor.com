import { Input } from "@/components/ui/input";
import ServicesManager from "./ServicesManager";

const MODALIDADES = [
  { value: "presencial", label: "Presencial" },
  { value: "online", label: "En línea" },
  { value: "ambas", label: "Ambas" },
];

export default function DoctorDetailsManager({ form, update, specialistId }) {
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
            <label className="text-xs font-medium mb-1 block">Modalidad</label>
            <select
              value={form.modality || ""}
              onChange={(e) => update("modality", e.target.value)}
              className="w-full h-9 pl-3 pr-8 text-sm bg-background border border-input rounded-xl appearance-none focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {MODALIDADES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {specialistId ? (
        <ServicesManager specialistId={specialistId} />
      ) : (
        <div className="bg-card rounded-2xl border border-border/50 p-5">
          <p className="text-sm text-muted-foreground text-center py-4">Guarda tu perfil primero para poder agregar tus servicios y precios.</p>
        </div>
      )}
    </div>
  );
}
