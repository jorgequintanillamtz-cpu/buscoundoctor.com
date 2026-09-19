import React from "react";
import { MapPin } from "lucide-react";
import { CREAM } from "@/lib/storefrontThemes";
import { hasGoogleMaps, buildEmbedUrl } from "@/lib/googleMaps";

export default function StorefrontLocation({ items, theme }) {
  const loc = items[0];
  if (!loc) return null;
  const hasCoords = loc.latitude != null && loc.longitude != null;
  const mapSrc = !hasCoords
    ? null
    : hasGoogleMaps
      ? buildEmbedUrl(loc.latitude, loc.longitude, 15)
      : `https://maps.google.com/maps?q=${loc.latitude},${loc.longitude}&z=15&output=embed`;

  return (
    <section id="ubicacion" className="scroll-mt-4">
      <h2 className="flex items-center gap-2 font-heading font-bold text-lg text-white mb-3">
        <MapPin className="w-5 h-5" style={{ color: CREAM }} />
        Dónde encontrarme
      </h2>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: theme.card, border: `1px solid ${theme.border}` }}
      >
        {loc.place_name && (
          <p className="font-semibold text-white px-4 pt-4 text-sm">{loc.place_name}</p>
        )}
        {loc.address && (
          <p className="text-white/70 text-sm px-4 pb-3 pt-1">{loc.address}</p>
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