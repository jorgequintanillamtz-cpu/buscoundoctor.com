import React, { useState } from "react";
import { Menu, X, MessageCircle, Stethoscope } from "lucide-react";
import StorefrontHero from "./StorefrontHero";
import StorefrontInsurances from "./StorefrontInsurances";
import StorefrontLocation from "./StorefrontLocation";
import StorefrontTimeline from "./StorefrontTimeline";
import StorefrontFAQ from "./StorefrontFAQ";
import { buildWhatsAppLink } from "@/lib/storefrontUtils";
import { getStorefrontTheme, CREAM, INK, WA_GREEN } from "@/lib/storefrontThemes";

/**
 * Compone todas las secciones del storefront.
 * Se usa tanto en la página pública (/dr/:slug) como en el preview del admin
 * (en ese caso se pasa `embedded` para que el botón flotante y el menú no se
 * escapen del contenedor del preview).
 * Sin branding de BuscoUnDoctor: es la página personal del doctor.
 */
export default function StorefrontView({
  storefront,
  specialist,
  conditions = [],
  insurances = [],
  locations = [],
  timeline = [],
  faqs = [],
  embedded = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const theme = getStorefrontTheme(storefront?.color_theme);
  const doctorName = specialist?.full_name || "";
  const photo = specialist?.profile_photo;
  const specialty = specialist?.specialty || "";
  const city = specialist?.city || "";
  const whatsappLink = buildWhatsAppLink(
    storefront?.whatsapp_phone,
    storefront?.whatsapp_message,
    doctorName
  );

  const sections = [
    { id: "detalle", label: "Especialidades" },
    insurances.length > 0 && { id: "seguros", label: "Seguros" },
    locations.length > 0 && { id: "ubicacion", label: "Ubicación" },
    timeline.length > 0 && { id: "trayectoria", label: "Trayectoria" },
    faqs.length > 0 && { id: "preguntas", label: "Preguntas frecuentes" },
  ].filter(Boolean);

  const fab = (
    <a
      href={whatsappLink}
      target="_blank"
      rel="noopener noreferrer"
      className="pointer-events-auto flex items-center justify-center w-14 h-14 rounded-full shadow-lg active:scale-95 transition-transform"
      style={{ background: WA_GREEN }}
      aria-label="Agendar por WhatsApp"
    >
      <MessageCircle className="w-7 h-7 text-white" />
    </a>
  );

  return (
    <div
      className="relative flex flex-col min-h-screen"
      style={{ background: theme.bg }}
    >
      {/* Header tipo app */}
      <header
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: CREAM }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: theme.bg }}
          >
            <Stethoscope className="w-4 h-4 text-white" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p
              className="font-heading font-bold text-sm leading-tight truncate"
              style={{ color: INK }}
            >
              {doctorName || "Mi página"}
            </p>
            {specialty && (
              <p className="text-xs leading-tight truncate" style={{ color: "#6b6b66" }}>
                {specialty}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => setMenuOpen(true)}
          className="p-1.5 rounded-lg flex-shrink-0"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" style={{ color: INK }} />
        </button>
      </header>

      {/* Menú deslizable */}
      {menuOpen && (
        <div className="absolute inset-0 z-50" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute right-0 top-0 h-full w-72 max-w-[85%] shadow-2xl p-5 flex flex-col"
            style={{ background: CREAM }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <p className="font-heading font-bold text-base" style={{ color: INK }}>
                Secciones
              </p>
              <button onClick={() => setMenuOpen(false)} className="p-1.5 rounded-lg" aria-label="Cerrar menú">
                <X className="w-5 h-5" style={{ color: INK }} />
              </button>
            </div>
            <nav className="space-y-1">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-black/5"
                  style={{ color: INK }}
                >
                  {s.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Hero */}
      <StorefrontHero
        name={doctorName}
        photo={photo}
        specialty={specialty}
        city={city}
        headline={storefront?.headline}
        conditions={conditions}
        whatsappLink={whatsappLink}
        theme={theme}
      />

      {/* Secciones inferiores */}
      <main id="detalle" className="max-w-md w-full mx-auto px-5 pb-10 space-y-8 scroll-mt-4">
        {insurances.length > 0 && <StorefrontInsurances items={insurances} theme={theme} />}
        {locations.length > 0 && <StorefrontLocation items={locations} theme={theme} />}
        {timeline.length > 0 && <StorefrontTimeline items={timeline} theme={theme} />}
        {faqs.length > 0 && <StorefrontFAQ items={faqs} theme={theme} />}
      </main>

      {/* Pill de dominio */}
      <div className="text-center pb-6">
        <span
          className="inline-block text-xs px-3 py-1.5 rounded-full text-white/70"
          style={{ background: theme.pill }}
        >
          buscoundoctor.com/dr/{storefront?.slug || ""}
        </span>
      </div>

      {/* Botón flotante de WhatsApp */}
      {embedded ? (
        <div className="sticky bottom-4 flex justify-end pr-4 pb-4 pointer-events-none">
          {fab}
        </div>
      ) : (
        <div className="fixed bottom-5 right-5 z-40 pointer-events-none">{fab}</div>
      )}
    </div>
  );
}