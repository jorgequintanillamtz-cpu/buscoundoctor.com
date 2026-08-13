import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Stethoscope } from "lucide-react";

// Redirige las URLs viejas /especialidad/:slug[/:zonaSlug] a las nuevas
// /:professionSlug/monterrey[/:zonaSlug]. Existió como único patrón hasta
// que se cambió a la profesión en singular (más cercano a cómo busca la
// gente, ej. "ginecologo" en vez de "ginecologia"); esto evita que
// cualquier enlace ya compartido (o indexado en el futuro) rompa.
export default function LegacySpecialtyRedirect() {
  const { slug, zonaSlug } = useParams();
  const [target, setTarget] = useState(undefined); // undefined = cargando, null = no encontrado

  useEffect(() => {
    let active = true;
    base44.entities.Specialty.filter({ slug }).then((list) => {
      if (!active) return;
      const spec = list[0];
      if (!spec?.profession_slug) { setTarget(null); return; }
      setTarget(`/${spec.profession_slug}/monterrey${zonaSlug ? `/${zonaSlug}` : ""}`);
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
