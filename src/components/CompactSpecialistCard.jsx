import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import VerifiedSeal from "./profile/VerifiedSeal";
import { trackDoctorImpression } from "@/utils/trackDoctorStats";
import { trackDoctorClick } from "@/utils/trackDoctorClick";

// Tarjeta chica para sliders horizontales (ej. "Compara con otros X cerca de
// ti"): solo lo esencial para reconocer al doctor de un vistazo — foto,
// nombre, especialidad, zona, rating. A diferencia de SpecialistCard (la
// tarjeta grande del directorio), aquí NO hay selector de fecha ni botón de
// "Agendar cita" propio: toda la tarjeta es un link al perfil, donde ya vive
// el flujo completo de reserva (BookingSidebar/BookingFlow).
export default function CompactSpecialistCard({ specialist, sourcePage = "similares" }) {
  const cardRef = useRef(null);

  useEffect(() => {
    if (!specialist?.id) return;
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        trackDoctorImpression(specialist);
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [specialist?.id]);

  return (
    <Link
      ref={cardRef}
      to={`/especialista/${specialist.slug}`}
      onClick={() => trackDoctorClick(specialist, sourcePage)}
      className="group flex-shrink-0 w-[160px] sm:w-[184px] snap-start bg-card rounded-2xl border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 p-3.5 flex flex-col"
    >
      <div className="w-full aspect-square rounded-xl bg-accent overflow-hidden flex items-center justify-center mb-3">
        {specialist.profile_photo ? (
          <img
            src={specialist.profile_photo}
            alt={specialist.full_name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-heading font-bold text-2xl text-primary">
            {specialist.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </span>
        )}
      </div>

      <div className="flex items-start gap-1">
        <h3 className="font-heading font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1 flex-1 min-w-0">
          {specialist.full_name}
        </h3>
        {specialist.license_verification_status === "verified" && (
          <VerifiedSeal size="sm" className="flex-shrink-0 mt-0.5" />
        )}
      </div>

      <span className="text-[11px] font-medium text-primary bg-accent px-2 py-0.5 rounded-full w-fit mt-1.5 line-clamp-1">
        {specialist.specialty}
      </span>

      <div className="flex items-center justify-between gap-2 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1 min-w-0">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{specialist.zone || specialist.location}</span>
        </span>
        {specialist.rating != null && (
          <span className="flex items-center gap-0.5 text-amber-500 font-medium flex-shrink-0">
            ★ <span className="text-foreground">{specialist.rating.toFixed(1)}</span>
          </span>
        )}
      </div>
    </Link>
  );
}
