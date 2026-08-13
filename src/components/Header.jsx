import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Search, Stethoscope, MapPin, LogIn, UserPlus, ChevronRight } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import SearchableSelect from "@/components/SearchableSelect";
import Logo from "@/components/Logo";
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
  // Barra fija "¿Eres médico?": visible en todas las páginas, no interrumpe la
  // navegación (no es un popup) y el usuario puede cerrarla si no le interesa.
  const [showDoctorBanner, setShowDoctorBanner] = useState(true);
  const [zones, setZones] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [searchPick, setSearchPick] = useState("");
  const [searchZone, setSearchZone] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";

  // Bloquea el scroll del fondo mientras el menú móvil a pantalla completa está abierto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

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
    // Navega a las páginas SEO dedicadas (/:professionSlug/monterrey[/:zonaSlug]) en vez
    // del filtro genérico /especialistas?..., que lleva noindex a propósito (Sprint 11).
    if (resolvedSpecialty) {
      if (searchZone) {
        navigate(`/${resolvedSpecialty.profession_slug}/monterrey/${slugify(searchZone)}`);
      } else {
        navigate(`/${resolvedSpecialty.profession_slug}/monterrey`);
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
      {showDoctorBanner && (
        // Nota: el botón de cerrar NO va anidado dentro del <Link> (eso es HTML
        // inválido -- botón dentro de enlace -- y en móvil hacía que el tap no
        // se registrara bien). Ahora son hermanos dentro de un contenedor relativo.
        <div className="relative flex items-center bg-brand-navy">
          <Link
            to="/registro-medico"
            className="flex-1 flex items-center justify-center gap-1.5 text-white text-xs sm:text-sm font-medium py-2 px-9 sm:px-10 hover:bg-brand-navy/90 transition-colors"
          >
            <Stethoscope className="w-3.5 h-3.5 text-brand-bluePale flex-shrink-0" />
            <span>¿Eres médico? Regístrate aquí</span>
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
          </Link>
          <button
            type="button"
            onClick={() => setShowDoctorBanner(false)}
            aria-label="Cerrar aviso"
            className="absolute right-2 sm:right-4 p-1 rounded-full hover:bg-white/15 transition-colors text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="bg-brand-blueLight w-full px-4 sm:px-6 pb-3 lg:pb-0">
        <div className="flex items-center justify-between h-20 gap-4">
          <Logo to="/" className="h-[47px] sm:h-[52px]" />

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
          <div className="lg:hidden flex items-center gap-2">
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

      <div
        className={`md:hidden fixed inset-0 z-[60] bg-white flex flex-col transform transition-transform duration-300 ease-in-out will-change-transform ${
          open ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
        aria-hidden={!open}
      >
          <div className="flex items-center justify-between h-20 px-4 sm:px-6 bg-brand-blueLight border-b border-border/50 flex-shrink-0">
            <Logo to="/" onClick={() => setOpen(false)} className="h-[47px]" />
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
              className="p-2 rounded-lg hover:bg-white/50 transition-colors text-brand-navy flex-shrink-0">
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex flex-col px-4 sm:px-6 overflow-y-auto flex-1">
            <Link
              to="/panel-medico"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 py-4 border-b border-border/50 text-base font-medium text-brand-navy hover:text-brand-blue transition-colors">
              <LogIn className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
              Iniciar sesión
            </Link>
            <Link
              to="/registro-medico"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between py-4 border-b border-border/50 text-base font-medium text-brand-navy hover:text-brand-blue transition-colors">
              <span className="flex items-center gap-3">
                <UserPlus className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
                Crear cuenta nueva
              </span>
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </Link>
          </nav>
        </div>
    </header>);

}