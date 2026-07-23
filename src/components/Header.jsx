import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Search, Stethoscope, UserRound } from "lucide-react";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

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
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchSpecialty) params.set("specialty", searchSpecialty);
    if (searchZone) params.set("zone", searchZone);
    navigate(`/especialistas?${params.toString()}`);
  };

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border/50">
      <div className="bg-brand-blueLight w-full px-4 sm:px-6">
        <div className="flex items-center justify-between h-20 gap-4">
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-brand-navy flex items-center justify-center">
              <span className="text-white font-heading font-bold text-sm">B</span>
            </div>
            <span className="font-heading font-bold text-lg text-brand-navy whitespace-nowrap">
              BuscoUnDoctor.com
            </span>
          </Link>

          {/* Buscador compacto: solo en páginas que no son el Home */}
          {!isHome && (
            <form
              onSubmit={submitSearch}
              className="hidden lg:flex items-center bg-white rounded-full shadow-sm border border-border/50 flex-1 max-w-xl overflow-hidden"
            >
              <div className="flex flex-col justify-center px-4 py-1.5 flex-1 min-w-0">
                <label className="text-[10px] font-semibold text-muted-foreground leading-none">Especialidad</label>
                <select
                  value={searchSpecialty}
                  onChange={(e) => setSearchSpecialty(e.target.value)}
                  className="text-sm font-medium text-foreground bg-transparent outline-none leading-tight w-full appearance-none"
                >
                  <option value="">Todas las especialidades</option>
                  {specialties.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-px h-8 bg-border flex-shrink-0" />
              <div className="flex flex-col justify-center px-4 py-1.5 flex-1 min-w-0">
                <label className="text-[10px] font-semibold text-muted-foreground leading-none">Zona</label>
                <select
                  value={searchZone}
                  onChange={(e) => setSearchZone(e.target.value)}
                  className="text-sm font-medium text-foreground bg-transparent outline-none leading-tight w-full appearance-none"
                >
                  <option value="">Monterrey y San Pedro</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.name}>{z.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                aria-label="Buscar especialista"
                className="flex-shrink-0 w-10 h-10 mr-1.5 rounded-full bg-brand-blue hover:bg-brand-blue/90 text-white flex items-center justify-center transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
          )}

          <nav className="hidden md:flex items-center gap-6 flex-shrink-0">
            <Link to="/registro-medico" className="flex items-center gap-2 text-brand-navy/80 hover:text-brand-navy transition-colors">
              <Stethoscope className="w-5 h-5 text-brand-blue flex-shrink-0" />
              <span className="leading-tight text-left">
                <span className="block text-[10px] text-brand-navy/50">¿Eres médico?</span>
                <span className="text-sm font-semibold">Regístrate</span>
              </span>
            </Link>
            <Link to="/admin" className="flex items-center gap-2 text-brand-navy/80 hover:text-brand-navy transition-colors">
              <UserRound className="w-5 h-5 flex-shrink-0" />
              <span className="leading-tight text-left">
                <span className="block text-[10px] text-brand-navy/50">Cuenta</span>
                <span className="text-sm font-semibold">Iniciar sesión</span>
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

        {/* Buscador compacto en móvil: debajo del header, solo si no es Home */}
        {!isHome && (
          <form onSubmit={submitSearch} className="lg:hidden flex items-center gap-2 mb-3">
            <select
              value={searchSpecialty}
              onChange={(e) => setSearchSpecialty(e.target.value)}
              className="flex-1 min-w-0 text-sm font-medium text-foreground bg-white rounded-full shadow-sm border border-border/50 outline-none px-4 py-2.5 appearance-none"
            >
              <option value="">Especialidad</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
            <select
              value={searchZone}
              onChange={(e) => setSearchZone(e.target.value)}
              className="flex-1 min-w-0 text-sm font-medium text-foreground bg-white rounded-full shadow-sm border border-border/50 outline-none px-4 py-2.5 appearance-none"
            >
              <option value="">Zona</option>
              {zones.map((z) => (
                <option key={z.id} value={z.name}>{z.name}</option>
              ))}
            </select>
            <button
              type="submit"
              aria-label="Buscar especialista"
              className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-blue hover:bg-brand-blue/90 text-white flex items-center justify-center transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>
        )}
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
            <Link
            to="/admin"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-brand-bluePale hover:text-brand-navy transition-colors">
              <UserRound className="w-4 h-4" />
              Iniciar sesión
            </Link>
          </nav>
        </div>
      }
    </header>);

}
