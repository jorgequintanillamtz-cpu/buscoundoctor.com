import React, { useState, useMemo } from "react";
import { MessageCircle, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { buildWhatsAppLink } from "@/lib/storefrontUtils";

const WEEKDAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie"];
const WEEK_LABELS = ["Esta semana", "Próxima semana", "En 2 semanas"];
const MAX_WEEK_OFFSET = 2; // semana actual + 2 siguientes

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Dom..6=Sáb
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

// Lunes a viernes de la semana de calendario (hoy + offset semanas).
function getWeekdays(weekOffset) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = addDays(getMonday(today), weekOffset * 7);
  return Array.from({ length: 5 }, (_, i) => addDays(monday, i));
}

/**
 * Selector de día (semana actual + próximas 2, solo lunes a viernes) para
 * que el visitante indique en qué día le interesaría agendar. Al
 * seleccionar uno, se agrega al mensaje prellenado de WhatsApp del botón
 * "Agenda tu valoración". Los días de la semana actual que ya pasaron
 * quedan deshabilitados.
 */
function WeekDayPicker({ theme, selectedDate, onSelect }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const days = useMemo(() => getWeekdays(weekOffset), [weekOffset]);
  const today = useMemo(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }, []);

  return (
    <div className="w-full max-w-sm mb-4">
      <div className="flex items-center justify-between mb-2.5">
        <button
          type="button"
          onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
          disabled={weekOffset === 0}
          aria-label="Semana anterior"
          className="p-1.5 rounded-full text-white/70 disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-white/80 uppercase tracking-wide">
          <Calendar className="w-3.5 h-3.5" />
          {WEEK_LABELS[weekOffset]}
        </p>
        <button
          type="button"
          onClick={() => setWeekOffset((w) => Math.min(MAX_WEEK_OFFSET, w + 1))}
          disabled={weekOffset === MAX_WEEK_OFFSET}
          aria-label="Semana siguiente"
          className="p-1.5 rounded-full text-white/70 disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {days.map((d) => {
          const isSelected = selectedDate && sameDay(d, selectedDate);
          const isPast = d < today;
          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={isPast}
              onClick={() => onSelect(isSelected ? null : d)}
              className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-transform disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: theme.accent,
                color: theme.accentText,
                boxShadow: isSelected ? `0 0 0 2px ${theme.accentText}` : "none",
              }}
            >
              <span className="text-[10px] font-medium opacity-70">{WEEKDAY_SHORT[d.getDay() - 1]}</span>
              <span className="text-sm font-bold">{d.getDate()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Hero del storefront: foto grande, pill de especialidad+ubicación,
 * título grande auto-generado, condiciones en línea, tagline en itálica,
 * selector de día y el CTA de WhatsApp.
 */
export default function StorefrontHero({
  name,
  photo,
  specialty,
  city,
  headline,
  conditions = [],
  whatsappPhone,
  whatsappMessage,
  theme,
}) {
  const [selectedDate, setSelectedDate] = useState(null);

  const pillText = [specialty, city && `${city}, MX`].filter(Boolean).join(" · ");
  const bigTitle =
    specialty && city
      ? `Especialista en ${specialty} en ${city}`
      : specialty
      ? `Especialista en ${specialty}`
      : name || "";
  const conditionsLine = conditions.map((c) => c.text).filter(Boolean).join(" · ");

  const baseMessage = (whatsappMessage && whatsappMessage.trim()) || `Hola, quiero agendar una cita con el/la Dr. ${name || ""}`;
  const finalMessage = selectedDate
    ? `${baseMessage} Me interesa una cita el ${selectedDate.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}.`
    : baseMessage;
  const whatsappLink = buildWhatsAppLink(whatsappPhone, finalMessage, name);

  return (
    <section className="flex flex-col items-center text-center px-5 pt-10 pb-8">
      {/* Foto de perfil grande */}
      {photo ? (
        <img
          src={photo}
          alt={name}
          className="w-56 h-56 sm:w-60 sm:h-60 rounded-full object-cover mb-5"
          style={{ boxShadow: `0 0 0 5px ${theme.accent}, 0 12px 30px rgba(0,0,0,0.25)` }}
        />
      ) : (
        <div
          className="w-56 h-56 sm:w-60 sm:h-60 rounded-full mb-5 flex items-center justify-center"
          style={{ background: theme.deep, boxShadow: `0 0 0 5px ${theme.accent}` }}
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
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: theme.accent }} />
          {pillText}
        </span>
      )}

      {/* Título grande */}
      <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white leading-tight max-w-sm" style={{ fontFamily: theme.fontHeading }}>
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

      {/* Selector de día + CTA de WhatsApp */}
      <div className="w-full max-w-sm mt-7 flex flex-col items-center">
        <WeekDayPicker theme={theme} selectedDate={selectedDate} onSelect={setSelectedDate} />
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-2xl active:scale-[0.98] transition-transform"
          style={{ background: theme.accent, color: theme.accentText }}
        >
          <MessageCircle className="w-5 h-5" />
          Agenda tu valoración
        </a>
      </div>
    </section>
  );
}
