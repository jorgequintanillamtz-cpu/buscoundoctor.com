import React from "react";
import { GraduationCap } from "lucide-react";
import { CREAM } from "@/lib/storefrontThemes";

export default function StorefrontTimeline({ items, theme }) {
  return (
    <section id="trayectoria" className="scroll-mt-4">
      <h2 className="flex items-center gap-2 font-heading font-bold text-lg text-white mb-3">
        <GraduationCap className="w-5 h-5" style={{ color: CREAM }} />
        Trayectoria
      </h2>
      <div className="relative pl-6 space-y-4">
        <div className="absolute left-2 top-2 bottom-2 w-0.5" style={{ background: theme.border }} />
        {items.map((item) => (
          <div key={item.id} className="relative">
            <div
              className="absolute -left-[18px] top-1.5 w-3 h-3 rounded-full"
              style={{ background: CREAM }}
            />
            {item.year && (
              <span className="font-semibold text-sm" style={{ color: CREAM }}>
                {item.year}
              </span>
            )}
            <p className="text-white/80 text-sm leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}