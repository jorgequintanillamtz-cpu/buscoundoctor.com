import React from "react";
import StorefrontHero from "./StorefrontHero";
import StorefrontConditions from "./StorefrontConditions";
import StorefrontInsurances from "./StorefrontInsurances";
import StorefrontLocation from "./StorefrontLocation";
import StorefrontTimeline from "./StorefrontTimeline";
import StorefrontFAQ from "./StorefrontFAQ";
import { buildWhatsAppLink } from "@/lib/storefrontUtils";

/**
 * Compone todas las secciones del storefront.
 * Se usa tanto en la página pública (/dr/:slug) como en el preview del admin.
 * No incluye branding de BuscoUnDoctor — es la página personal del doctor.
 */
export default function StorefrontView({
  storefront,
  specialist,
  conditions = [],
  insurances = [],
  locations = [],
  timeline = [],
  faqs = [],
}) {
  const doctorName = specialist?.full_name || "";
  const photo = specialist?.profile_photo;
  const whatsappLink = buildWhatsAppLink(
    storefront.whatsapp_phone,
    storefront.whatsapp_message,
    doctorName
  );

  return (
    <div className="bg-gradient-to-b from-blue-50 to-white min-h-full">
      <StorefrontHero
        name={doctorName}
        photo={photo}
        headline={storefront.headline}
        whatsappLink={whatsappLink}
      />
      <div className="max-w-md mx-auto px-4 pb-12 space-y-8">
        {conditions.length > 0 && <StorefrontConditions items={conditions} />}
        {insurances.length > 0 && <StorefrontInsurances items={insurances} />}
        {locations.length > 0 && <StorefrontLocation items={locations} />}
        {timeline.length > 0 && <StorefrontTimeline items={timeline} />}
        {faqs.length > 0 && <StorefrontFAQ items={faqs} />}
      </div>
    </div>
  );
}