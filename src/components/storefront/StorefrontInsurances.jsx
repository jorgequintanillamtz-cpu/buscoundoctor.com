import React from "react";
import { ShieldCheck } from "lucide-react";

export default function StorefrontInsurances({ items }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 font-heading font-bold text-lg text-gray-900 mb-3">
        <ShieldCheck className="w-5 h-5 text-blue-600" />
        Seguros que cubre
      </h2>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item.id}
            className="bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1.5 rounded-full border border-blue-100"
          >
            {item.name}
          </span>
        ))}
      </div>
    </section>
  );
}