import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Search, Stethoscope, MapPin, LogIn, UserPlus } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import SearchableSelect from "@/components/SearchableSelect";
import { buildSearchOptions } from "@/lib/searchOptions";

const triggerClass =
  "h-auto text-sm font-medium text-foreground bg-transparent";

const slugify = (s) => (s || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9\s-]/g, "")
  .trim()
  .replace(/\s+/g, "-")
  .replace(/-+/g, "-");

export default function Header() {
  const [open, setOpen] = useState(false);
  const [zones, setZones] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [searchPick, setSearchPick] = useState("");
  const [searchZone, setSearchZone] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";

  useEffect(() => {
    Promise.all([
      base44.entities.Zone.filter({ active: true }).catch(() => []),
      base44.entities.Specialty.filter({ active: true }).catch(() => []),
      base44.entities.Condition.filter({ active: true }).catch(() => []),
    ]).then(([z, s, c]) => { setZones(z); setSpecialties(s); setConditions(c); });
  }, []);

  // Especialidades y enfermedades combinadas en un solo buscador (como el de
  // Doctoralia): el usuario puede escribir tanto "dermatólogo" como "acné".
  const searchOptions = useMemo(() => buildSearchOptions(specialties, conditions), [specialties, conditions]);
  const zoneOptions = useMemo(() => zones.map((z) => ({ id: z.name, name: z.name })), [zones]);

  const submitSearch = (e) => {
    e?.preventDefault?.();
    const picked = searchOptions.find((o) => o.id === searchPick);
    // Si se eligió una enfermedad, resolvemos la especialidad que la atiende:
    // la búsqueda por enfermedad lleva al listado completo de esa especialidad.
    const resolvedSpecialty = picked?.type === "specialty"
      ? picked.ref
      : picked?.type === "condition"
        ? specialties.find((s) => s.name === picked.ref.specialty)
        : null;
    // Navega a las páginas SEO dedicadas (/especialidad/:slug[/:zonaSlug]) en vez del
    // filtro genérico /especialistas?..., que lleva noindex a propósito (Sprint 11).
    if (resolvedSpecialty) {
      if (searchZone) {
        navigate(`/especialidad/${resolvedSpecialty.slug}/${slugify(searchZone)}`);
      } else {
        navigate(`/especialidad/${resolvedSpecialty.slug}`);
      }
      return;
    }
    // Sin especialidad ni enfermedad seleccionada: no hay página dedicada solo-por-zona
    // todavía, así que caemos al listado general filtrado.
    const params = new URLSearchParams();
    if (searchZone) params.set("zone", searchZone);
    navigate(`/especialistas?${params.toString()}`);
  };

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border/50">
      <div className="bg-brand-blueLight w-full px-4 sm:px-6">
        <div className="flex items-center justify-between h-20 gap-4">
          <Link to="/" className="flex items-center flex-shrink-0">
            <span className="font-heading font-extrabold text-[23px] sm:text-[26px] whitespace-nowrap">
              <span className="text-brand-navy">Busco</span><span className="text-brand-blue">UnDoctor</span>
            </span>
          </Link>

          {/* Buscador compacto: en todas las páginas, incluido el Home */}
          {
            <div className="hidden lg:flex items-center bg-white rounded-full shadow-sm border border-border/50 flex-1 max-w-xl overflow-hidden">
              <div className="flex flex-col justify-center px-4 py-1.5 flex-1 min-w-0">
                <label className="text-[10px] font-semibold text-muted-foreground leading-none mb-0.5">Especialidad o enfermedad</label>
                <SearchableSelect
                  options={searchOptions}
                  value={searchPick}
                  onChange={setSearchPick}
                  placeholder="Especialidad o enfermedad"
                  icon={Stethoscope}
                  triggerClassName={triggerClass}
                />
              </div>
              <div className="w-px h-8 bg-border flex-shrink-0" />
              <div className="flex flex-col justify-center px-4 py-1.5 flex-1 min-w-0">
                <label className="text-[10px] font-semibold text-muted-foreground leading-none mb-0.5">Zona</label>
                <SearchableSelect
                  options={zoneOptions}
                  value={searchZone}
                  onChange={setSearchZone}
                  placeholder="Monterrey y San Pedro"
                  icon={MapPin}
                  hint="Zona"
                  triggerClassName={triggerClass}
                />
              </div>
              <button
                type="button"
                onClick={submitSearch}
                aria-label="Buscar especialista"
                className="flex-shrink-0 w-10 h-10 mr-1.5 rounded-full bg-brand-blue hover:bg-brand-blue/90 text-white flex items-center justify-center transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          }

          <div className="hidden md:flex items-center gap-4 flex-shrink-0">
            <Link
              to="/panel-medico"
              className="text-sm font-medium text-brand-navy/70 hover:text-brand-navy transition-colors whitespace-nowrap"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/registro-medico"
              className="flex items-center gap-1.5 bg-brand-navy text-white text-sm font-semibold rounded-full pl-4 pr-4 py-2.5 hover:bg-brand-navy/90 transition-colors whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4 flex-shrink-0" />
              ¿Eres profesional de la salud?
            </Link>
          </div>

          <button
            onClick={() => setOpen(!open)}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            className="md:hidden p-2 rounded-lg hover:bg-brand-bluePale transition-colors text-brand-navy flex-shrink-0">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Buscador compacto en móvil: debajo del header, en todas las páginas */}
        {
          <div className="lg:hidden flex items-center gap-2 mb-3">
            <div className="flex-1 min-w-0 bg-white rounded-full shadow-sm border border-border/50 px-3 py-1">
              <SearchableSelect
                options={searchOptions}
                value={searchPick}
                onChange={setSearchPick}
                placeholder="¿Qué buscas?"
                icon={Stethoscope}
                triggerClassName={triggerClass}
              />
            </div>
            <div className="flex-1 min-w-0 bg-white rounded-full shadow-sm border border-border/50 px-3 py-1">
              <SearchableSelect
                options={zoneOptions}
                value={searchZone}
                onChange={setSearchZone}
                placeholder="Zona"
                icon={MapPin}
                hint="Zona"
                triggerClassName={triggerClass}
              />
            </div>
            <button
              type="button"
              onClick={submitSearch}
              aria-label="Buscar especialista"
              className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-blue hover:bg-brand-blue/90 text-white flex items-center justify-center transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        }
      </div>

      {open &&
      <div className="md:hidden border-t border-border/50 bg-card/95 backdrop-blur-lg">
          <nav className="flex flex-col gap-2 px-4 py-3">
            <Link
              to="/panel-medico"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent hover:text-brand-navy transition-colors">
              <LogIn className="w-4 h-4 flex-shrink-0" />
              Iniciar sesión
            </Link>
            <Link
              to="/registro-medico"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold bg-brand-navy text-white hover:bg-brand-navy/90 transition-colors">
              <UserPlus className="w-4 h-4 flex-shrink-0" />
              ¿Eres profesional de la salud?
            </Link>
          </nav>
        </div>
      }
    </header>);

}
