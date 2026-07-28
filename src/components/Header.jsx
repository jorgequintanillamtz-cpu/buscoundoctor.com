import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Search, Stethoscope, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const triggerClass =
  "border-0 shadow-none h-auto p-0 gap-1 focus:ring-0 focus:ring-offset-0 text-sm font-medium text-foreground bg-transparent [&>span]:line-clamp-1";
const contentClass =
  "rounded-2xl border-none shadow-xl p-2 bg-white";
const itemClass =
  "rounded-xl px-3 py-2 text-sm cursor-pointer focus:bg-brand-bluePale focus:text-brand-navy data-[state=checked]:bg-brand-bluePale data-[state=checked]:text-brand-navy";

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
                <Select value={searchSpecialty} onValueChange={setSearchSpecialty}>
                  <SelectTrigger className={triggerClass}>
                    <SelectValue placeholder="Todas las especialidades" />
                  </SelectTrigger>
                  <SelectContent className={contentClass}>
                    {specialties.map((s) => (
                      <SelectItem key={s.id} value={s.name} className={itemClass} icon={Stethoscope} hint="Especialidad">{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-px h-8 bg-border flex-shrink-0" />
              <div className="flex flex-col justify-center px-4 py-1.5 flex-1 min-w-0">
                <label className="text-[10px] font-semibold text-muted-foreground leading-none mb-0.5">Zona</label>
                <Select value={searchZone} onValueChange={setSearchZone}>
                  <SelectTrigger className={triggerClass}>
                    <SelectValue placeholder="Monterrey y San Pedro" />
                  </SelectTrigger>
                  <SelectContent className={contentClass}>
                    {zones.map((z) => (
                      <SelectItem key={z.id} value={z.name} className={itemClass} icon={MapPin} hint="Zona">{z.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

          <nav className="hidden md:flex items-center gap-6 flex-shrink-0">
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
              <Select value={searchSpecialty} onValueChange={setSearchSpecialty}>
                <SelectTrigger className={triggerClass}>
                  <SelectValue placeholder="Especialidad" />
                </SelectTrigger>
                <SelectContent className={contentClass}>
                  {specialties.map((s) => (
                    <SelectItem key={s.id} value={s.name} className={itemClass} icon={Stethoscope} hint="Especialidad">{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-0 bg-white rounded-full shadow-sm border border-border/50 px-3 py-1">
              <Select value={searchZone} onValueChange={setSearchZone}>
                <SelectTrigger className={triggerClass}>
                  <SelectValue placeholder="Zona" />
                </SelectTrigger>
                <SelectContent className={contentClass}>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.name} className={itemClass} icon={MapPin} hint="Zona">{z.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
