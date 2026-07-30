import { ShieldCheck, Building2, Star, MessageCircle } from "lucide-react";

// Tira de confianza justo debajo del hero. Cada badge solo se muestra si hay
// un dato real detrás — nunca inventamos cifras (ej. tiempos de respuesta)
// que hoy no medimos en la plataforma.
export default function TrustBadges({ specialist, primaryOffice, reviewCount = 0, avgRating }) {
  const badges = [];

  if (specialist.license_verification_status === "verified") {
    badges.push({
      key: "cedula",
      icon: ShieldCheck,
      label: "Cédula profesional verificada",
      className: "bg-emerald-50 border-emerald-200 text-emerald-700",
    });
  }

  const hospitalName = primaryOffice?.name || primaryOffice?.address_line;
  if (hospitalName) {
    badges.push({
      key: "hospital",
      icon: Building2,
      label: `Médico activo en ${hospitalName}`,
      className: "bg-brand-bluePale border-brand-blue/20 text-brand-navy",
    });
  }

  if (reviewCount > 0 && avgRating != null) {
    badges.push({
      key: "rating",
      icon: Star,
      label: `${avgRating.toFixed(1)} (${reviewCount} opinión${reviewCount !== 1 ? "es" : ""} verificada${reviewCount !== 1 ? "s" : ""})`,
      className: "bg-amber-50 border-amber-200 text-amber-700",
      iconClassName: "fill-amber-400 text-amber-400",
    });
  }

  if (specialist.whatsapp) {
    badges.push({
      key: "whatsapp",
      icon: MessageCircle,
      label: "Contacto directo por WhatsApp",
      className: "bg-green-50 border-green-200 text-green-700",
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-4" role="list" aria-label="Indicadores de confianza">
      {badges.map((b) => (
        <span
          key={b.key}
          role="listitem"
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${b.className}`}
        >
          <b.icon className={`w-3.5 h-3.5 flex-shrink-0 ${b.iconClassName || ""}`} />
          {b.label}
        </span>
      ))}
    </div>
  );
}
