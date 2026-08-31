import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Search, Stethoscope, MapPin, LogIn, UserPlus, ChevronRight } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import SearchableSelect from "@/components/SearchableSelect";
import Logo from "@/components/Logo";
import { buildSearchOptions } from "@/lib/searchOptions";
import { resolveCitySlug } from "@/lib/citySlug";

const triggerClass =
  "h-auto text-sm font-medium text-foreground bg-transparent";


export default function Header() {
  const headerRef = useRef(null);
  const [open, setOpen] = useState(false);
  // Barra fija "¿Eres médico?": visible en todas las páginas, no interrumpe la
  // navegación (no es un popup) y el usuario puede cerrarla si no le interesa.
  const [showDoctorBanner, setShowDoctorBanner] = useState(true);
  const [zones, setZones] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [subspecialties, setSubspecialties] = useState([]);
  const [searchPick, setSearchPick] = useState("");
  const [searchZone, setSearchZone] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";
  // Buscador compacto del header: en el Home arranca oculto (el buscador
  // grande del hero ya cumple ese rol) y solo aparece cuando ese buscador
  // grande desaparece de la vista al hacer scroll hacia abajo. En el resto
  // de las páginas siempre está visible, como antes.
  const [showCompactSearch, setShowCompactSearch] = useState(!isHome);

  // Bloquea el scroll del fondo mientras el menú móvil a pantalla completa está abierto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Calcula si el buscador grande del hero (Home.jsx le pone
  // id="hero-search-bar") sigue tapando al compacto, revisándolo en cada
  // scroll/resize con getBoundingClientRect (más confiable que un
  // IntersectionObserver cuando el nodo puede tardar en existir: Home.jsx
  // muestra un loader mientras carga sus datos, así que al montar el header
  // el nodo a veces todavía no está — un MutationObserver lo detecta en
  // cuanto aparece y se recalcula de inmediato).
  useEffect(() => {
    if (!isHome) {
      setShowCompactSearch(true);
      return;
    }

    const checkScroll = () => {
      const target = document.getElementById("hero-search-bar");
      if (!target) {
        setShowCompactSearch(false);
        return;
      }
      const headerH = headerRef.current?.offsetHeight || 96;
      const rect = target.getBoundingClientRect();
      // Aparece solo cuando el buscador grande ya quedó arriba del header
      // (su borde inferior sube por encima del alto real del header).
      setShowCompactSearch(rect.bottom < headerH);
    };

    checkScroll();
    window.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    const mutationObserver = new MutationObserver(checkScroll);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      mutationObserver.disconnect();
    };
  }, [isHome, location.pathname]);

  // Alto real del header (banner "¿Eres médico?" + barra principal) expuesto
  // como variable CSS. Elementos sticky más abajo en la página (la tarjeta
  // de "Agendar cita", el nav de scroll-spy) la usan para calcular su propio
  // offset y no quedar tapados por el header cuando ambos terminan "pegados"
  // arriba al hacer scroll. Antes esos offsets eran valores fijos (top-24,
  // top-20) que no alcanzaban a cubrir el alto real del header cuando el
  // banner estaba visible — con ResizeObserver esto se recalcula solo, y
  // sigue funcionando si el banner se cierra o el header cambia de alto por
  // cualquier otro motivo.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const setVar = () => {
      document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`);
    };
    setVar();
    const ro = new ResizeObserver(setVar);
    ro.observe(el);
    return () => ro.disconnect();
  }, [showDoctorBanner]);

  useEffect(() => {
    Promise.all([
      base44.entities.Zone.filter({ active: true }).catch(() => []),
      base44.entities.Specialty.filter({ active: true }).catch(() => []),
      // Límite alto explícito: el banco ya pasa de 1000 registros y el default
      // del backend se queda corto ahí (mismo bug corregido en /admin/enfermedades).
      base44.entities.Condition.filter({ active: true }, "name", 2000).catch(() => []),
      base44.entities.Subspecialty.filter({ active: true }).catch(() => []),
    ]).then(([z, s, c, sub]) => { setZones(z); setSpecialties(s); setConditions(c); setSubspecialties(sub); });
  }, []);

  // Especialidades, subespecialidades y enfermedades combinadas en un solo
  // buscador (como el de Doctoralia): el usuario puede escribir tanto
  // "dermatólogo" como "cirugía maxilofacial" o "acné".
  const searchOptions = useMemo(() => buildSearchOptions(specialties, conditions, subspecialties), [specialties, conditions, subspecialties]);
  const zoneOptions = useMemo(() => zones.map((z) => ({ id: z.name, name: z.name })), [zones]);

  const submitSearch = (e) => {
    e?.preventDefault?.();
    const picked = searchOptions.find((o) => o.id === searchPick);
    if (picked?.type === "subspecialty") {
      // Página SEO dedicada (/subespecialidad/:slug/:citySlug), mismo patrón
      // que specialty: arranca noindex y se indexa sola en cuanto haya
      // doctores reales (ver SubspecialtyPage.jsx).
      const citySlug = resolveCitySlug(zones, searchZone);
      navigate(`/subespecialidad/${picked.ref.slug}/${citySlug}`);
      return;
    }
    if (picked?.type === "condition") {
      // Antes esto resolvía a "la" especialidad que clasifica la enfermedad en
      // el catálogo (ej. Acupuntura para "Ansiedad y estrés") y navegaba a su
      // página SEO, lo que escondía a doctores de otras especialidades que
      // también la tratan. Ahora se manda al directorio general (/especialistas)
      // filtrado por esta enfermedad específica (conditions_relation), sin
      // importar la especialidad de cada doctor.
      const params = new URLSearchParams();
      params.set("condition", picked.ref.slug);
      if (searchZone) params.set("zone", searchZone);
      navigate(`/especialistas?${params.toString()}`);
      return;
    }
    const resolvedSpecialty = picked?.type === "specialty" ? picked.ref : null;
    // Navega a las páginas SEO dedicadas (/:professionSlug/:citySlug) en vez
    // del filtro genérico /especialistas?..., que lleva noindex a propósito (Sprint 11).
    if (resolvedSpecialty) {
      const citySlug = resolveCitySlug(zones, searchZone);
      navigate(`/${resolvedSpecialty.profession_slug}/${citySlug}`);
      return;
    }
    // Sin especialidad ni enfermedad seleccionada: no hay página dedicada solo-por-zona
    // todavía, así que caemos al listado general filtrado.
    const params = new URLSearchParams();
    if (searchZone) params.set("zone", searchZone);
    navigate(`/especialistas?${params.toString()}`);
  };

  // En el Home el header comparte el mismo azul marino que el hero (sin
  // borde/blur separador), como en la referencia de Doctoralia. En el resto
  // de las páginas conserva el fondo claro de siempre.
  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-50 ${
        isHome
          ? "bg-brand-navy"
          : "bg-card/80 backdrop-blur-lg border-b border-border/50"
      }`}
    >
      {showDoctorBanner && !isHome && (
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
      <div className={`w-full px-4 sm:px-6 ${showCompactSearch ? "pb-3 lg:pb-0" : "pb-0"} ${isHome ? "bg-brand-navy" : "bg-brand-blueLight"}`}>
        <div className="flex items-center justify-between h-20 gap-4">
          <Logo to="/" className="h-[47px] sm:h-[52px]" />

          {/* Buscador compacto: en el Home solo aparece tras hacer scroll y
              perder de vista el buscador grande del hero; en el resto de
              páginas siempre está visible. */}
          {showCompactSearch && (
            <div className="siri-glow-border relative hidden lg:block rounded-full flex-1 max-w-xl">
              <div className="relative z-10 flex items-center bg-white rounded-full shadow-sm overflow-hidden">
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
                  <label className="text-[10px] font-semibold text-muted-foreground leading-none mb-0.5">Ciudad</label>
                  <SearchableSelect
                    options={zoneOptions}
                    value={searchZone}
                    onChange={setSearchZone}
                    placeholder="Monterrey y San Pedro"
                    icon={MapPin}
                    hint="Ciudad"
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
            </div>
          )}

          <div className="hidden md:flex items-center gap-4 flex-shrink-0">
            <Link
              to="/panel-medico"
              className={`text-sm font-medium transition-colors whitespace-nowrap ${
                isHome ? "text-white/80 hover:text-white" : "text-brand-navy/70 hover:text-brand-navy"
              }`}
            >
              Iniciar sesión
            </Link>
            <Link
              to="/registro-medico"
              className={`flex items-center gap-1.5 text-sm font-semibold rounded-full pl-4 pr-4 py-2.5 transition-colors whitespace-nowrap ${
                isHome
                  ? "bg-white text-brand-navy hover:bg-white/90"
                  : "bg-brand-navy text-white hover:bg-brand-navy/90"
              }`}
            >
              <UserPlus className="w-4 h-4 flex-shrink-0" />
              ¿Eres profesional de la salud?
            </Link>
          </div>

          <button
            onClick={() => setOpen(!open)}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            className={`md:hidden p-2 rounded-lg transition-colors flex-shrink-0 ${
              isHome ? "text-white hover:bg-white/15" : "text-brand-navy hover:bg-brand-bluePale"
            }`}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Buscador compacto en móvil: debajo del header. En el Home, mismo
            criterio que el de escritorio (solo tras perder de vista el
            buscador grande del hero). */}
        {showCompactSearch && (
          <div className="lg:hidden flex items-center gap-2">
            <div className="siri-glow-border relative flex-1 min-w-0 rounded-full">
              <div className="relative z-10 bg-white rounded-full shadow-sm px-3 py-1">
                <SearchableSelect
                  options={searchOptions}
                  value={searchPick}
                  onChange={setSearchPick}
                  placeholder="¿Qué buscas?"
                  icon={Stethoscope}
                  triggerClassName={triggerClass}
                />
              </div>
            </div>
            <div className="siri-glow-border relative flex-1 min-w-0 rounded-full">
              <div className="relative z-10 bg-white rounded-full shadow-sm px-3 py-1">
                <SearchableSelect
                  options={zoneOptions}
                  value={searchZone}
                  onChange={setSearchZone}
                  placeholder="Ciudad"
                  icon={MapPin}
                  hint="Ciudad"
                  triggerClassName={triggerClass}
                />
              </div>
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
        )}
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