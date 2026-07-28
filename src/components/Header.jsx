import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Search, Stethoscope, MapPin, LogIn } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import SearchableSelect from "@/components/SearchableSelect";

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
  const [searchSpecialty, setSearchSpecialty] = useState("");
  const [searchZone, setSearchZone] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";

  useEffect(() => {
    Promise.all([
      base44.entities.Zone.filter({ active: true }).catch(() => []),
      base44.entities.Specialty.filter({ active: true }).catch(() => []),
    ]).then(([z, s]) => { setZones(z); setSpecialties(s); });
  }, []);

  // El combobox trabaja con "id" como valor; aquí usamos el nombre como id
  // porque el resto de la lógica de búsqueda ya trabaja con nombres.
  const specialtyOptions = useMemo(() => specialties.map((s) => ({ id: s.name, name: s.name })), [specialties]);
  const zoneOptions = useMemo(() => zones.map((z) => ({ id: z.name, name: z.name })), [zones]);

  const submitSearch = (e) => {
    e?.preventDefault?.();
    // Navega a las páginas SEO dedicadas (/especialidad/:slug[/:zonaSlug]) en vez del
    // filtro genérico /especialistas?..., que lleva noindex a propósito (Sprint 11).
    const specialtyObj = specialties.find((s) => s.name === searchSpecialty);
    if (specialtyObj) {
      if (searchZone) {
        navigate(`/especialidad/${specialtyObj.slug}/${slugify(searchZone)}`);
      } else {
        navigate(`/especialidad/${specialtyObj.slug}`);
      }
      return;
    }
    // Sin especialidad seleccionada: no hay página dedicada solo-por-zona todavía,
    // así que caemos al listado general filtrado.
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
                <label className="text-[10px] font-semibold text-muted-foreground leading-none mb-0.5">Especialidad</label>
                <SearchableSelect
                  options={specialtyOptions}
                  value={searchSpecialty}
                  onChange={setSearchSpecialty}
                  placeholder="Todas las especialidades"
                  icon={Stethoscope}
                  hint="Especialidad"
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

          <nav className="hidden md:flex items-center gap-5 flex-shrink-0">
            <Link to="/panel-medico" className="flex items-center gap-2 text-brand-navy/80 hover:text-brand-navy transition-colors">
              <LogIn className="w-5 h-5 text-brand-blue flex-shrink-0" />
              <span className="leading-tight text-left">
                <span className="block text-[10px] text-brand-navy/50">¿Ya tienes perfil?</span>
                <span className="text-sm font-semibold">Iniciar sesión</span>
              </span>
            </Link>
            <Link to="/registro-medico" className="flex items-center gap-2 text-brand-navy/80 hover:text-brand-navy transition-colors">
              <Stethoscope className="w-5 h-5 text-brand-blue flex-shrink-0" />
              <span className="leading-tight text-left">
                <span className="block text-[10px] text-brand-navy/50">¿Eres médico?</span>
                <span className="text-sm font-semibold">Regístrate</span>
              </span>
            </Link>
          </nav>

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
                options={specialtyOptions}
                value={searchSpecialty}
                onChange={setSearchSpecialty}
                placeholder="Especialidad"
                icon={Stethoscope}
                hint="Especialidad"
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
          <nav className="flex flex-col px-4 py-3 gap-1">
            <Link
            to="/panel-medico"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-brand-bluePale hover:text-brand-navy transition-colors">
              <LogIn className="w-4 h-4" />
              Iniciar sesión (médicos)
            </Link>
            <Link
            to="/registro-medico"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-brand-bluePale hover:text-brand-navy transition-colors">
              <Stethoscope className="w-4 h-4" />
              ¿Eres médico? Regístrate
            </Link>
          </nav>
        </div>
      }
    </header>);

}
