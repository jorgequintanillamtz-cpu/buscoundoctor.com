import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useSpecialtyDisplay } from "@/hooks/useSpecialtyDisplay";
import useBodyScrollLock from "@/hooks/useBodyScrollLock";
import { genderSpecialty } from "@/lib/profileMeta";
import BookingFlow from "@/components/profile/BookingFlow";
import VerifiedSeal from "@/components/profile/VerifiedSeal";
import LoadingLogo from "@/components/LoadingLogo";

// Ventana de "Agendar cita" que se abre desde la tarjeta del listado. Es el MISMO formulario que la
// tarjeta "Agendar cita" del perfil (BookingFlow): así el paciente ve lo mismo desde cualquier lado y
// el doctor recibe siempre los mismos datos. Antes era un formulario aparte con foto grande, horarios
// inventados y otros campos. BookingFlow decide su estado inicial con los consultorios y servicios que
// recibe, por eso solo se dibuja cuando ya se cargaron.
export default function AppointmentForm({ specialist, onClose }) {
  useBodyScrollLock(true);
  const specialtyDisplay = useSpecialtyDisplay(specialist.specialty);
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [offices, services, insurers] = await Promise.all([
        base44.entities.Office.filter({ specialist_id: specialist.id }).catch(() => []),
        base44.entities.SpecialistService.filter({ specialist_id: specialist.id }).catch(() => []),
        base44.entities.Insurer.list("name", 300).catch(() => []),
      ]);
      if (cancelled) return;
      const accepted = (specialist.insurers_relation || [])
        .map((id) => insurers.find((i) => i.id === id))
        .filter(Boolean);
      setData({
        offices,
        services: [...services].sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
        insurers: accepted,
      });
    })();
    return () => { cancelled = true; };
  }, [specialist.id, specialist.insurers_relation]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const initials = (specialist.full_name || "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const license = specialist.professional_license_number;
  const licenseStatus = specialist.license_verification_status;
  const showLicense = license && licenseStatus !== "rejected";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Agendar cita con ${specialist.full_name}`}
        className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl border border-border/50 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        <div className="bg-brand-augusta text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="font-heading font-extrabold text-xl">Agendar cita</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 -mr-1.5 rounded-full hover:bg-white/15 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3.5 px-6 py-4 border-b border-border/50 flex-shrink-0">
          <div className="w-14 h-16 rounded-xl overflow-hidden bg-accent flex-shrink-0 flex items-center justify-center">
            {specialist.profile_photo ? (
              <img src={specialist.profile_photo} alt={`Foto de ${specialist.full_name}`} className="w-full h-full object-cover object-top" />
            ) : (
              <span className="font-heading font-bold text-lg text-primary/50">{initials}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-heading font-bold text-base text-foreground leading-snug">
              {specialist.full_name}
              {licenseStatus === "verified" && <span className="inline-block align-middle ml-2"><VerifiedSeal size="sm" /></span>}
            </p>
            <p className="text-sm text-muted-foreground">{genderSpecialty(specialtyDisplay, specialist.full_name)}</p>
            {showLicense && (
              <p className="text-xs text-muted-foreground">
                Cédula profesional: {license}{licenseStatus !== "verified" ? " · en verificación" : ""}
              </p>
            )}
          </div>
        </div>

        <div className="px-6 pt-5 pb-6 overflow-y-auto overscroll-contain">
          {data ? (
            <BookingFlow
              specialist={specialist}
              offices={data.offices}
              services={data.services}
              insurers={data.insurers}
            />
          ) : (
            <div className="py-10 flex justify-center"><LoadingLogo size="sm" /></div>
          )}
          <p className="text-xs text-muted-foreground border-t border-border/50 pt-4 mt-5">
            El contacto y la solicitud de cita son gratuitos.
          </p>
        </div>
      </div>
    </div>
  );
}
