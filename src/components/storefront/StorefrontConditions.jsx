import React from "react";
import { Stethoscope } from "lucide-react";

export default function StorefrontConditions({ items }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 font-heading font-bold text-lg text-gray-900 mb-3">
        <Stethoscope className="w-5 h-5 text-blue-600" />
        Qué atiende
      </h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-2.5 bg-white rounded-xl px-4 py-2.5 shadow-sm border border-gray-100"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            <span className="text-gray-700 text-sm">{item.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}