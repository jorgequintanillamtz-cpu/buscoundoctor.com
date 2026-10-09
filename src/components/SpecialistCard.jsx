import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Banknote, Building2, BriefcaseMedical, ShieldPlus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppointmentForm from "./AppointmentForm";
import VerifiedSeal from "./profile/VerifiedSeal";
import { trackDoctorImpression } from "@/utils/trackDoctorStats";
import { trackDoctorClick } from "@/utils/trackDoctorClick";
import { useSpecialtyDisplay } from "@/hooks/useSpecialtyDisplay";
import { loadCardExtras, loadInsurerMap } from "@/lib/cardExtras";
import { genderSpecialty } from "@/lib/profileMeta";

// Tarjeta de médico del listado (la única que hay; CLAUDE.md §8q). Diseño "opción 2" elegido por
// Jorge el 2026-10-09: datos de confianza al frente (hospital, años de experiencia, seguros, precio
// de la consulta), calificación y número de opiniones reales, y dos botones: "Ver perfil" y
// "Agendar cita" (verde). Se quitaron las fechas de la derecha: daban a entender que había
// disponibilidad y solo abrían una solicitud. Cada dato solo sale si existe.

export default function SpecialistCard({ specialist, priority = false, sourcePage = "otro" }) {
  const specialtyDisplay = useSpecialtyDisplay(specialist.specialty);
  const [showForm, setShowForm] = useState(false);
  const [extras, setExtras] = useState(null);
  const [insurerNames, setInsurerNames] = useState([]);
  const cardRef = useRef(null);

  useEffect(() => {
    if (!specialist?.id) return;
    let active = true;
    loadCardExtras(specialist.id).then((e) => { if (active) setExtras(e); });
    return () => { active = false; };
  }, [specialist?.id]);

  useEffect(() => {
    const ids = specialist?.insurers_relation || [];
    if (ids.length === 0) { setInsurerNames([]); return; }
    let active = true;
    loadInsurerMap().then((map) => {
      if (active) setInsurerNames(ids.map((id) => map.get(id)).filter(Boolean));
    });
    return () => { active = false; };
  }, [specialist?.insurers_relation]);

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

  const specialtyName = genderSpecialty(specialtyDisplay, specialist.full_name);
  const reviewCount = extras?.review_count || 0;
  const reviewAvg = extras?.review_avg != null ? Number(extras.review_avg) : null;
  const price = extras?.consult_price != null ? Number(extras.consult_price) : null;
  const n = insurerNames.length;

  const facts = [];
  if (extras?.office_name) facts.push({ icon: Building2, text: extras.office_name });
  if (specialist.years_experience > 0) facts.push({ icon: BriefcaseMedical, text: `${specialist.years_experience} años de experiencia` });
  if (n > 0) facts.push({ icon: ShieldPlus, text: `Acepta ${insurerNames.slice(0, 2).join(", ")}${n > 2 ? ` y ${n - 2} más` : ""}` });
  if (price) facts.push({ icon: Banknote, text: `Consulta desde $${price.toLocaleString("es-MX")}` });

  const factsList = (cls) => facts.length > 0 && (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2 ${cls}`}>
      {facts.map((f) => (
        <div key={f.text} className="flex items-center gap-2 text-sm text-foreground min-w-0">
          <span className="w-6 h-6 rounded-md bg-brand-bluePale text-brand-blue flex items-center justify-center flex-shrink-0">
            <f.icon className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
          <span className="truncate">{f.text}</span>
        </div>
      ))}
    </div>
  );

  const stars = (avg, cls) => (
    <span className={`text-amber-400 tracking-tight ${cls}`} aria-hidden="true">
      {"★".repeat(Math.round(avg))}{"☆".repeat(5 - Math.round(avg))}
    </span>
  );

  return (
    <>
      <div ref={cardRef} className="group bg-card rounded-2xl border border-border/50 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden">
        <Link
          to={`/especialista/${specialist.slug}`}
          className="block p-5 sm:p-6"
          onClick={() => trackDoctorClick(specialist, sourcePage)}
        >
          <div className="flex gap-4 sm:gap-5">
            <div className="w-24 h-28 sm:w-[104px] sm:h-[120px] rounded-[1.4rem] bg-accent flex-shrink-0 flex items-center justify-center overflow-hidden">
              {specialist.profile_photo ? (
                <img src={specialist.profile_photo} alt={specialist.full_name} loading={priority ? "eager" : "lazy"} className="w-full h-full object-cover object-top" />
              ) : (
                <span className="font-heading font-bold text-2xl text-primary">
                  {specialist.full_name?.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-lg leading-snug text-foreground group-hover:text-primary transition-colors">
                    {specialist.full_name}
                    {specialist.license_verification_status === "verified" && (
                      <span className="inline-block align-middle ml-2"><VerifiedSeal size="sm" /></span>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {specialtyName}
                    {specialist.subspecialty && <> {"·"} {specialist.subspecialty}</>}
                    {(specialist.zone || specialist.location) && <> {"·"} {specialist.zone || specialist.location}</>}
                  </p>
                  {reviewCount > 0 && reviewAvg != null && (
                    <p className="sm:hidden text-xs mt-1.5 flex items-center gap-1.5">
                      {stars(reviewAvg, "text-sm")}
                      <span className="font-semibold text-foreground">{reviewAvg.toFixed(1)}</span>
                      <span className="text-muted-foreground">({reviewCount})</span>
                    </p>
                  )}
                </div>
                {reviewCount > 0 && reviewAvg != null && (
                  <div className="hidden sm:block text-right flex-shrink-0">
                    <p className="font-heading font-bold text-xl text-foreground leading-none">{reviewAvg.toFixed(1)}</p>
                    {stars(reviewAvg, "text-xs")}
                    <p className="text-xs text-muted-foreground">{reviewCount} opinión{reviewCount !== 1 ? "es" : ""}</p>
                  </div>
                )}
              </div>

              {/* Escritorio: los datos van junto a la foto; en celular, debajo y a todo el ancho */}
              <div className="hidden sm:block">{factsList("mt-3.5")}</div>
            </div>
          </div>

          <div className="sm:hidden">{factsList("mt-4")}</div>

          <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-end gap-2.5">
            <span className="inline-flex items-center justify-center flex-1 sm:flex-none min-h-[44px] px-4 rounded-xl border border-border bg-card text-sm font-medium text-foreground group-hover:border-primary/40 transition-colors">
              Ver perfil
            </span>
            <Button
              size="sm"
              className="flex-1 sm:flex-none min-h-[44px] px-5 rounded-xl gap-2 bg-brand-augusta hover:bg-brand-augusta/90 text-white text-sm font-semibold"
              onClick={(e) => { e.preventDefault(); setShowForm(true); }}
            >
              <Calendar className="w-4 h-4" /> Agendar cita
            </Button>
          </div>
        </Link>
      </div>

      {showForm && (
        <AppointmentForm
          specialist={specialist}
          initialDate={null}
          onClose={() => setShowForm(false)}
        />
      )}
    </>
  );
}
