import React, { useState } from "react";
import { Star } from "lucide-react";

/**
 * Estrellas tappeables reutilizables.
 * - Modo input (readOnly=false): el usuario tappea una estrella → onChange(n).
 * - Modo display (readOnly=true): muestra el valor sin interacción.
 */
export default function StarRating({ value = 0, onChange, size = 28, readOnly = false, variant = "dark" }) {
  const [hover, setHover] = useState(0);
  const display = hover || value;

  return (
    <div className="flex items-center gap-1" role={readOnly ? undefined : "radiogroup"} aria-label="Calificación">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange?.(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
          className={`transition-transform ${readOnly ? "cursor-default" : "cursor-pointer active:scale-90"}`}
          aria-label={`${star} estrella${star > 1 ? "s" : ""}`}
        >
          <Star
            style={{ width: size, height: size }}
            className={star <= display ? "fill-amber-400 text-amber-400" : variant === "light" ? "text-[#0B1E4D]/20" : "text-white/30"}
          />
        </button>
      ))}
    </div>
  );
}