import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Languages } from "lucide-react";

export default function LanguagesChips({ specialistId }) {
  const [names, setNames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [rels, langs] = await Promise.all([
          base44.entities.SpecialistLanguage.filter({ specialist_id: specialistId }),
          base44.entities.Language.list(),
        ]);
        if (!active) return;
        const map = new Map(langs.map((l) => [l.id, l.name]));
        setNames(rels.map((r) => map.get(r.language_id)).filter(Boolean));
      } catch {}
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [specialistId]);

  if (loading || names.length === 0) return null;

  return (
    <div className="mt-6 bg-card rounded-3xl border border-border/50 p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-3">
        <Languages className="w-5 h-5 text-primary" />
        <h2 className="font-heading font-bold text-lg text-foreground">Idiomas</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {names.map((n, i) => (
          <span key={i} className="text-xs font-medium bg-accent text-accent-foreground px-3 py-1.5 rounded-full">{n}</span>
        ))}
      </div>
    </div>
  );
}