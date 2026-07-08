import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import SpecialistCard from "./SpecialistCard";
import { Users } from "lucide-react";

export default function SimilarSpecialists({ specialistId, specialty, zone }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const all = await base44.entities.Specialist.filter({ active: true });
        if (!active) return;
        const matches = all
          .filter((s) => s.id !== specialistId)
          .filter((s) => (specialty && s.specialty === specialty) || (zone && s.zone === zone));
        setItems(matches.slice(0, 4));
      } catch {}
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [specialistId, specialty, zone]);

  if (loading || items.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="font-heading font-bold text-lg text-foreground">Médicos similares</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((s) => (
          <SpecialistCard key={s.id} specialist={s} />
        ))}
      </div>
    </div>
  );
}