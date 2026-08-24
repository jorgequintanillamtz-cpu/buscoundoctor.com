import { Input } from "@/components/ui/input";
import StepShell from "./StepShell";

// Paso 1 del wizard de registro de médicos ("Cuéntanos sobre ti"). Extraído
// de RegistroMedico.jsx a su propio componente para que tanto el registro
// real como AdminVistaRegistro.jsx (vista de previsualización del admin) lo
// importen del mismo lugar — cualquier cambio futuro a este paso se ve
// reflejado en ambos automáticamente, sin tener que mantenerlos en sync a mano.
export default function StepDatos({ data, update, error, specialties }) {
  return (
    <StepShell title="Cuéntanos sobre ti" subtitle="Así aparecerás en tu perfil público" error={error}>
      <div className="sm:col-span-2">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nombre completo</label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button type="button" onClick={() => update("title", "Dr.")}
            className={`h-10 rounded-xl border text-sm font-semibold transition-colors ${data.title === "Dr." ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-accent"}`}>
            Dr.
          </button>
          <button type="button" onClick={() => update("title", "Dra.")}
            className={`h-10 rounded-xl border text-sm font-semibold transition-colors ${data.title === "Dra." ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-accent"}`}>
            Dra.
          </button>
        </div>
        <Input value={data.full_name} onChange={(e) => update("full_name", e.target.value)} placeholder="Nombre completo" className="rounded-xl" />
      </div>

      <div className="sm:col-span-2">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">WhatsApp</label>
        <Input value={data.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder="Ej: 8181234567" type="tel" className="rounded-xl" />
        <p className="text-xs text-muted-foreground mt-1">Aquí te contactarán tus pacientes directamente</p>
      </div>

      <div className="sm:col-span-2">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Especialidad</label>
        <select value={specialties.some((s) => s.name === data.specialty) ? data.specialty : (data.specialty ? "__otra__" : "")}
          onChange={(e) => update("specialty", e.target.value === "__otra__" ? " " : e.target.value)}
          className="w-full h-11 px-3 text-sm bg-background border border-input rounded-xl mb-2">
          <option value="">Selecciona tu especialidad</option>
          {specialties.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          <option value="__otra__">Otra (no está en la lista)</option>
        </select>
        {(data.specialty === " " || (!specialties.some((s) => s.name === data.specialty) && data.specialty)) && (
          <Input value={data.specialty.trim()} onChange={(e) => update("specialty", e.target.value)} placeholder="Escribe tu especialidad" className="rounded-xl mb-2" />
        )}
        <Input value={data.subspecialty} onChange={(e) => update("subspecialty", e.target.value)} placeholder="Subespecialidad (opcional)" className="rounded-xl" />
      </div>

      <div className="sm:col-span-2">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cédula profesional</label>
        <Input value={data.cedula} onChange={(e) => update("cedula", e.target.value.replace(/\D/g, ""))} placeholder="Ej: 12345678" inputMode="numeric" className="rounded-xl" />
        <p className="text-xs text-muted-foreground mt-1">La verificamos manualmente antes de publicar tu perfil — le da confianza a tus pacientes.</p>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Años de experiencia (opcional)</label>
        <Input value={data.years_experience} onChange={(e) => update("years_experience", e.target.value.replace(/\D/g, ""))} placeholder="Ej: 8" inputMode="numeric" className="rounded-xl" />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Precio de consulta de primera vez (MXN)</label>
        <Input value={data.service_price} onChange={(e) => update("service_price", e.target.value.replace(/[^\d.]/g, ""))} placeholder="Ej: 800" inputMode="decimal" className="rounded-xl" />
        <p className="text-xs text-muted-foreground mt-1">Ayuda a tus pacientes a saber qué esperar. Podrás agregar más precios y servicios después desde tu panel.</p>
      </div>

      <div className="sm:col-span-2">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">¿Cómo atiendes?</label>
        <div className="grid grid-cols-3 gap-2">
          {[["presencial", "Presencial"], ["online", "En línea"], ["ambas", "Ambas"]].map(([val, label]) => (
            <button key={val} type="button" onClick={() => update("modality", val)}
              className={`h-11 rounded-xl border text-xs font-semibold transition-colors ${data.modality === val ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-accent"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </StepShell>
  );
}
