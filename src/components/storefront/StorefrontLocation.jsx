import React from "react";
import { MapPin } from "lucide-react";

export default function StorefrontLocation({ items }) {
  const loc = items[0];
  if (!loc) return null;
  const hasCoords = loc.latitude != null && loc.longitude != null;
  const mapSrc = hasCoords
    ? `https://maps.google.com/maps?q=${loc.latitude},${loc.longitude}&z=15&output=embed`
    : null;

  return (
    <section>
      <h2 className="flex items-center gap-2 font-heading font-bold text-lg text-gray-900 mb-3">
        <MapPin className="w-5 h-5 text-blue-600" />
        Dónde encontrarlo
      </h2>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loc.place_name && (
          <p className="font-semibold text-gray-900 px-4 pt-4 text-sm">{loc.place_name}</p>
        )}
        {loc.address && (
          <p className="text-gray-600 text-sm px-4 pb-3 pt-1">{loc.address}</p>
        )}
        {mapSrc && (
          <iframe
            src={mapSrc}
            width="100%"
            height="200"
            style={{ border: 0 }}
            loading="lazy"
            title="Ubicación"
          />
        )}
      </div>
    </section>
  );
}