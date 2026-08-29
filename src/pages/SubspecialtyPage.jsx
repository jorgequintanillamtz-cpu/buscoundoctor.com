import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Stethoscope, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SpecialistCard from "@/components/SpecialistCard";
import CountdownBox from "@/components/CountdownBox";
import { LAUNCH_DATE, useCountdown } from "@/lib/launchCountdown";
import { slugify } from "@/lib/citySlug";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

// Página SEO dedicada a una subespecialidad (ej. "Cirujanos Maxilofaciales
// en Monterrey"), mismo patrón de indexación automática que SpecialtyPage:
// arranca noindex y se vuelve indexable sola en cuanto entra el primer
// doctor real -- sin ningún toggle manual. Hoy (agosto 2026) solo 3 doctores
// en toda la plataforma tienen subspecialties_relation asignada, así que la
// gran mayoría de estas páginas van a arrancar en construcción.
//
// A diferencia de SpecialtyPage, el match de doctores NO restringe por
// ciudad exacta -- igual que ConditionDetailPage, porque el banco de
// subspecialties_relation todavía es muy angosto y restringir por ciudad
// dejaría casi todas las páginas vacías aunque sí exista el doctor en otra
// ciudad activa. citySlug solo se usa para el título/breadcrumb.
export default function SubspecialtyPage() {
  const { slug, citySlug } = useParams();
  const countdown = useCountdown(LAUNCH_DATE);
  const [subspecialty, setSubspecialty] = useState(null);
  const [parentSpecialty, setParentSpecialty] = useState(null);
  const [cityRecord, setCityRecord] = useState(null);
  const [specialists, setSpecialists] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const [subList, zoneList] = await Promise.all([
        base44.entities.Subspecialty.filter({ slug, active: true }),
        base44.entities.Zone.filter({ active: true }),
      ]);
      const sub = subList[0];
      const city = zoneList.find((z) => slugify(z.name) === citySlug);
      if (!active) return;
      if (!sub || !city) { setNotFound(true); setLoading(false); return; }

      const [specList, allSpecialists] = await Promise.all([
        base44.entities.Specialty.filter({ id: sub.parent_specialty_id }),
        base44.entities.Specialist.filter({ active: true, publication_status: "published" }, "full_name", 2000),
      ]);
      if (!active) return;

      setSubspecialty(sub);
      setParentSpecialty(specList[0] || null);
      setCityRecord(city);
      setSpecialists(allSpecialists.filter((s) => (s.subspecialties_relation || []).includes(sub.id)));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [slug, citySlug]);

  const displayName = subspecialty?.display_name || subspecialty?.name || "";

  useEffect(() => {
    if (!subspecialty || !cityRecord) return;
    document.title = `${displayName} en ${cityRecord.name} | BuscoUnDoctor`;
    setMeta("description", `Encuentra ${displayName.toLowerCase()} verificados en ${cityRecord.name}. Perfiles con cédula profesional, reseñas y contacto directo por WhatsApp.`);
  }, [subspecialty, cityRecord, displayName]);

  // Si la URL no resuelve (subespecialidad o ciudad inexistente/desactivada),
  // marcamos noindex explícito -- de lo contrario la etiqueta robots se
  // queda con lo que trajera la ruta anterior (la SPA no resetea <head> sola).
  useEffect(() => {
    if (notFound) setMeta("robots", "noindex, follow");
  }, [notFound]);

  const hasAnySpecialists = specialists.length > 0;

  useEffect(() => {
    if (!subspecialty || !cityRecord) return;
    setMeta("robots", hasAnySpecialists ? "index, follow" : "noindex, follow");
  }, [subspecialty, cityRecord, hasAnySpecialists]);

  useEffect(() => {
    if (!subspecialty) return;
    const medical = {
      "@context": "https://schema.org",
      "@type": "MedicalSpecialty",
      "name": displayName,
      "description": subspecialty.description || `${displayName} en ${cityRecord?.name || ""}.`,
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "subspecialty-jsonld";
    script.text = JSON.stringify(medical);
    document.head.appendChild(script);
    return () => script.remove();
  }, [subspecialty, cityRecord, displayName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-4">
        <h1 className="font-heading font-bold text-2xl text-foreground">Subespecialidad no encontrada</h1>
        <p className="text-sm text-muted-foreground mt-2">La subespecialidad que buscas no existe en nuestro catálogo.</p>
        <Button variant="outline" className="mt-5 rounded-xl" asChild>
          <Link to="/">Volver al inicio</Link>
        </Button>
      </div>
    );
  }

  const parentDisplayName = parentSpecialty?.display_name || parentSpecialty?.name;
  const parentLink = parentSpecialty?.profession_slug ? `/${parentSpecialty.profession_slug}/${citySlug}` : "/especialistas";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/">Inicio</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          {parentSpecialty && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink asChild><Link to={parentLink}>{parentDisplayName}</Link></BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          <BreadcrumbItem>
            <BreadcrumbPage>{displayName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground">
          {displayName} en {cityRecord.name}
        </h1>
        {parentSpecialty && (
          <Link to={parentLink} className="inline-block mt-1.5 text-xs font-medium text-brand-blue hover:underline">
            También puedes ver especialistas en: {parentDisplayName}
          </Link>
        )}
        {subspecialty.description && (
          <p className="text-muted-foreground leading-relaxed text-sm mt-3 max-w-3xl">{subspecialty.description}</p>
        )}
      </div>

      {hasAnySpecialists ? (
        <section className="mb-10">
          <h2 className="font-heading font-bold text-lg sm:text-xl text-foreground mb-4">
            {displayName} disponibles
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {specialists.map((s, i) => (
              <SpecialistCard key={s.id} specialist={s} priority={i === 0} sourcePage="subespecialidad" />
            ))}
          </div>
        </section>
      ) : (
        <div className="bg-card border border-border/50 rounded-2xl p-6 mb-10">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-11 h-11 rounded-full bg-brand-bluePale flex items-center justify-center flex-shrink-0">
              <Stethoscope className="w-5 h-5 text-brand-blue" />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-base text-foreground">
                Esta página está en construcción
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Estamos incorporando especialistas en {displayName.toLowerCase()}. El directorio completo de BuscoUnDoctor sale el 15 de octubre.
              </p>
            </div>
          </div>

          {!countdown.done && (
            <div className="flex items-center gap-2 mb-4">
              <CountdownBox value={countdown.days} label="Días" compact />
              <CountdownBox value={countdown.hours} label="Hrs" compact />
              <CountdownBox value={countdown.minutes} label="Min" compact />
              <CountdownBox value={countdown.seconds} label="Seg" compact />
            </div>
          )}

          <div className="pt-5 border-t border-border/50 flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <UserPlus className="w-5 h-5 text-brand-blue flex-shrink-0 hidden sm:block" />
            <p className="text-xs text-muted-foreground flex-1">
              ¿Eres {displayName.toLowerCase()}? Sé de los primeros en aparecer aquí.
            </p>
            <Button variant="outline" size="sm" className="rounded-xl flex-shrink-0" asChild>
              <Link to="/registro-medico">Regístrate gratis</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
