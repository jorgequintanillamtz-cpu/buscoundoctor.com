import React, { useState } from "react";
import { Menu, X, MessageCircle, Stethoscope } from "lucide-react";
import StorefrontHero from "./StorefrontHero";
import StorefrontInsurances from "./StorefrontInsurances";
import StorefrontLocation from "./StorefrontLocation";
import StorefrontTimeline from "./StorefrontTimeline";
import StorefrontFAQ from "./StorefrontFAQ";
import StorefrontProducts from "./StorefrontProducts";
import { buildWhatsAppLink } from "@/lib/storefrontUtils";
import { resolveStorefrontStyle, STOREFRONT_TEXT_OVERRIDE_CSS, WA_GREEN } from "@/lib/storefrontThemes";
import { resolveSections } from "@/lib/storefrontSections";

/**
 * Compone todas las secciones del storefront.
 * Se usa tanto en la página pública (/dr/:slug) como en el preview del admin
 * (en ese caso se pasa `embedded` para que el botón flotante y el menú no se
 * escapen del contenedor del preview).
 * Sin branding de BuscoUnDoctor: es la página personal del doctor.
 *
 * El hero (foto + nombre + botón de agendar cita) SIEMPRE va primero y no es
 * reordenable. Las demás secciones se renderizan en el orden de
 * `storefront.section_order`, omitiendo las que no tengan contenido.
 */
export default function StorefrontView({
  storefront,
  specialist,
  conditions = [],
  insurances = [],
  locations = [],
  timeline = [],
  faqs = [],
  products = [],
  embedded = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const theme = resolveStorefrontStyle(storefront);
  const doctorName = specialist?.full_name || "";
  // La página pública puede tener su propia foto de portada, independiente
  // de la del perfil real del directorio -- si no se ha subido una propia,
  // cae a la foto de perfil de siempre.
  const photo = storefront?.cover_photo || specialist?.profile_photo;
  const specialty = specialist?.specialty || "";
  const city = specialist?.city || "";
  const whatsappLink = buildWhatsAppLink(
    storefront?.whatsapp_phone,
    storefront?.whatsapp_message,
    doctorName
  );

  const data = { conditions, insurances, locations, timeline, faqs, products };
  const resolved = resolveSections(storefront?.section_order, data);

  // Menú lateral: todas las secciones con contenido EXCEPTO productos.
  const menuSections = resolved.filter((s) => s.id !== "products");

  const renderSection = (s) => {
    switch (s.id) {
      case "conditions":
        return (
          <section id="detalle" className="scroll-mt-4">
            <h2 className="flex items-center gap-2 font-heading font-bold text-lg text-white mb-3" style={{ fontFamily: theme.fontHeading }}>
              <Stethoscope className="w-5 h-5" style={{ color: theme.accent }} />
              Qué atiende
            </h2>
            <ul className="space-y-2">
              {conditions.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-2.5 rounded-xl px-4 py-2.5"
                  style={{ background: theme.card, border: `1px solid ${theme.border}`, boxShadow: theme.cardShadow }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: theme.accent }}
                  />
                  <span className="text-white/90 text-sm">{c.text}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      case "insurances":
        return <StorefrontInsurances items={insurances} theme={theme} />;
      case "location":
        return <StorefrontLocation items={locations} theme={theme} />;
      case "timeline":
        return <StorefrontTimeline items={timeline} theme={theme} />;
      case "faq":
        return <StorefrontFAQ items={faqs} theme={theme} />;
      case "products":
        return <StorefrontProducts items={products} theme={theme} storefrontSlug={storefront?.slug} />;
      default:
        return null;
    }
  };

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
      className="sf-root relative flex flex-col min-h-screen"
      data-sf-text={theme.textMode}
      style={{ background: theme.bg, fontFamily: theme.fontBody }}
    >
      {/* Con fondo claro, el texto blanco de siempre no se lee -- estas
          reglas reemplazan las clases text-white/* SOLO dentro de esta
          página (por el selector [data-sf-text="dark"]) cuando el doctor
          elige letra oscura desde el editor de estilo. Ganan por
          especificidad sobre la clase de Tailwind, sin necesitar !important. */}
      <style>{STOREFRONT_TEXT_OVERRIDE_CSS}</style>
      {/* Header tipo app */}
      <header
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: theme.accent }}
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
              style={{ color: theme.accentText, fontFamily: theme.fontHeading }}
            >
              {doctorName || "Mi página"}
            </p>
            {specialty && (
              <p
                className="text-xs leading-tight truncate"
                style={{ color: theme.accentText === "#FFFFFF" ? "rgba(255,255,255,0.75)" : "#6b6b66" }}
              >
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
          <Menu className="w-5 h-5" style={{ color: theme.accentText }} />
        </button>
      </header>

      {/* Menú deslizable */}
      {menuOpen && (
        <div className="absolute inset-0 z-50" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute right-0 top-0 h-full w-72 max-w-[85%] shadow-2xl p-5 flex flex-col"
            style={{ background: theme.accent }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <p className="font-heading font-bold text-base" style={{ color: theme.accentText, fontFamily: theme.fontHeading }}>
                Secciones
              </p>
              <button onClick={() => setMenuOpen(false)} className="p-1.5 rounded-lg" aria-label="Cerrar menú">
                <X className="w-5 h-5" style={{ color: theme.accentText }} />
              </button>
            </div>
            <nav className="space-y-1">
              {menuSections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.anchor}`}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-black/5"
                  style={{ color: theme.accentText }}
                >
                  {s.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Hero (fijo, siempre primero) */}
      <StorefrontHero
        name={doctorName}
        photo={photo}
        specialty={specialty}
        city={city}
        headline={storefront?.headline}
        conditions={conditions}
        whatsappPhone={storefront?.whatsapp_phone}
        whatsappMessage={storefront?.whatsapp_message}
        theme={theme}
      />

      {/* Secciones inferiores en el orden configurado */}
      <main className="max-w-md w-full mx-auto px-5 pb-10 space-y-8">
        {resolved.map((s) => (
          <React.Fragment key={s.id}>{renderSection(s)}</React.Fragment>
        ))}
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