import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { MAX_SERVICES } from "@/lib/recommendationTags";

// "¿Para qué lo recomiendas?" (paso 2 de /, la página de recomendaciones; 2026-10-30, pedido de David).
// Chips con los servicios ACTIVOS de la especialidad del doctor (public.specialty_service), hasta MAX_SERVICES.
// Es opcional: sin servicios la recomendación vale igual y sigue contando. Sin opciones no se dibuja nada.
// El padre le pone `key` por especialidad, así al cambiar de doctor se reinicia solo.
// Los servicios nunca se muestran junto al nombre de quien recomienda: solo se guardan (conteos en otro bloque).
const VISIBLE = 8; // los primeros 8 por display_order; el resto bajo "Ver más servicios"

export default function RecommendationServicePicker({ options, value, onChange, she }) {
  const [expanded, setExpanded] = useState(false);
  const [onlyRecommend, setOnlyRecommend] = useState(false);
  if (!options || options.length === 0) return null;

  const hiddenSelected = options.slice(VISIBLE).some((o) => value.includes(o.slug));
  const showAll = expanded || hiddenSelected; // un servicio elegido nunca queda escondido
  const shown = showAll ? options : options.slice(0, VISIBLE);
  const full = value.length >= MAX_SERVICES;
  const toggle = (slug) => {
    setOnlyRecommend(false);
    if (value.includes(slug)) onChange(value.filter((s) => s !== slug));
    else if (!full) onChange([...value, slug]);
  };
  const chip = (on) =>
    `inline-flex items-center gap-1.5 min-h-11 px-4 py-2 rounded-full border text-sm text-left transition-colors disabled:opacity-40 ${
      on ? "bg-brand-flowSlate border-brand-flowSlate text-white" : "bg-white border-input text-foreground hover:border-brand-flowSlate"}`;

  return (
    <section className="mt-5" aria-labelledby="rec-servicios-titulo">
      <div className="flex items-baseline justify-between gap-3">
        <p id="rec-servicios-titulo" className="text-sm font-medium text-foreground">
          ¿Para qué {she ? "la" : "lo"} recomiendas? <span className="text-muted-foreground font-normal">(opcional, hasta {MAX_SERVICES})</span>
        </p>
        {value.length > 0 && <span className="text-xs font-medium text-brand-flowDeep flex-shrink-0">{value.length} de {MAX_SERVICES}</span>}
      </div>
      <div role="group" aria-labelledby="rec-servicios-titulo" className="flex flex-wrap gap-2 mt-3">
        {shown.map((o) => {
          const on = value.includes(o.slug);
          return (
            <button key={o.slug} type="button" onClick={() => toggle(o.slug)} disabled={!on && full} aria-pressed={on} className={chip(on)}>
              {on && <Check className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />}{o.name}
            </button>
          );
        })}
      </div>
      {options.length > VISIBLE && !hiddenSelected && (
        <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={showAll}
          className="mt-1 min-h-11 inline-flex items-center gap-1 text-sm text-brand-blue hover:underline">
          {showAll ? "Ver menos" : `Ver más servicios (${options.length - VISIBLE})`}
          <ChevronDown className={`w-4 h-4 transition-transform ${showAll ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      )}
      {full && <p className="text-xs text-brand-flowDeep mt-2">Ya elegiste {MAX_SERVICES}. Quita uno para cambiarlo.</p>}
      <div className="mt-2">
        <button type="button" onClick={() => { onChange([]); setOnlyRecommend(true); }} aria-pressed={onlyRecommend && value.length === 0}
          className={chip(onlyRecommend && value.length === 0)}>
          {onlyRecommend && value.length === 0 && <Check className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />}
          Solo quiero recomendar{she ? "la" : "lo"}
        </button>
      </div>
    </section>
  );
}
