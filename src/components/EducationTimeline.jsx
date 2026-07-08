import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { GraduationCap } from "lucide-react";

const DEGREE_LABELS = {
  licenciatura: "Licenciatura",
  especialidad: "Especialidad",
  subespecialidad: "Subespecialidad",
  maestria: "Maestría",
  doctorado: "Doctorado",
  certificacion: "Certificación",
};

export default function EducationTimeline({ specialistId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await base44.entities.SpecialistEducation.filter({ specialist_id: specialistId });
        if (!active) return;
        list.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        setItems(list);
      } catch {}
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [specialistId]);

  if (loading || items.length === 0) return null;

  const formatYears = (it) => {
    if (it.start_year && it.end_year) return `${it.start_year} - ${it.end_year}`;
    if (it.start_year) return `${it.start_year} - Presente`;
    if (it.end_year) return `Hasta ${it.end_year}`;
    return null;
  };

  return (
    <div className="mt-6 bg-card rounded-3xl border border-border/50 p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-5">
        <GraduationCap className="w-5 h-5 text-primary" />
        <h2 className="font-heading font-bold text-lg text-foreground">Formación académica</h2>
      </div>
      <ol className="relative border-l border-border/60 ml-2 space-y-5">
        {items.map((it, i) => (
          <li key={it.id || i} className="ml-5 relative">
            <span className="absolute -left-[1.65rem] top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-card" />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-heading font-semibold text-foreground">
                {DEGREE_LABELS[it.degree_type] || it.degree_type}
              </span>
              {it.field_of_study && <span className="text-xs text-muted-foreground">· {it.field_of_study}</span>}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{it.institution_name}</p>
            {formatYears(it) && <p className="text-xs text-muted-foreground mt-0.5">{formatYears(it)}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}