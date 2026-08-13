import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Stethoscope } from "lucide-react";
import { resolveCitySlug, slugify } from "@/lib/citySlug";

// Redirige las URLs viejas /especialidad/:slug[/:zonaSlug] a las nuevas
// /:professionSlug/:citySlug[/:zonaSlug]. Existió como único patrón hasta
// que se cambió a la profesión en singular (más cercano a cómo busca la
// gente, ej. "ginecologo" en vez de "ginecologia"); esto evita que
// cualquier enlace ya compartido (o indexado en el futuro) rompa.
export default function LegacySpecialtyRedirect() {
  const { slug, zonaSlug } = useParams();
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
      // La URL vieja guardaba el nombre de la zona ya slugificado, no el
      // nombre real, así que hay que volver a encontrarlo comparando contra
      // el slug de cada zona activa.
      const zoneMatch = zonaSlug ? zones.find((z) => slugify(z.name) === zonaSlug) : null;
      const citySlug = resolveCitySlug(zones, zoneMatch?.name);
      setTarget(`/${spec.profession_slug}/${citySlug}${zonaSlug ? `/${zonaSlug}` : ""}`);
    }).catch(() => { if (active) setTarget(null); });
    return () => { active = false; };
  }, [slug, zonaSlug]);

  if (target === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }
  return <Navigate to={target || "/especialistas"} replace />;
}
