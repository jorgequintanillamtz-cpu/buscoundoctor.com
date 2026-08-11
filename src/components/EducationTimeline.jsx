import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { GraduationCap, Briefcase, Building2, Award } from "lucide-react";

const DEGREE_LABELS = {
  licenciatura: "Licenciatura",
  especialidad: "Especialidad",
  subespecialidad: "Subespecialidad",
  maestria: "Maestría",
  doctorado: "Doctorado",
  certificacion: "Certificación",
};

// "Estudios" cubre la formación de base (licenciatura, maestría, doctorado).
// "Experiencia" cubre el recorrido clínico (especialidad, subespecialidad).
// "Certificaciones" tiene sección propia y visible (cursos, diplomados,
// certificaciones adicionales) en vez de mezclarse dentro de Experiencia,
// para que un doctor con varias certificaciones destaque ese contenido.
const DEGREE_GROUPS = {
  estudios: ["licenciatura", "maestria", "doctorado"],
  experiencia: ["especialidad", "subespecialidad"],
  certificaciones: ["certificacion"],
};

const VARIANT_META = {
  experiencia: { heading: "Experiencia", icon: Briefcase },
  estudios: { heading: "Estudios", icon: GraduationCap },
  certificaciones: { heading: "Certificaciones", icon: Award },
};

export default function EducationTimeline({ specialistId, variant = "estudios", currentOffices = [], yearsExperience }) {
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

  if (loading) return null;

  const allowed = DEGREE_GROUPS[variant] || [];
  const filtered = items.filter((it) => allowed.includes(it.degree_type));
  const showOfficesRow = variant === "experiencia" && currentOffices.length > 0;

  if (filtered.length === 0 && !showOfficesRow && !yearsExperience) return null;

  const formatYears = (it) => {
    if (it.start_year && it.end_year) return `${it.start_year} - ${it.end_year}`;
    if (it.start_year) return `${it.start_year} - Presente`;
    if (it.end_year) return `Hasta ${it.end_year}`;
    return null;
  };

  const { heading, icon: Icon } = VARIANT_META[variant] || VARIANT_META.estudios;
  const sectionId = variant;

  return (
    <div id={sectionId} className="mt-6 bg-card rounded-3xl border border-border/50 p-6 sm:p-8 scroll-mt-32">
      <div className="flex items-center gap-2 mb-5">
        <Icon className="w-5 h-5 text-primary" />
        <h2 className="font-heading font-bold text-lg text-foreground">{heading}</h2>
      </div>

      {variant === "experiencia" && yearsExperience && (
        <div className="mb-5 pb-5 border-b border-border/50 flex items-baseline gap-2">
          <span className="font-heading font-extrabold text-3xl text-brand-navy">{yearsExperience}+</span>
          <span className="text-sm text-muted-foreground">años de experiencia clínica</span>
        </div>
      )}

      {(filtered.length > 0 || showOfficesRow) && (
        <ol className="relative border-l border-border/60 ml-2 space-y-5">
          {showOfficesRow && currentOffices.map((o) => (
            <li key={`office-${o.id}`} className="ml-5 relative">
              <span className="absolute -left-[1.65rem] top-1 w-3 h-3 rounded-full bg-green-500 ring-4 ring-card" />
              <div className="flex flex-wrap items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm font-heading font-semibold text-foreground">{o.name || o.address_line}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Activo actualmente</span>
              </div>
            </li>
          ))}
          {filtered.map((it, i) => (
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
              {it.comment && <p className="text-sm text-foreground/80 mt-1.5 italic">"{it.comment}"</p>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
