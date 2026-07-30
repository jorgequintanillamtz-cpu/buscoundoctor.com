import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppointmentForm from "./AppointmentForm";
import VerifiedSeal from "./profile/VerifiedSeal";
import { trackDoctorImpression } from "@/utils/trackDoctorStats";
import { trackDoctorClick } from "@/utils/trackDoctorClick";
import { base44 } from "@/api/base44Client";

const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

function getNext8Days() {
  return Array.from({ length: 8 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}

export default function SpecialistCard({ specialist, priority = false, sourcePage = "otro" }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [firstConsult, setFirstConsult] = useState(null);
  const cardRef = useRef(null);

  useEffect(() => {
    if (!specialist?.id) return;
    let active = true;
    base44.entities.SpecialistService.filter({ specialist_id: specialist.id })
      .then((services) => {
        if (!active || services.length === 0) return;
        const match = services.find((s) => (s.name || "").trim().toLowerCase() === "consulta por primera vez");
        if (match) {
          setFirstConsult({ name: match.name, price: match.price });
        } else {
          const cheapest = services.reduce((min, s) => (s.price < (min?.price ?? Infinity) ? s : min), null);
          if (cheapest) setFirstConsult({ name: cheapest.name, price: cheapest.price });
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [specialist?.id]);

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

  const handleDateClick = (e, date) => {
    e.preventDefault();
    setSelectedDate(date.toISOString().split('T')[0]);
    setShowForm(true);
  };
  return (
    <>
      <div ref={cardRef} className="group flex bg-card rounded-2xl border border-border/50 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden">
        {/* Left: main card info (clickable) */}
        <Link
          to={`/especialista/${specialist.slug}`}
          className="flex-1 block p-5 sm:p-6"
          onClick={() => trackDoctorClick(specialist, sourcePage)}
        >
          <div className="flex gap-4">
            <div className="w-24 h-24 sm:w-20 sm:h-20 rounded-2xl bg-accent flex-shrink-0 flex items-center justify-center overflow-hidden">
              {specialist.profile_photo ? (
                <img src={specialist.profile_photo} alt={specialist.full_name} loading={priority ? "eager" : "lazy"} className="w-full h-full object-cover" />
              ) : (
                <span className="font-heading font-bold text-xl text-primary">
                  {specialist.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {specialist.full_name}
                </h3>
                {specialist.license_verification_status === "verified" && (
                  <VerifiedSeal size="sm" className="flex-shrink-0" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                <span className="text-xs font-medium text-primary bg-accent px-2 py-0.5 rounded-full">
                  {specialist.specialty}
                </span>
                {specialist.subspecialty && (
                  <span className="text-xs text-muted-foreground">· {specialist.subspecialty}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {specialist.zone || specialist.location}
                </span>
                {specialist.rating != null && (
                  <span className="flex items-center gap-1 text-amber-500 font-medium">
                    {'★'.repeat(Math.round(specialist.rating))}{'☆'.repeat(5 - Math.round(specialist.rating))}
                    <span className="text-muted-foreground font-normal">{specialist.rating.toFixed(1)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {specialist.modality && (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full capitalize">
                  {specialist.modality}
                </span>
              )}
              {firstConsult && (
                <span className="text-xs text-muted-foreground">
                  {firstConsult.name}: <span className="font-medium text-foreground">${firstConsult.price.toLocaleString("es-MX")} MXN</span>
                </span>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="min-h-[44px] bg-accent text-accent-foreground text-xs gap-1 hover:bg-accent/80 lg:hidden"
              onClick={(e) => { e.preventDefault(); setSelectedDate(null); setShowForm(true); }}
            >
              Agendar cita <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="min-h-[44px] bg-accent text-accent-foreground text-xs gap-1 hover:bg-accent/80 hidden lg:inline-flex"
              onClick={(e) => { e.preventDefault(); setSelectedDate(null); setShowForm(true); }}
            >
              Agendar cita <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Link>

        {/* Right: date picker (desktop only) */}
        <div className="hidden lg:flex flex-col justify-center border-l border-border/50 p-5 w-52 flex-shrink-0">
          <p className="text-xs font-heading font-semibold text-foreground mb-0.5">Selecciona una fecha</p>
          <p className="text-xs text-muted-foreground mb-3">para agendar tu cita</p>
          <div className="grid grid-cols-4 gap-1.5">
            {getNext8Days().map((date, i) => (
              <button
                key={i}
                onClick={(e) => handleDateClick(e, date)}
                className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl border border-border/50 hover:border-primary hover:bg-accent transition-all text-center"
              >
                <span className="text-[10px] text-muted-foreground font-medium leading-tight">
                  {i === 0 ? 'Hoy' : DAYS[date.getDay()]}
                </span>
                <span className="text-xs font-heading font-bold text-foreground">
                  {date.getDate()}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {showForm && (
        <AppointmentForm
          specialist={specialist}
          initialDate={selectedDate}
          onClose={() => { setShowForm(false); setSelectedDate(null); }}
        />
      )}
    </>
  );
}