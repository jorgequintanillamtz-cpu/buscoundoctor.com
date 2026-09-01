import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Stethoscope, Frown } from "lucide-react";
import StorefrontView from "@/components/storefront/StorefrontView";
import { byPosition } from "@/lib/storefrontUtils";

export default function StorefrontPublic() {
  const { slug } = useParams();
  const [state, setState] = useState("loading");
  const [data, setData] = useState({});

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const sf = await base44.entities.DoctorStorefront.filter({ slug, status: "active" });
        if (!active) return;
        if (!sf || sf.length === 0) {
          setState("not-found");
          return;
        }
        const storefront = sf[0];
        const specialist = await base44.entities.Specialist.get(storefront.doctor_id).catch(() => null);
        const [conditions, insurances, locations, timeline, faqs] = await Promise.all([
          base44.entities.StorefrontCondition.filter({ storefront_id: storefront.id }).catch(() => []),
          base44.entities.StorefrontInsurance.filter({ storefront_id: storefront.id }).catch(() => []),
          base44.entities.StorefrontLocation.filter({ storefront_id: storefront.id }).catch(() => []),
          base44.entities.StorefrontTimelineEntry.filter({ storefront_id: storefront.id }).catch(() => []),
          base44.entities.StorefrontFAQ.filter({ storefront_id: storefront.id }).catch(() => []),
        ]);
        if (!active) return;
        setData({
          storefront,
          specialist,
          conditions: conditions.sort(byPosition),
          insurances: insurances.sort(byPosition),
          locations: locations.sort(byPosition),
          timeline: timeline.sort(byPosition),
          faqs: faqs.sort(byPosition),
        });
        if (specialist?.full_name) {
          document.title = specialist.full_name;
        }
        setState("ready");
      } catch {
        if (active) setState("not-found");
      }
    })();
    return () => { active = false; };
  }, [slug]);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Stethoscope className="w-10 h-10 text-blue-500 animate-bounce" />
      </div>
    );
  }

  if (state === "not-found") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
        <Frown className="w-12 h-12 text-gray-300 mb-3" />
        <h1 className="font-heading font-bold text-xl text-gray-700">Esta página no está disponible</h1>
        <p className="text-sm text-gray-400 mt-1">
          El link que abriste no existe o la página fue desactivada.
        </p>
      </div>
    );
  }

  return <StorefrontView {...data} />;
}