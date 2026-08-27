import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { SlidersHorizontal, X, Search, Stethoscope, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { rankSpecialists } from "@/lib/specialistRanking";
import { slugify } from "@/lib/citySlug";
import SpecialistCard from "@/components/SpecialistCard";
import SpecialistsMapPanel from "@/components/SpecialistsMapPanel";
import CountdownBox from "@/components/CountdownBox";
import { LAUNCH_DATE, useCountdown } from "@/lib/launchCountdown";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

export default function SpecialtyPage() {
  const { professionSlug, citySlug } = useParams();
  const countdown = useCountdown(LAUNCH_DATE);
  const [specialty, setSpecialty] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [specialists, setSpecialists] = useState([]);
  const [cityName, setCityName] = useState("");
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [filterModality, setFilterModality] = useState("");
  const [filterPrice, setFilterPrice] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [subspecialties, setSubspecialties] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [conditions, setConditions] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [specList, allSpecs, zoneList] = await Promise.all([
        base44.entities.Specialty.filter({ profession_slug: professionSlug }),
        base44.entities.Specialist.filter({ active: true }),
        base44.entities.Zone.filter({ active: true }),
      ]);
      if (!active) return;
      const spec = specList[0];
      const city = zoneList.find((z) => slugify(z.name) === citySlug);
      if (!spec || !city) { setNotFound(true); setLoading(false); return; }
      setCityName(city.name);
      const [subs, faqItems, conditionList] = await Promise.all([
        base44.entities.Subspecialty.filter({ parent_specialty_id: spec.id, active: true }),
        base44.entities.FaqItem.filter({ specialty_id: spec.id, status: "publicado" }),
        base44.entities.Condition.filter({ specialty: spec.name, active: true }),
      ]);
      if (!active) return;
      setSpecialty(spec);
      setSpecialists(allSpecs);
      setSubspecialties(subs);
      setFaqs(faqItems);
      setConditions(conditionList);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [professionSlug, citySlug]);

  useEffect(() => {
    if (!specialty || !cityName) return;
    document.title = `${specialty.name} en ${cityName} | BuscoUnDoctor`;
    setMeta("description", `Encuentra los mejores especialistas en ${specialty.name} en ${cityName}. Perfiles verificados con cédula profesional, reseñas y contacto directo por WhatsApp.`);
  }, [specialty, cityName]);

  // Si la URL no resuelve (especialidad o ciudad inexistente/desactivada),
  // marcamos noindex explícito -- de lo contrario la etiqueta robots se
  // queda con lo que trajera la ruta anterior (la SPA no resetea <head> sola).
  useEffect(() => {
    if (notFound) setMeta("robots", "noindex, follow");
  }, [notFound]);

  const hasAnySpecialists = useMemo(() => {
    if (!specialty || !cityName) return false;
    return specialists.some((s) => s.specialty === specialty.name && (s.zone || s.location) === cityName);
  }, [specialty, specialists, cityName]);

  // Mientras la página no tenga ningún especialista real (antes de aplicar
  // filtros), no la indexamos: así Google no acumula cientos de páginas
  // vacías mientras se incorporan doctores. En cuanto entra el primero, la
  // página se vuelve indexable sola, sin tocar nada a mano.
  useEffect(() => {
    if (!specialty || !cityName) return;
    setMeta("robots", hasAnySpecialists ? "index, follow" : "noindex, follow");
  }, [specialty, cityName, hasAnySpecialists]);

  useEffect(() => {
    if (!specialty) return;
    const scripts = [];
    const medical = {
      "@context": "https://schema.org",
      "@type": "MedicalSpecialty",
      "name": specialty.name,
      "description": specialty.description || `${specialty.name} en ${cityName}.`,
    };
    const medScript = document.createElement("script");
    medScript.type = "application/ld+json";
    medScript.id = "specialty-jsonld";
    medScript.text = JSON.stringify(medical);
    document.head.appendChild(medScript);
    scripts.push(medScript);
    if (faqs.length > 0) {
      const faqLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(f => ({
          "@type": "Question",
          "name": f.question,
          "acceptedAnswer": { "@type": "Answer", "text": f.answer },
        })),
      };
      const faqScript = document.createElement("script");
      faqScript.type = "application/ld+json";
      faqScript.id = "specialty-jsonld-faq";
      faqScript.text = JSON.stringify(faqLd);
      document.head.appendChild(faqScript);
      scripts.push(faqScript);
    }
    return () => { scripts.forEach(s => s.remove()); };
  }, [specialty, faqs]);

  const filtered = useMemo(() => {
    if (!specialty || !cityName) return [];
    let result = specialists.filter((s) => s.specialty === specialty.name && (s.zone || s.location) === cityName);
    if (filterModality) result = result.filter((s) => s.modality === filterModality || s.modality === "ambas");
    if (filterPrice) result = result.filter((s) => s.price_range === filterPrice);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.full_name?.toLowerCase().includes(q) ||
          s.subspecialty?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q)
      );
    }
    return rankSpecialists(result);
  }, [specialty, specialists, cityName, filterModality, filterPrice, searchQuery]);

  const activeFilters = [filterModality, filterPrice].filter(Boolean).length;
  const clearFilters = () => { setFilterModality(""); setFilterPrice(""); };

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
        <h1 className="font-heading font-bold text-2xl text-foreground">Especialidad no encontrada</h1>
        <p className="text-sm text-muted-foreground mt-2">La especialidad que buscas no existe en nuestro catálogo.</p>
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
            <BreadcrumbPage>{specialty.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-5">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground">{specialty.name}</h1>
        {hasAnySpecialists && (
          <p className="text-sm text-muted-foreground mt-1.5">
            {filtered.length} especialista{filtered.length !== 1 ? "s" : ""} disponible{filtered.length !== 1 ? "s" : ""}
          </p>
        )}
        <section className="mt-3 max-w-3xl space-y-2">
          {(specialty.description
            ? specialty.description.split(/\n{2,}|\n/).filter(Boolean)
            : ["Contenido en preparación."]
          ).map((para, i) => (
            <p key={i} className="text-muted-foreground leading-relaxed text-sm">{para}</p>
          ))}
        </section>
      </div>

      {subspecialties.length > 0 && (
        <section className="mb-5">
          <h2 className="font-heading font-semibold text-sm text-foreground mb-2.5">Subespecialidades</h2>
          <div className="flex flex-wrap gap-2">
            {subspecialties.map(sub => (
              <Link key={sub.id} to={`/especialistas?subspecialty=${sub.slug}`} className="inline-flex items-center bg-accent text-accent-foreground hover:bg-accent/80 transition-colors rounded-full px-4 py-2 text-sm font-medium">
                {sub.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {conditions.length > 0 && (
        <section className="mb-5">
          <h2 className="font-heading font-semibold text-sm text-foreground mb-2.5">Enfermedades que tratamos</h2>
          <div className="flex flex-wrap gap-2">
            {conditions.map(c => (
              <Link key={c.id} to={`/enfermedades/${c.slug}/${citySlug}`} className="inline-flex items-center bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors rounded-full px-4 py-2 text-sm font-medium">
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:hidden">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal className="w-4 h-4" />
            Filtros {activeFilters > 0 && `(${activeFilters})`}
          </Button>
        </div>

        <div className={`lg:w-64 flex-shrink-0 ${showFilters ? "block" : "hidden lg:block"}`}>
          <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-5 sticky top-20">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-sm text-foreground">Filtros</h3>
              {activeFilters > 0 && <button onClick={clearFilters} className="text-xs text-primary hover:underline">Limpiar</button>}
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Buscar</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Nombre, subespecialidad..." className="h-10 rounded-xl text-sm pl-9" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Modalidad</label>
                <Select value={filterModality} onValueChange={setFilterModality}>
                  <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">En línea</SelectItem>
                    <SelectItem value="ambas">Ambas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Precio</label>
                <Select value={filterPrice} onValueChange={setFilterPrice}>
                  <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="$">$ Económico</SelectItem>
                    <SelectItem value="$$">$$ Moderado</SelectItem>
                    <SelectItem value="$$$">$$$ Alto</SelectItem>
                    <SelectItem value="$$$$">$$$$ Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1">
          {activeFilters > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {filterModality && (
                <span className="inline-flex items-center gap-1 text-xs bg-accent text-accent-foreground px-3 py-1.5 rounded-full capitalize">
                  {filterModality}<button onClick={() => setFilterModality("")} aria-label="Quitar filtro"><X className="w-3 h-3" /></button>
                </span>
              )}
              {filterPrice && (
                <span className="inline-flex items-center gap-1 text-xs bg-accent text-accent-foreground px-3 py-1.5 rounded-full">
                  {filterPrice}<button onClick={() => setFilterPrice("")} aria-label="Quitar filtro"><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}

          {!hasAnySpecialists ? (
            <div className="bg-card border border-border/50 rounded-2xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-brand-bluePale flex items-center justify-center flex-shrink-0">
                  <Stethoscope className="w-5 h-5 text-brand-blue" />
                </div>
                <div>
                  <h2 className="font-heading font-semibold text-base text-foreground">
                    Esta página está en construcción
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Estamos incorporando especialistas en {specialty.name} en {cityName}. El directorio completo de BuscoUnDoctor sale el 15 de octubre.
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
                  ¿Eres {specialty.name.toLowerCase()}? Sé de los primeros en aparecer aquí.
                </p>
                <Button variant="outline" size="sm" className="rounded-xl flex-shrink-0" asChild>
                  <Link to="/registro-medico">Regístrate gratis</Link>
                </Button>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No hay especialistas en {specialty.name} con estos filtros.</p>
              <Button variant="link" className="text-primary mt-2" onClick={clearFilters}>Limpiar filtros</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filtered.map((s, i) => <SpecialistCard key={s.id} specialist={s} priority={i === 0} sourcePage="especialidad" />)}
            </div>
          )}
        </div>

        {/* Mapa lateral (solo escritorio grande) con los especialistas visibles */}
        <div className="hidden xl:block xl:w-[380px] flex-shrink-0">
          <div className="sticky top-20">
            <SpecialistsMapPanel specialists={filtered} />
          </div>
        </div>
      </div>

      {faqs.length > 0 && (
        <section className="mt-12">
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground mb-5">Preguntas frecuentes sobre {specialty.name}</h2>
          <Accordion type="single" collapsible className="bg-card rounded-2xl border border-border/50 divide-y divide-border/50">
            {faqs.map((f, i) => (
              <AccordionItem key={f.id} value={`faq-${i}`} className="px-5">
                <AccordionTrigger className="text-left font-heading font-semibold text-sm sm:text-base text-foreground hover:no-underline">{f.question}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}
    </div>
  );
}