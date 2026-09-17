import { Input } from "@/components/ui/input";
import ServicesManager from "./ServicesManager";

const MODALIDADES = [
  { value: "presencial", label: "Presencial" },
  { value: "online", label: "En línea" },
  { value: "ambas", label: "Ambas" },
];

const PAYMENT_METHODS = [
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
  { value: "efectivo", label: "Efectivo" },
];

// Mismos valores y etiquetas que el filtro de precio en /especialistas y
// /especialidad/:slug (SpecialistList.jsx, SpecialtyPage.jsx) -- si cambian
// ahí, cambiar también aquí para que coincidan.
const PRICE_RANGES = [
  { value: "$", label: "$ Económico" },
  { value: "$$", label: "$$ Moderado" },
  { value: "$$$", label: "$$$ Alto" },
  { value: "$$$$", label: "$$$$ Premium" },
];

export default function DoctorDetailsManager({ form, update, specialistId }) {
  return (
    <div className="space-y-5">
      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
        <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">Detalles de consulta</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
          <div>
            <label className="text-xs font-medium mb-1 block">Rango de precio</label>
            <select
              value={form.price_range || "$$"}
              onChange={(e) => update("price_range", e.target.value)}
              className="w-full h-9 pl-3 pr-8 text-sm bg-background border border-input rounded-xl appearance-none focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {PRICE_RANGES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-3">
        <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">Métodos de pago aceptados</h2>
        <p className="text-xs text-muted-foreground -mt-2">Se muestran en tu perfil público. Deja sin marcar los que no aceptes — no se muestra nada inventado.</p>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((m) => {
            const checked = (form.payment_methods || []).includes(m.value);
            return (
              <label key={m.value} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl border cursor-pointer transition-colors ${checked ? "border-primary bg-accent/40" : "border-border/60"}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...(form.payment_methods || []), m.value]
                      : (form.payment_methods || []).filter((v) => v !== m.value);
                    update("payment_methods", next);
                  }}
                  className="w-4 h-4 accent-primary"
                />
                {m.label}
              </label>
            );
          })}
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
