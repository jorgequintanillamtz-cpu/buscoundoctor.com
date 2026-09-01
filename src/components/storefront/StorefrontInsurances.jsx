import React from "react";
import { ShieldCheck } from "lucide-react";
import { CREAM } from "@/lib/storefrontThemes";

export default function StorefrontInsurances({ items, theme }) {
  return (
    <section id="seguros" className="scroll-mt-4">
      <h2 className="flex items-center gap-2 font-heading font-bold text-lg text-white mb-3">
        <ShieldCheck className="w-5 h-5" style={{ color: CREAM }} />
        Seguros que cubre
      </h2>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item.id}
            className="text-sm font-medium px-3 py-1.5 rounded-full text-white"
            style={{ background: theme.card, border: `1px solid ${theme.border}` }}
          >
            {item.name}
          </span>
        ))}
      </div>
    </section>
  );
}