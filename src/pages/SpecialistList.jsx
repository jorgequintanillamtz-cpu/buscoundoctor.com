import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { SlidersHorizontal, X, Search, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { rankSpecialists } from "@/lib/specialistRanking";
import SearchBar from "../components/SearchBar";
import SpecialistCard from "../components/SpecialistCard";
import SpecialistsMapPanel from "../components/SpecialistsMapPanel";
import { Link } from "react-router-dom";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

export default function SpecialistList() {
  const [specialists, setSpecialists] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [zones, setZones] = useState([]);
  const [insurers, setInsurers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const [filterSpecialty, setFilterSpecialty] = useState(urlParams.get("specialty") || "");
  const [filterZone, setFilterZone] = useState(urlParams.get("zone") || "");
  const [filterModality, setFilterModality] = useState("");
  const [filterPrice, setFilterPrice] = useState("");
  const [filterInsurer, setFilterInsurer] = useState("");
  const [searchQuery, setSearchQuery] = useState(urlParams.get("q") || "");
  // Filtro por enfermedad (?condition=slug): llega desde el buscador cuando
  // se elige una enfermedad en vez de una especialidad. Se guarda el registro
  // completo (no solo el slug) para poder filtrar por conditions_relation y
  // mostrar su nombre en el título y el chip de filtro activo.
  const [filterConditionSlug, setFilterConditionSlug] = useState(urlParams.get("condition") || "");
  const [conditionRecord, setConditionRecord] = useState(null);
  // Filtro por subespecialidad (?subspecialty=slug): mismo patrón que
  // condition, pero contra el banco Subspecialty y subspecialties_relation.
  // Esto es lo que deja que alguien busque "Cirugía Maxilofacial" y solo
  // vea a los doctores que la tienen certificada, sin mezclarse con el
  // listado general de su especialidad base (ej. Dentista).
  const [filterSubspecialtySlug, setFilterSubspecialtySlug] = useState(urlParams.get("subspecialty") || "");
  const [subspecialtyRecord, setSubspecialtyRecord] = useState(null);

  useEffect(() => {
    async function load() {
      const [specs, specList, zoneList, insList] = await Promise.all([
        base44.entities.Specialist.filter({ active: true }),
        base44.entities.Specialty.filter({ active: true }),
        base44.entities.Zone.filter({ active: true }),
        base44.entities.Insurer.filter({ is_active: true }),
      ]);
      setSpecialists(specs);
      setSpecialties(specList);
      setZones(zoneList);
      setInsurers(insList);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!filterConditionSlug) { setConditionRecord(null); return; }
    let active = true;
    base44.entities.Condition.filter({ slug: filterConditionSlug }).then((list) => {
      if (active) setConditionRecord(list[0] || null);
    });
    return () => { active = false; };
  }, [filterConditionSlug]);

  useEffect(() => {
    if (!filterSubspecialtySlug) { setSubspecialtyRecord(null); return; }
    let active = true;
    base44.entities.Subspecialty.filter({ slug: filterSubspecialtySlug }).then((list) => {
      if (active) setSubspecialtyRecord(list[0] || null);
    });
    return () => { active = false; };
  }, [filterSubspecialtySlug]);

  useEffect(() => {
    const hasFilters = !!(filterSpecialty || filterZone || filterInsurer || filterConditionSlug || filterSubspecialtySlug || searchQuery);
    let metaRobots = document.querySelector('meta[name="robots"]');
    if (hasFilters) {
      if (!metaRobots) {
        metaRobots = document.createElement('meta');
        metaRobots.setAttribute('name', 'robots');
        document.head.appendChild(metaRobots);
      }
      metaRobots.setAttribute('content', 'noindex, follow');
    } else if (metaRobots) {
      metaRobots.remove();
    }
  }, [filterSpecialty, filterZone, filterInsurer, filterConditionSlug, filterSubspecialtySlug, searchQuery]);

  const filtered = useMemo(() => {
    let result = [...specialists];

    if (filterSpecialty) {
      result = result.filter((s) => s.specialty === filterSpecialty);
    }
    if (filterZone) {
      result = result.filter((s) => s.zone === filterZone || s.location === filterZone);
    }
    if (filterModality) {
      result = result.filter((s) => s.modality === filterModality || s.modality === "ambas");
    }
    if (filterPrice) {
      result = result.filter((s) => s.price_range === filterPrice);
    }
    if (filterInsurer) {
      result = result.filter((s) => (s.insurers_relation || []).includes(filterInsurer));
    }
    if (conditionRecord) {
      result = result.filter((s) => (s.conditions_relation || []).includes(conditionRecord.id));
    }
    if (subspecialtyRecord) {
      result = result.filter((s) => (s.subspecialties_relation || []).includes(subspecialtyRecord.id));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.full_name?.toLowerCase().includes(q) ||
          s.specialty?.toLowerCase().includes(q) ||
          s.subspecialty?.toLowerCase().includes(q) ||
          s.zone?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q)
      );
    }

    return rankSpecialists(result);
  }, [specialists, filterSpecialty, filterZone, filterModality, filterPrice, filterInsurer, conditionRecord, subspecialtyRecord, searchQuery]);

  const activeFilters = [filterSpecialty, filterZone, filterModality, filterPrice, filterInsurer, filterConditionSlug, filterSubspecialtySlug].filter(Boolean).length;

  const clearFilters = () => {
    setFilterSpecialty("");
    setFilterZone("");
    setFilterModality("");
    setFilterPrice("");
    setFilterInsurer("");
    setFilterConditionSlug("");
    setFilterSubspecialtySlug("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
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
            <BreadcrumbPage>Especialistas</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="mb-5">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground">
          {subspecialtyRecord?.name || conditionRecord?.name || filterSpecialty || "Todos los especialistas"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {filtered.length} especialista{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Mobile filter toggle */}
        <div className="lg:hidden">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros {activeFilters > 0 && `(${activeFilters})`}
          </Button>
        </div>

        {/* Filters sidebar */}
        <div className={`lg:w-64 flex-shrink-0 ${showFilters ? "block" : "hidden lg:block"}`}>
          <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-5 sticky top-20">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-sm text-foreground">Filtros</h3>
              {activeFilters > 0 && (
                <button onClick={clearFilters} className="text-xs text-primary hover:underline">
                  Limpiar
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nombre</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre..."
                    className="pl-9 h-10 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Especialidad</label>
                <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
                  <SelectTrigger className="h-10 rounded-xl text-sm">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialties.map((s) => (
                      <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Ciudad</label>
                <Select value={filterZone} onValueChange={setFilterZone}>
                  <SelectTrigger className="h-10 rounded-xl text-sm">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((z) => (
                      <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Modalidad</label>
                <Select value={filterModality} onValueChange={setFilterModality}>
                  <SelectTrigger className="h-10 rounded-xl text-sm">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
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
                  <SelectTrigger className="h-10 rounded-xl text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="$">$ Económico</SelectItem>
                    <SelectItem value="$$">$$ Moderado</SelectItem>
                    <SelectItem value="$$$">$$$ Alto</SelectItem>
                    <SelectItem value="$$$$">$$$$ Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Aseguradora</label>
                <Select value={filterInsurer} onValueChange={setFilterInsurer}>
                  <SelectTrigger className="h-10 rounded-xl text-sm">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    {insurers.map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1">
          <div className="mb-6">
            <SearchBar placeholder="Buscar por nombre, especialidad o zona..." />
          </div>

          {/* Active filter tags */}
          {activeFilters > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {filterSpecialty && (
                <span className="inline-flex items-center gap-1 text-xs bg-accent text-accent-foreground px-3 py-1.5 rounded-full">
                  {filterSpecialty}
                  <button onClick={() => setFilterSpecialty("")} aria-label="Quitar filtro"><X className="w-3 h-3" /></button>
                </span>
              )}
              {filterZone && (
                <span className="inline-flex items-center gap-1 text-xs bg-accent text-accent-foreground px-3 py-1.5 rounded-full">
                  {filterZone}
                  <button onClick={() => setFilterZone("")} aria-label="Quitar filtro"><X className="w-3 h-3" /></button>
                </span>
              )}
              {filterModality && (
                <span className="inline-flex items-center gap-1 text-xs bg-accent text-accent-foreground px-3 py-1.5 rounded-full capitalize">
                  {filterModality}
                  <button onClick={() => setFilterModality("")} aria-label="Quitar filtro"><X className="w-3 h-3" /></button>
                </span>
              )}
              {filterPrice && (
                <span className="inline-flex items-center gap-1 text-xs bg-accent text-accent-foreground px-3 py-1.5 rounded-full">
                  {filterPrice}
                  <button onClick={() => setFilterPrice("")} aria-label="Quitar filtro"><X className="w-3 h-3" /></button>
                </span>
              )}
              {filterInsurer && (
                <span className="inline-flex items-center gap-1 text-xs bg-accent text-accent-foreground px-3 py-1.5 rounded-full">
                  {insurers.find((i) => i.id === filterInsurer)?.name}
                  <button onClick={() => setFilterInsurer("")} aria-label="Quitar filtro"><X className="w-3 h-3" /></button>
                </span>
              )}
              {filterConditionSlug && (
                <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full">
                  {conditionRecord?.name || "Enfermedad"}
                  <button onClick={() => setFilterConditionSlug("")} aria-label="Quitar filtro"><X className="w-3 h-3" /></button>
                </span>
              )}
              {filterSubspecialtySlug && (
                <span className="inline-flex items-center gap-1 text-xs bg-brand-bluePale text-brand-navy px-3 py-1.5 rounded-full">
                  {subspecialtyRecord?.name || "Subespecialidad"}
                  <button onClick={() => setFilterSubspecialtySlug("")} aria-label="Quitar filtro"><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No se encontraron especialistas con estos filtros.</p>
              <Button variant="link" className="text-primary mt-2" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filtered.map((s, i) => (
                <SpecialistCard key={s.id} specialist={s} priority={i === 0} sourcePage="directorio" />
              ))}
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
    </div>
  );
}