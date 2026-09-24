import React, { useState } from "react";
import { ShieldCheck, ChevronDown } from "lucide-react";

const COLLAPSED_COUNT = 3;

export default function StorefrontInsurances({ items, theme }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, COLLAPSED_COUNT);

  return (
    <section id="seguros" className="scroll-mt-4">
      <h2 className="flex items-center gap-2 font-heading font-bold text-lg text-white mb-3" style={{ fontFamily: theme.fontHeading }}>
        <ShieldCheck className="w-5 h-5" style={{ color: theme.accent }} />
        Seguros que cubre
      </h2>
      <div className="flex flex-wrap gap-2">
        {visible.map((item) => (
          <span
            key={item.id}
            className="text-sm font-medium px-3 py-1.5 rounded-full text-white flex items-center gap-1.5"
            style={{ background: theme.card, border: `1px solid ${theme.border}`, boxShadow: theme.cardShadow }}
          >
            {item.logo_url && (
              <img src={item.logo_url} alt="" className="w-4 h-4 object-contain rounded-sm bg-white/90 p-0.5" />
            )}
            {item.name}
          </span>
        ))}
      </div>
      {items.length > COLLAPSED_COUNT && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="flex items-center gap-1 text-xs font-semibold mt-2.5 transition-colors"
          style={{ color: theme.accent }}
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} />
          {showAll ? "Ver menos" : `Ver más (${items.length - COLLAPSED_COUNT})`}
        </button>
      )}
    </section>
  );
}