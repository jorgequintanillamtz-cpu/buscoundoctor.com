import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Stethoscope, Search, X } from "lucide-react";
import { resolveCitySlug } from "@/lib/citySlug";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

// Resalta el texto que coincide con la búsqueda dentro del nombre, para que
// sea más fácil escanear resultados de un vistazo (mismo patrón que el
// buscador de ConditionsManager.jsx en el panel del doctor).
function highlightMatch(name, query) {
  if (!query) return name;
  const idx = name.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return name;
  return (
    <>
      {name.slice(0, idx)}
      <mark className="bg-amber-200 text-foreground rounded-sm px-0.5">{name.slice(idx, idx + query.length)}</mark>
      {name.slice(idx + query.length)}
    </>
  );
}

export default function ConditionsPage() {
  const [conditions, setConditions] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      // Límite alto explícito: el banco ya pasa de 1000 registros y el
      // default del backend se queda corto ahí (mismo bug que se corrigió en
      // /admin/enfermedades) -- esta página, que muestra el catálogo
      // completo, es justo donde más se notaba si faltaba.
      base44.entities.Condition.filter({ active: true }, "name", 2000),
      base44.entities.Zone.filter({ active: true }),
    ]).then(([list, zoneList]) => {
      setConditions(list.sort((a, b) => a.name.localeCompare(b.name, "es")));
      setZones(zoneList);
      setLoading(false);
    });
  }, []);

  // Este listado no está separado por ciudad, así que enlaza a la ciudad por
  // defecto (la primera activa); una vez adentro, cada página de enfermedad
  // ya deja elegir otra ciudad si aplica.
  const defaultCitySlug = useMemo(() => resolveCitySlug(zones), [zones]);

  useEffect(() => {
    document.title = "Enfermedades: encuentra al especialista indicado | BuscoUnDoctor";
    setMeta("description", "Consulta las enfermedades y condiciones más buscadas y encuentra directamente al especialista que las atiende en Monterrey y San Pedro Garza García.");
  }, []);

  const popular = useMemo(() => conditions.filter((c) => c.popular), [conditions]);

  // Agrupado por especialidad en vez de A-Z puro: con +1000 enfermedades en
  // el banco, una sola lista alfabética era un muro interminable de scroll
  // sin ninguna pista de a quién lleva cada una. Agrupar por quién la
  // atiende es más útil para decidir qué explorar, y cada grupo se abre/
  // cierra (acordeón) para no saturar la página de entrada.
  const bySpecialty = useMemo(() => {
    const map = new Map();
    for (const c of conditions) {
      const key = c.specialty || "Otras";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    }
    return [...map.entries()]
      .map(([specialty, list]) => ({
        specialty,
        list: [...list].sort((a, b) => a.name.localeCompare(b.name, "es")),
      }))
      .sort((a, b) => a.specialty.localeCompare(b.specialty, "es"));
  }, [conditions]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return conditions.filter((c) => c.name.toLowerCase().includes(q));
  }, [conditions, search]);

  const isSearching = search.trim().length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/">Inicio</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage>Enfermedades</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground">Enfermedades</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base leading-relaxed">
          Busca la enfermedad o condición que te preocupa y te llevamos directo con los especialistas verificados que la atienden en Monterrey y San Pedro Garza García.
        </p>
      </div>

      {/* Buscador: pegado arriba al hacer scroll, igual que antes hacía el índice A-Z */}
      <div className="mb-8 sticky top-16 z-10 bg-background/95 backdrop-blur-sm py-3 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-2 bg-card border border-border/50 rounded-2xl px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Busca por nombre de enfermedad o condición..."
            className="bg-transparent text-sm outline-none flex-1"
          />
          {isSearching && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Limpiar búsqueda"
              className="p-1 rounded-full hover:bg-muted flex-shrink-0"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        {isSearching && (
          <p className="text-xs text-muted-foreground mt-2 px-1">
            {searchResults.length} resultado{searchResults.length !== 1 ? "s" : ""} para "{search.trim()}"
          </p>
        )}
      </div>

      {isSearching ? (
        <section className="mb-10">
          {searchResults.length === 0 ? (
            <div className="bg-card border border-border/50 rounded-2xl p-8 text-center">
              <p className="text-sm text-muted-foreground">No encontramos ninguna enfermedad para "{search.trim()}".</p>
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-sm text-brand-blue font-medium mt-2 hover:underline"
              >
                Ver todo el catálogo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {searchResults.map((c) => (
                <Link
                  key={c.id}
                  to={`/enfermedades/${c.slug}/${defaultCitySlug}`}
                  className="flex items-center justify-between gap-3 bg-card border border-border/50 hover:border-brand-blue/40 hover:bg-accent/30 transition-colors rounded-xl px-4 py-2.5"
                >
                  <span className="text-sm text-foreground truncate">{highlightMatch(c.name, search.trim())}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">{c.specialty}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* Más buscadas */}
          {popular.length > 0 && (
            <section className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-brand-blue" />
                <h2 className="font-heading font-bold text-base sm:text-lg text-brand-navy">Enfermedades más buscadas</h2>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {popular.map((c) => (
                  <Link
                    key={c.id}
                    to={`/enfermedades/${c.slug}/${defaultCitySlug}`}
                    className="inline-flex items-center gap-1.5 bg-brand-bluePale hover:bg-brand-blue hover:text-white text-brand-navy text-sm font-medium px-4 py-2 rounded-full transition-colors"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Por especialidad, en acordeón para no abrir el catálogo entero de un jalón */}
          <section className="mb-10">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="font-heading font-bold text-base sm:text-lg text-brand-navy">Explora por especialidad</h2>
              <span className="text-xs text-muted-foreground flex-shrink-0">{conditions.length} enfermedades · {bySpecialty.length} especialidades</span>
            </div>
            <Accordion type="multiple" className="bg-card rounded-2xl border border-border/50 divide-y divide-border/50 px-5">
              {bySpecialty.map(({ specialty, list }) => (
                <AccordionItem key={specialty} value={specialty} className="border-border/50 last:border-b-0">
                  <AccordionTrigger className="font-heading font-semibold text-sm sm:text-base text-foreground hover:no-underline">
                    <span>
                      {specialty} <span className="text-muted-foreground font-normal">({list.length})</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                      {list.map((c) => (
                        <Link
                          key={c.id}
                          to={`/enfermedades/${c.slug}/${defaultCitySlug}`}
                          className="text-sm text-muted-foreground hover:text-brand-blue transition-colors truncate py-0.5"
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        </>
      )}

      {/* CTA: ver por especialidad */}
      <div className="mt-12 bg-card border border-border/50 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        <div className="w-11 h-11 rounded-full bg-brand-bluePale flex items-center justify-center flex-shrink-0">
          <Stethoscope className="w-5 h-5 text-brand-blue" />
        </div>
        <div className="flex-1">
          <h3 className="font-heading font-semibold text-sm text-foreground">¿No encuentras lo que buscas?</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Explora todas las especialidades disponibles en el directorio.</p>
        </div>
        <Link
          to="/especialistas"
          className="inline-flex items-center gap-2 bg-brand-navy hover:bg-brand-navy/90 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors flex-shrink-0"
        >
          Ver especialidades
        </Link>
      </div>
    </div>
  );
}
