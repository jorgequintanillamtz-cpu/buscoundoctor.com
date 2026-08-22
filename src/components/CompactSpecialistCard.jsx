import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, BadgeCheck } from "lucide-react";
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
    // Tarjeta ancha a propósito (w-56/60): la primera versión era angosta y
    // cortaba el nombre completo con "…" y el sello "Verificado" (con texto)
    // no cabía — Jorge pidió que el nombre se vea completo y que verificado
    // sea solo una palomita chica junto al nombre, sin la pastilla azul.
    <Link
      ref={cardRef}
      to={`/especialista/${specialist.slug}`}
      onClick={() => trackDoctorClick(specialist, sourcePage)}
      className="group flex-shrink-0 w-56 sm:w-60 snap-start bg-card rounded-2xl border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 p-4 flex flex-col"
    >
      {/* object-contain (no object-cover): antes recortaba la foto para
          rellenar el recuadro y a veces se comía parte de la cara/cuerpo del
          doctor. Ahora se ve la foto completa siempre, con un pequeño marco
          de color de fondo si la proporción no calza exacto. */}
      <div className="w-full aspect-[4/3] rounded-xl bg-accent overflow-hidden flex items-center justify-center mb-3">
        {specialist.profile_photo ? (
          <img
            src={specialist.profile_photo}
            alt={specialist.full_name}
            loading="lazy"
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="font-heading font-bold text-2xl text-primary">
            {specialist.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </span>
        )}
      </div>

      <div className="flex items-start gap-1.5">
        <h3 className="font-heading font-semibold text-sm text-foreground group-hover:text-primary transition-colors leading-snug flex-1 min-w-0">
          {specialist.full_name}
        </h3>
        {specialist.license_verification_status === "verified" && (
          <BadgeCheck
            className="w-4 h-4 text-brand-blue flex-shrink-0 mt-0.5"
            strokeWidth={2.5}
            aria-label="Verificado"
          >
            <title>Cédula profesional verificada por BuscoUnDoctor</title>
          </BadgeCheck>
        )}
      </div>

      <span className="text-[11px] font-medium text-primary bg-accent px-2 py-0.5 rounded-full w-fit mt-1.5 line-clamp-1">
        {specialist.specialty}
      </span>

      {specialist.years_experience > 0 && (
        <span className="text-xs text-muted-foreground mt-1.5">
          {specialist.years_experience} {specialist.years_experience === 1 ? "año" : "años"} de experiencia
        </span>
      )}

      {specialist.rating != null && (
        <span className="flex items-center gap-1 text-amber-500 text-xs font-medium mt-1.5">
          {'★'.repeat(Math.round(specialist.rating))}{'☆'.repeat(5 - Math.round(specialist.rating))}
          <span className="text-muted-foreground font-normal">{specialist.rating.toFixed(1)}</span>
        </span>
      )}

      <span className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5 min-w-0">
        <MapPin className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{specialist.zone || specialist.location}</span>
      </span>
    </Link>
  );
}
