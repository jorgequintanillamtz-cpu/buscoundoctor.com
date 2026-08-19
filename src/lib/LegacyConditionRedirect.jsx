import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Stethoscope } from "lucide-react";
import { resolveCitySlug } from "@/lib/citySlug";

// Redirige las URLs viejas /enfermedades/:slug (sin ciudad) a la ciudad por
// defecto. Existió como único patrón hasta que las páginas de enfermedad se
// separaron por ciudad; evita que cualquier enlace ya compartido o indexado
// rompa.
export default function LegacyConditionRedirect() {
  const { slug } = useParams();
  const [target, setTarget] = useState(undefined); // undefined = cargando, null = no encontrado

  useEffect(() => {
    let active = true;
    base44.entities.Zone.filter({ active: true }).then((zones) => {
      if (!active) return;
      setTarget(`/enfermedades/${slug}/${resolveCitySlug(zones)}`);
    }).catch(() => { if (active) setTarget(null); });
    return () => { active = false; };
  }, [slug]);

  if (target === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }
  return <Navigate to={target || "/enfermedades"} replace />;
}
