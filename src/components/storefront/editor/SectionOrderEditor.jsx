import React from "react";
import { ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { SECTION_LABELS, normalizeOrder } from "@/lib/storefrontSections";

/**
 * Reordenador de secciones del storefront (excluye el hero, que siempre
 * va primero). Usa botones subir/bajar. Llama a `onChange` con el nuevo
 * array de ids cada vez que se mueve una sección.
 */
export default function SectionOrderEditor({ order, onChange }) {
  const seq = normalizeOrder(order);

  const move = (idx, dir) => {
    const next = [...seq];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };

  return (
    <div>
      <p className="text-sm font-semibold text-foreground mb-1">
        Orden de las secciones
      </p>
      <p className="text-xs text-muted-foreground mb-3">
        La cabecera con tu foto y el botón de agendar cita siempre van primero.
        Reordena el resto con las flechas.
      </p>
      <ul className="space-y-1.5">
        {seq.map((id, idx) => (
          <li
            key={id}
            className="flex items-center gap-2 bg-muted/40 border border-border/50 rounded-lg px-3 py-2"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
            <span className="flex-1 text-sm font-medium text-foreground">
              {SECTION_LABELS[id]}
            </span>
            <button
              type="button"
              onClick={() => move(idx, -1)}
              disabled={idx === 0}
              className="p-1 rounded hover:bg-background disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label={`Subir ${SECTION_LABELS[id]}`}
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => move(idx, 1)}
              disabled={idx === seq.length - 1}
              className="p-1 rounded hover:bg-background disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label={`Bajar ${SECTION_LABELS[id]}`}
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}