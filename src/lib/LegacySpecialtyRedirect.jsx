import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Stethoscope } from "lucide-react";
import { resolveCitySlug } from "@/lib/citySlug";

// Redirige las URLs viejas /especialidad/:slug[/:zonaSlug] a las nuevas
// /:professionSlug/:citySlug. El sitio ya no distingue por zona/colonia
// dentro de una ciudad, así que cualquier zonaSlug que traiga la URL vieja
// se ignora y se cae siempre a la ciudad por defecto.
export default function LegacySpecialtyRedirect() {
  const { slug } = useParams();
  const [target, setTarget] = useState(undefined); // undefined = cargando, null = no encontrado

  useEffect(() => {
    let active = true;
    Promise.all([
      base44.entities.Specialty.filter({ slug }),
      base44.entities.Zone.filter({ active: true }),
    ]).then(([specList, zones]) => {
      if (!active) return;
      const spec = specList[0];
      if (!spec?.profession_slug) { setTarget(null); return; }
      setTarget(`/${spec.profession_slug}/${resolveCitySlug(zones)}`);
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
  return <Navigate to={target || "/especialistas"} replace />;
}
