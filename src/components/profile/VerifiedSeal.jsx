import { BadgeCheck } from "lucide-react";

// Sello de "Verificado", inspirado en el badge de proveedor verificado de
// Alibaba pero en español y con la paleta de marca. Se muestra únicamente
// cuando license_verification_status === "verified" (autorizado a mano por
// un admin en el panel, tras revisar la cédula profesional) — nunca se
// activa por defecto ni se infiere de otros campos.
const SIZES = {
  sm: { icon: "w-3.5 h-3.5", text: "text-[11px]", pad: "pl-1.5 pr-2.5 py-1", gap: "gap-1" },
  md: { icon: "w-4 h-4", text: "text-xs", pad: "pl-2 pr-3 py-1.5", gap: "gap-1.5" },
  lg: { icon: "w-5 h-5", text: "text-sm", pad: "pl-2.5 pr-3.5 py-2", gap: "gap-1.5" },
};

export default function VerifiedSeal({ size = "md", className = "" }) {
  const s = SIZES[size] || SIZES.md;
  return (
    <span
      className={`inline-flex items-center ${s.gap} ${s.pad} rounded-full bg-brand-blue text-white font-heading font-bold ${s.text} tracking-tight shadow-sm ${className}`}
      title="Cédula profesional verificada por BuscoUnDoctor"
    >
      <BadgeCheck className={`${s.icon} flex-shrink-0`} strokeWidth={2.5} />
      Verificado
    </span>
  );
}
