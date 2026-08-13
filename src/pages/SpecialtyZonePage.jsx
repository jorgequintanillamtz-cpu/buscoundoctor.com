import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { rankSpecialists } from "@/lib/specialistRanking";
import SpecialistCard from "@/components/SpecialistCard";
import SpecialistsMapPanel from "@/components/SpecialistsMapPanel";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Stethoscope } from "lucide-react";

const slugify = (s) => (s || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9\s-]/g, "")
  .trim()
  .replace(/\s+/g, "-")
  .replace(/-+/g, "-");

const pluralize = (name) => (!name ? name : name.endsWith("s") || name.includes(" ") ? name : name + "s");

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

export default function SpecialtyZonePage() {
  const { professionSlug, citySlug, zonaSlug } = useParams();
  const [specialty, setSpecialty] = useState(null);
  const [zone, setZone] = useState(null);
  const [specialists, setSpecialists] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const [specList, zoneList, allSpecs] = await Promise.all([
        base44.entities.Specialty.filter({ profession_slug: professionSlug }),
        base44.entities.Zone.filter({ active: true }),
        base44.entities.Specialist.filter({ active: true }),
      ]);
      if (!active) return;
      const spec = specList[0];
      const zn = zoneList.find((z) => slugify(z.name) === zonaSlug && slugify(z.city) === citySlug);
      if (!spec || !zn) { setNotFound(true); setLoading(false); return; }
      setSpecialty(spec);
      setZone(zn);
      setSpecialists(allSpecs);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [professionSlug, citySlug, zonaSlug]);

  const filtered = useMemo(() => {
    if (!specialty || !zone) return [];
    return rankSpecialists(
      specialists.filter((s) => s.specialty === specialty.name && (s.zone === zone.name || s.location === zone.name))
    );
  }, [specialty, zone, specialists]);

  useEffect(() => {
    if (!specialty || !zone) return;
    document.title = `${specialty.name} en ${zone.name}, Monterrey | BuscoUnDoctor`;
    setMeta("description", `Encuentra los mejores ${specialty.name} en ${zone.name}, Monterrey. Perfiles verificados con cédula profesional, reseñas y contacto directo por WhatsApp.`);
    setMeta("robots", filtered.length === 0 ? "noindex, follow" : "index, follow");
  }, [specialty, zone, filtered]);

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
        <h1 className="font-heading font-bold text-2xl text-foreground">Combinación no encontrada</h1>
        <p className="text-sm text-muted-foreground mt-2">La especialidad o zona que buscas no existe en nuestro catálogo.</p>
        <Button variant="outline" className="mt-5 rounded-xl" asChild>
          <Link to="/">Volver al inicio</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/">Inicio</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/especialistas">Especialidades</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to={`/${specialty.profession_slug}/${citySlug}`}>{specialty.name}</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{zone.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-5">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground">
          {pluralize(specialty.name)} en {zone.name}
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          {filtered.length} especialista{filtered.length !== 1 ? "s" : ""} disponible{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 max-w-lg mx-auto">
          <p className="text-foreground font-heading font-semibold text-lg">
            Aún no tenemos {specialty.name} registrados en {zone.name}.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Puedes ver todos los especialistas de esta especialidad en otras zonas.
          </p>
          <Button variant="outline" className="mt-5 rounded-xl" asChild>
            <Link to={`/${specialty.profession_slug}/${citySlug}`}>Ver {specialty.name} en todas las zonas</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 grid grid-cols-1 gap-4">
            {filtered.map((s, i) => <SpecialistCard key={s.id} specialist={s} priority={i === 0} sourcePage="especialidad_zona" />)}
          </div>
          {/* Mapa lateral (solo escritorio grande) con los especialistas visibles */}
          <div className="hidden xl:block xl:w-[380px] flex-shrink-0">
            <div className="sticky top-20">
              <SpecialistsMapPanel specialists={filtered} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}