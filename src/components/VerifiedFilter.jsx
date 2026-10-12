import { Switch } from "@/components/ui/switch";
import VerifiedSeal from "@/components/profile/VerifiedSeal";

// Filtro "solo médicos verificados" de los listados (/especialistas y páginas de especialidad).
// Usa el mismo sello azul "Verificado" que ven los pacientes en las tarjetas y en el perfil, para
// que se entienda de inmediato qué se está filtrando. "Verificado" = license_verification_status
// "verified" (cédula revisada por el equipo), igual que el sello.
export const isVerifiedSpecialist = (s) => s.license_verification_status === "verified";

export default function VerifiedFilter({ checked, onChange }) {
  return (
    <label
      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
        checked ? "border-brand-blue bg-brand-bluePale" : "border-border/60 hover:border-brand-blue/40"
      }`}
    >
      <span className="flex flex-col items-start gap-1 min-w-0">
        <VerifiedSeal size="sm" />
        <span className="text-xs text-muted-foreground leading-snug">Cédula revisada por BuscoUnDoctor</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label="Mostrar solo médicos verificados" />
    </label>
  );
}
