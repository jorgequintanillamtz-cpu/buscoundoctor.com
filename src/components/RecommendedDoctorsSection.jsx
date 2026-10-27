import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Heart, ShieldQuestion } from "lucide-react";
import { base44 } from "@/api/base44Client";
import RecommendedAvatar from "@/components/RecommendedAvatar";

// Sección del inicio: "Doctores recomendados por pacientes" (CLAUDE.md §8r). Muestra los 4 con más
// recomendaciones y lleva a /recomendados (la lista por especialidad). Solo entran los doctores que cumplen
// la regla de esa lista (1+ recomendación aprobada y cédula comprobada). Si no hay ninguno, o si la
// consulta falla, la sección no se dibuja: el inicio nunca muestra una sección vacía ni un error.
export default function RecommendedDoctorsSection() {
  const [list, setList] = useState([]);

  useEffect(() => {
    let active = true;
    base44.functions.invoke("listRecommendedDoctors")
      .then(({ data }) => { if (active && Array.isArray(data)) setList(data); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (list.length === 0) return null;

  const top = [...list].sort((a, b) => b.count - a.count || a.full_name.localeCompare(b.full_name, "es")).slice(0, 4);
  const specialties = new Set(list.map((d) => d.specialty || "otras")).size;

  return (
    <section className="bg-white pt-10 pb-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <p className="text-xs sm:text-sm font-semibold text-brand-blue uppercase tracking-widest mb-1.5">Recomendados por pacientes</p>
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-brand-navy">Doctores que otros pacientes recomiendan</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
            Aún no tienen perfil verificado en BuscoUnDoctor: la información viene de recomendaciones de pacientes, que revisamos antes de publicarlas.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {top.map((d) => (
            <Link
              key={d.slug}
              to={`/recomendado/${d.slug}`}
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3.5 hover:border-primary/40 hover:shadow-md transition-all"
            >
              <RecommendedAvatar photo={d.photo} name={d.full_name} className="w-14 h-14" />
              <div className="min-w-0 flex-1">
                <p className="font-heading font-semibold text-foreground break-words leading-snug">{d.full_name}</p>
                <p className="text-sm text-muted-foreground break-words">{[d.specialty, d.zone].filter(Boolean).join(" · ")}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    <ShieldQuestion className="w-3 h-3" aria-hidden="true" /> Sin verificar
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-foreground">
                    <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" aria-hidden="true" /> {d.count} recomendaciones
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 mt-8">
          <Link
            to="/recomendados"
            className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue/90 text-white font-heading font-semibold text-sm px-6 py-3 rounded-full shadow-sm transition-colors"
          >
            Ver todos los doctores recomendados
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-xs text-muted-foreground">
            {list.length} {list.length === 1 ? "doctor" : "doctores"} en {specialties} {specialties === 1 ? "especialidad" : "especialidades"} ·{" "}
            <Link to="/recomendaciones" className="underline hover:text-foreground">Recomienda a tu doctor</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
