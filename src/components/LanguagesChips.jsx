import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Languages } from "lucide-react";

const LEVEL_LABELS = { basico: "Básico", intermedio: "Intermedio", avanzado: "Avanzado", nativo: "Nativo" };

export default function LanguagesChips({ specialistId }) {
  const [items, setItems] = useState([]);
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
        setItems(
          rels
            .map((r) => ({ name: map.get(r.language_id), level: r.level }))
            .filter((x) => x.name)
        );
      } catch {}
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [specialistId]);

  if (loading || items.length === 0) return null;

  return (
    <div className="mt-6 bg-card rounded-3xl border border-border/50 p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-3">
        <Languages className="w-5 h-5 text-primary" />
        <h2 className="font-heading font-bold text-lg text-foreground">Idiomas</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span key={i} className="text-xs font-medium bg-accent text-accent-foreground px-3 py-1.5 rounded-full">
            {item.name}{item.level && LEVEL_LABELS[item.level] ? ` · ${LEVEL_LABELS[item.level]}` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
