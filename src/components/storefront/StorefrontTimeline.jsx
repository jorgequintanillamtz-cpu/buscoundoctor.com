import React from "react";
import { GraduationCap } from "lucide-react";

export default function StorefrontTimeline({ items }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 font-heading font-bold text-lg text-gray-900 mb-3">
        <GraduationCap className="w-5 h-5 text-blue-600" />
        Trayectoria
      </h2>
      <div className="relative pl-6 space-y-4">
        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-blue-200" />
        {items.map((item) => (
          <div key={item.id} className="relative">
            <div className="absolute -left-[18px] top-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
            {item.year && (
              <span className="text-blue-600 font-semibold text-sm">{item.year}</span>
            )}
            <p className="text-gray-700 text-sm leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}