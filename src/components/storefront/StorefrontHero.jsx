import React from "react";
import { MessageCircle, ChevronDown } from "lucide-react";
import { CREAM, INK } from "@/lib/storefrontThemes";

/**
 * Hero del storefront: foto grande, pill de especialidad+ubicación,
 * título grande auto-generado, condiciones en línea, tagline en itálica
 * y dos CTAs apilados (Agenda / Conoce especialidades).
 */
export default function StorefrontHero({
  name,
  photo,
  specialty,
  city,
  headline,
  conditions = [],
  whatsappLink,
  theme,
}) {
  const pillText = [specialty, city && `${city}, MX`].filter(Boolean).join(" · ");
  const bigTitle =
    specialty && city
      ? `Especialista en ${specialty} en ${city}`
      : specialty
      ? `Especialista en ${specialty}`
      : name || "";
  const conditionsLine = conditions.map((c) => c.text).filter(Boolean).join(" · ");

  return (
    <section className="flex flex-col items-center text-center px-5 pt-10 pb-8">
      {/* Foto de perfil grande */}
      {photo ? (
        <img
          src={photo}
          alt={name}
          className="w-56 h-56 sm:w-60 sm:h-60 rounded-full object-cover mb-5"
          style={{ boxShadow: `0 0 0 5px ${CREAM}, 0 12px 30px rgba(0,0,0,0.25)` }}
        />
      ) : (
        <div
          className="w-56 h-56 sm:w-60 sm:h-60 rounded-full mb-5 flex items-center justify-center"
          style={{ background: theme.deep, boxShadow: `0 0 0 5px ${CREAM}` }}
        >
          <span className="text-6xl font-bold text-white">
            {name ? name.charAt(0).toUpperCase() : "?"}
          </span>
        </div>
      )}

      {/* Pill de especialidad + ubicación */}
      {pillText && (
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-white px-3.5 py-1.5 rounded-full mb-5 uppercase"
          style={{ background: theme.pill }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: CREAM }} />
          {pillText}
        </span>
      )}

      {/* Título grande */}
      <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white leading-tight max-w-sm">
        {bigTitle}
      </h1>

      {/* Condiciones en línea */}
      {conditionsLine && (
        <p className="text-white/90 text-sm mt-3 max-w-sm">{conditionsLine}</p>
      )}

      {/* Tagline en itálica */}
      {headline && (
        <p className="text-white/70 text-sm italic mt-3 max-w-sm">{headline}</p>
      )}

      {/* CTAs apilados */}
      <div className="w-full max-w-sm mt-7 space-y-3">
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-2xl active:scale-[0.98] transition-transform"
          style={{ background: CREAM, color: INK }}
        >
          <MessageCircle className="w-5 h-5" />
          Agenda tu valoración
        </a>
        <a
          href="#detalle"
          className="w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-2xl border-2 text-white transition-colors"
          style={{ borderColor: "rgba(255,255,255,0.6)" }}
        >
          Conoce mis especialidades
          <ChevronDown className="w-4 h-4" />
        </a>
      </div>
    </section>
  );
}