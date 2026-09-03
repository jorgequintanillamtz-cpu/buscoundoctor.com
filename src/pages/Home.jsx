import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MapPin, ArrowRight, Search, ShieldCheck, Star, Users, Stethoscope, ChevronLeft, ChevronRight, CheckCircle, UserPlus, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SearchableSelect from "../components/SearchableSelect";
import { buildSearchOptions } from "@/lib/searchOptions";
import BlogCard from "../components/BlogCard";
import { resolveCitySlug } from "@/lib/citySlug";
import { HERO_SPECIALTY_PLACEHOLDERS } from "@/lib/heroSearchPlaceholders";
import CountdownBox from "@/components/CountdownBox";
import { LAUNCH_DATE, useCountdown } from "@/lib/launchCountdown";

// Ilustración decorativa de fondo del hero: una fila de siluetas de personas
// (pacientes y médicos, estos últimos marcados con un pequeño gafete/estetoscopio)
// apoyadas en el borde inferior de la sección azul, al estilo de la
// ilustración de "comunidad" que usa Doctoralia detrás de su buscador.
const HERO_PEOPLE = [
  { x: 10, scale: 0.72, opacity: 0.07 },
  { x: 130, scale: 1.02, opacity: 0.12, doctor: true },
  { x: 275, scale: 0.62, opacity: 0.08 },
  { x: 375, scale: 0.92, opacity: 0.13 },
  { x: 520, scale: 0.68, opacity: 0.08 },
  { x: 645, scale: 1.08, opacity: 0.14, doctor: true },
  { x: 800, scale: 0.72, opacity: 0.09 },
  { x: 900, scale: 0.98, opacity: 0.12 },
  { x: 1045, scale: 0.64, opacity: 0.08 },
  { x: 1160, scale: 0.95, opacity: 0.13, doctor: true },
  { x: 1300, scale: 0.7, opacity: 0.09 },
  { x: 1400, scale: 0.6, opacity: 0.07 },
];

function HeroPeopleIllustration({ className = "" }) {
  return (
    <svg viewBox="0 0 1440 200" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true">
      {HERO_PEOPLE.map((p, i) => (
        <g key={i} transform={`translate(${p.x}, ${200 - 170 * p.scale})`}>
          <g transform={`scale(${p.scale})`}>
            <path d="M0,170 L0,80 Q0,50 30,50 L70,50 Q100,50 100,80 L100,170 Z" fill="#FFFFFF" opacity={p.opacity} />
            <circle cx="50" cy="30" r="28" fill="#FFFFFF" opacity={p.opacity} />
            {p.doctor && (
              <>
                <rect x="38" y="58" width="24" height="55" rx="6" fill="#0B1E4D" opacity={Math.min(p.opacity * 1.8, 0.5)} />
                <circle cx="50" cy="66" r="6" fill="#DCE9FF" opacity={Math.min(p.opacity * 3, 0.65)} />
              </>
            )}
          </g>
        </g>
      ))}
    </svg>
  );
}

// Formato "headline en negritas + texto de apoyo", como la franja de datos
// (+36M visitas, +390K profesionales...) que Doctoralia pone debajo de su
// hero. Nosotros no tenemos esas métricas de tráfico, así que en vez de
// inventar números usamos nuestras 3 promesas reales en ese mismo formato.
// Esqueleto/mockup de la sección "Explora por especialidad": todavía no hay
// doctores reales registrados en estas 5 especialidades, así que cada
// slider se llena con tarjetas placeholder ("Doctor 1", "Doctor 2"...).
// Reemplazar por datos reales de Specialist en cuanto haya doctores.
const SPECIALTY_SLIDER_PLACEHOLDERS = ["Dentista", "Dermatólogo"];

// Datos de relleno (ciudad, años de experiencia, precio de primera consulta)
// para las tarjetas placeholder de arriba — se repiten en ciclo para las 10
// tarjetas de cada slider, solo para dar una idea realista del formato.
const PLACEHOLDER_DOCTOR_INFO = [
  { city: "Monterrey", years: 8, price: 650 },
  { city: "San Pedro Garza García", years: 12, price: 800 },
  { city: "Monterrey", years: 5, price: 550 },
  { city: "San Pedro Garza García", years: 15, price: 900 },
  { city: "Monterrey", years: 10, price: 700 },
];

// "Únete a BuscoUnDoctor": banner de reclutamiento de médicos como 3 pasos
// del proceso (registro -> validación de cédula -> nuevos pacientes), con
// un solo botón de llamada a la acción al final en vez de una tarjeta con
// link por cada paso.
const JOIN_STEPS = [
  {
    number: "1",
    title: "Regístrate",
    description: "Crea tu perfil profesional en minutos con tus datos, especialidad y consultorio.",
    icon: UserPlus,
  },
  {
    number: "2",
    title: "Validamos tu información",
    description: "Revisamos tu cédula profesional a mano para que tu perfil quede verificado.",
    icon: ShieldCheck,
  },
  {
    number: "3",
    title: "Obtén nuevos pacientes",
    description: "Tu perfil aparece en el directorio y empiezas a recibir solicitudes de citas.",
    icon: Users,
  },
];

const TRUST_STRIP = [
  { icon: Users, headline: "Perfiles verificados", caption: "de especialistas certificados", key: "perfiles" },
  { icon: Star, headline: "Reseñas reales", caption: "de pacientes que ya agendaron", key: "resenas" },
  { icon: ShieldCheck, headline: "Cédula profesional", caption: "verificada a mano por nuestro equipo", key: "cedula" },
];

// Orden por demanda típica en un directorio médico (no por fecha de creación en la base de datos)
const POPULAR_SPECIALTY_ORDER = [
  "Dentista", "Ginecología", "Pediatría", "Dermatología", "Psicología",
  "Nutrición", "Ortopedia y Traumatología", "Oftalmología", "Cardiología",
  "Otorrinolaringología", "Medicina General", "Urología", "Psiquiatría",
  "Gastroenterología", "Endocrinología",
];

function sortByPopularity(list) {
  return [...list].sort((a, b) => {
    const ia = POPULAR_SPECIALTY_ORDER.indexOf(a.name);
    const ib = POPULAR_SPECIALTY_ORDER.indexOf(b.name);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

// Las 5 categorías destacadas de la página de inicio (estilo tarjeta grande
// con ilustración + nombre encima, al estilo "Explore" de apps de directorio
// tipo Dubai). Mientras no se suba una imagen real via /admin/imagenes-del-sitio
// (campo home_card_image_url de Specialty), la tarjeta es un rectángulo azul
// sólido con el nombre centrado en grande -- sin ícono ni color por categoría.
const FEATURED_HOME_CATEGORIES = [
  { name: "Dentista" },
  { name: "Ginecología" },
  { name: "Pediatría" },
  { name: "Dermatología" },
  { name: "Psicología" },
];

// Una silueta de doctor por tarjeta (mismo estilo -- blanco translucido,
// cuerpo + cabeza + bata + gafete -- que HeroPeopleIllustration en el hero,
// aquí un solo personaje más grande como decoración de cada tarjeta de
// especialidad, en vez de las burbujas anteriores). Centrada abajo en las 5;
// solo el volteo alterna por tarjeta (mismo orden que FEATURED_HOME_CATEGORIES)
// para que no se vean idénticas.
const CATEGORY_ILLUSTRATION_VARIANTS = [
  { flip: false }, // Dentista
  { flip: true },  // Ginecología
  { flip: false }, // Pediatría
  { flip: true },  // Dermatología
  { flip: false }, // Psicología
];

function CardDoctorIllustration({ flip = false }) {
  return (
    <svg
      viewBox="0 0 200 220"
      preserveAspectRatio="xMidYMax meet"
      className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[90%] ${flip ? "scale-x-[-1]" : ""}`}
      aria-hidden="true"
    >
      <path d="M20,220 L20,120 Q20,78 62,78 L138,78 Q180,78 180,120 L180,220 Z" fill="#FFFFFF" opacity="0.09" />
      <circle cx="100" cy="50" r="44" fill="#FFFFFF" opacity="0.09" />
      <rect x="74" y="92" width="52" height="110" rx="12" fill="#FFFFFF" opacity="0.06" />
      <circle cx="100" cy="108" r="11" fill="#FFFFFF" opacity="0.14" />
    </svg>
  );
}

const slugify = (s) => (s || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9\s-]/g, "")
  .trim()
  .replace(/\s+/g, "-")
  .replace(/-+/g, "-");

export default function Home() {
  const navigate = useNavigate();
  const [specialties, setSpecialties] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [subspecialties, setSubspecialties] = useState([]);
  const [posts, setPosts] = useState([]);
  const [zones, setZones] = useState([]);
  // Especialidades, subespecialidades y enfermedades combinadas en un solo
  // buscador (mismo patrón que Header.jsx y src/components/SearchBar.jsx):
  // el usuario puede escribir tanto "dermatólogo" como "cirugía
  // maxilofacial" o "acné" en el buscador principal del home.
  // `heroSpecialty` guarda el id combinado ("spec:...", "sub:..." o
  // "cond:...") pese al nombre, para no tocar el resto de las referencias a
  // esa variable.
  const searchOptions = useMemo(() => buildSearchOptions(specialties, conditions, subspecialties), [specialties, conditions, subspecialties]);
  const zoneOptions = useMemo(() => zones.map((z) => ({ id: z.name, name: z.name })), [zones]);
  const [loading, setLoading] = useState(true);
  const [heroSpecialty, setHeroSpecialty] = useState("");
  const [heroZone, setHeroZone] = useState("");
  const [familyPhotoUrl, setFamilyPhotoUrl] = useState("");
  const [doctorPhotoUrl, setDoctorPhotoUrl] = useState("");
  const blogScrollRef = useRef(null);
  // Un ref por especialidad para los sliders de "Explora por especialidad"
  // (cada uno se desplaza de forma independiente con sus propias flechitas).
  const specialtySliderRefs = useRef({});

  const submitHeroSearch = () => {
    // Navega a las páginas SEO dedicadas (/:professionSlug/:citySlug) en vez
    // del filtro genérico /especialistas?..., que lleva noindex a propósito (Sprint 11).
    const picked = searchOptions.find((o) => o.id === heroSpecialty);
    if (picked?.type === "subspecialty") {
      // Página SEO dedicada (/subespecialidad/:slug/:citySlug), mismo patrón
      // que specialty: arranca noindex y se indexa sola en cuanto haya
      // doctores reales (ver SubspecialtyPage.jsx).
      const citySlug = resolveCitySlug(zones, heroZone);
      navigate(`/subespecialidad/${picked.ref.slug}/${citySlug}`);
      return;
    }
    if (picked?.type === "condition") {
      // Antes esto resolvía a "la" especialidad que clasifica la enfermedad
      // en el catálogo (ej. Acupuntura para "Ansiedad y estrés") y navegaba a
      // su página SEO, lo que escondía a doctores de otras especialidades que
      // también la tratan. Ahora se manda al directorio general (/especialistas)
      // filtrado por esta enfermedad específica (conditions_relation), sin
      // importar la especialidad de cada doctor.
      const params = new URLSearchParams();
      params.set("condition", picked.ref.slug);
      if (heroZone) params.set("zone", heroZone);
      navigate(`/especialistas?${params.toString()}`);
      return;
    }
    const specialtyObj = picked?.type === "specialty" ? picked.ref : null;
    if (specialtyObj) {
      const citySlug = resolveCitySlug(zones, heroZone);
      if (heroZone) {
        navigate(`/${specialtyObj.profession_slug}/${citySlug}/${slugify(heroZone)}`);
      } else {
        navigate(`/${specialtyObj.profession_slug}/${citySlug}`);
      }
      return;
    }
    const params = new URLSearchParams();
    if (heroZone) params.set("zone", heroZone);
    navigate(`/especialistas?${params.toString()}`);
  };

  const scrollBlog = (dir) => {
    const el = blogScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.85), behavior: "smooth" });
  };

  const scrollSpecialtySlider = (spec, dir) => {
    const el = specialtySliderRefs.current[spec];
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.85), behavior: "smooth" });
  };

  useEffect(() => {
    async function load() {
      const [specs, blogPosts, zoneList, siteSettings, conditionList, subspecialtyList] = await Promise.all([
      base44.entities.Specialty.filter({ active: true }),
      base44.entities.BlogPost.filter({ published: true }, "-created_date", 100),
      base44.entities.Zone.filter({ active: true }),
      base44.entities.SiteSettings.list().catch(() => []),
      // Límite alto explícito: el banco ya pasa de 1000 registros y el
      // default del backend se queda corto ahí (mismo bug que se corrigió
      // en /admin/enfermedades y en SearchBar.jsx).
      base44.entities.Condition.filter({ active: true }, "name", 2000).catch(() => []),
      base44.entities.Subspecialty.filter({ active: true }).catch(() => [])]
      );
      setSpecialties(specs);
      setConditions(conditionList);
      setSubspecialties(subspecialtyList);
      setPosts(blogPosts);
      setZones(zoneList);
      setFamilyPhotoUrl(siteSettings[0]?.family_photo_url || "");
      setDoctorPhotoUrl(siteSettings[0]?.doctor_photo_url || "");

      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    document.title = "Directorio Médico Verificado en Monterrey y San Pedro Garza García | BuscoUnDoctor";
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', "Encuentra especialistas verificados en Monterrey y San Pedro Garza García. Busca por especialidad y zona, compara perfiles con cédula profesional verificada y contacta directo.");
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>);

  }

  return (
    <div>
      {/* Hero: rediseño estilo Doctoralia — el header comparte el mismo azul
          marino (ver Header.jsx `isHome`), todo el contenido va centrado en
          una sola columna con el título pegado arriba, y el buscador es
          grande y vive directo sobre el fondo azul, sin tarjeta blanca
          alrededor. Las pills de especialidades flotan justo debajo, y una
          ilustración de personas (médicos y pacientes) decora el fondo. El
          azul cubre casi toda la pantalla (min-h) y termina en corte recto,
          sin curva ondulada. */}
      <section className="relative bg-brand-navy overflow-hidden min-h-[100dvh] sm:min-h-[90vh] flex flex-col justify-center py-20 sm:py-20">
        {/* Decorative organic blobs (full-bleed, clipped to section) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-24 -right-16 w-[420px] h-[420px] bg-brand-blue/15"
            style={{ borderRadius: '58% 42% 65% 35% / 55% 45% 55% 45%' }}
          />
          <div
            className="absolute bottom-0 -left-24 w-[300px] h-[300px] bg-brand-blue/10"
            style={{ borderRadius: '42% 58% 35% 65% / 45% 55% 45% 55%' }}
          />
        </div>

        {/* Ilustración de personas: solo desktop (en móvil el espacio es muy
            angosto y competiría con el buscador). Se apoya en el borde
            inferior recto de la sección. */}
        <HeroPeopleIllustration className="hidden sm:block absolute bottom-0 left-0 w-full h-40 md:h-56 pointer-events-none select-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight text-white mb-4 sm:mb-4 sm:whitespace-nowrap">
              Encuentra a tu especialista en <span className="border-b-4 border-brand-blue">Monterrey</span>
            </h1>
            <p className="flex items-center justify-center gap-2 text-white/80 text-sm sm:text-base leading-relaxed mb-8 sm:mb-9 max-w-xl mx-auto">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 flex-shrink-0" />
              Te ayudamos a encontrar y agendar con el especialista correcto.
            </p>
          </div>

          {/* Buscador: sin tarjeta blanca alrededor, directo sobre el fondo
              azul. Ancho (casi del largo de la página) y bajo — campos lado
              a lado dentro de una píldora, sin la etiqueta chica arriba de
              cada campo. El id lo usa Header.jsx (IntersectionObserver) para
              mostrar el buscador compacto del header solo cuando este sale
              de la vista. */}
          <div id="hero-search-bar" className="max-w-4xl mx-auto">
            {/* Aro de luz animado alrededor del buscador, estilo el efecto de
                Siri/Apple Intelligence (ver .siri-glow-border en index.css). */}
            <div className="siri-glow-border relative rounded-2xl sm:rounded-full">
            <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0 bg-white rounded-2xl sm:rounded-full shadow-2xl sm:p-1.5 overflow-hidden">
              <div className="flex flex-col justify-center text-left px-6 py-3 sm:py-1.5 flex-1 min-w-0">
                <SearchableSelect
                  options={searchOptions}
                  value={heroSpecialty}
                  onChange={setHeroSpecialty}
                  placeholder="¿Qué especialidad o enfermedad buscas?"
                  animatedPlaceholders={HERO_SPECIALTY_PLACEHOLDERS}
                  placeholderPrefix="Busca:"
                  icon={Stethoscope}
                  hint="Especialidad"
                  triggerClassName="h-auto text-sm sm:text-base font-medium text-foreground bg-transparent"
                />
              </div>
              <div className="hidden sm:block w-px h-8 bg-border" />
              <div className="flex flex-col justify-center text-left px-6 py-3 sm:py-1.5 flex-1 min-w-0 border-t sm:border-t-0 border-border/60">
                <SearchableSelect
                  options={zoneOptions}
                  value={heroZone}
                  onChange={setHeroZone}
                  placeholder="Monterrey y San Pedro"
                  icon={MapPin}
                  hint="Ciudad"
                  triggerClassName="h-auto text-sm sm:text-base font-medium text-foreground bg-transparent"
                />
              </div>
              <button
                type="button"
                onClick={submitHeroSearch}
                aria-label="Buscar especialista"
                className="flex items-center justify-center gap-2 bg-brand-blue hover:bg-brand-blue/90 text-white font-heading font-semibold text-base rounded-2xl sm:rounded-full flex-shrink-0 px-6 py-3 sm:w-11 sm:h-11 sm:p-0"
              >
                <Search className="w-5 h-5" />
                <span className="sm:hidden">Buscar</span>
              </button>
            </div>
            </div>
          </div>

          {/* Pills de especialidades populares: flotando debajo del buscador,
              sin tarjeta que las contenga, como en la referencia. */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-7 sm:mt-6">
            {sortByPopularity(specialties).slice(0, 8).map((s) => (
              <Link
                key={s.id}
                to={`/${s.profession_slug}/${resolveCitySlug(zones)}`}
                className="text-sm sm:text-base font-medium text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors rounded-full px-3 py-1.5"
              >
                {s.display_name || s.name}
              </Link>
            ))}
            <Link
              to="/especialistas"
              className="text-sm sm:text-base font-medium text-brand-navy bg-white hover:bg-white/90 transition-colors rounded-full px-3 py-1.5"
            >
              Ver más
            </Link>
          </div>

        </div>

        {/* Letras chicas: en móvil quedan en flujo normal debajo de las
            pills (con su propio margen), para que la sección crezca lo que
            necesite y no se amontonen contra el fondo fijo del hero. En
            escritorio, que sí tiene de sobra alto (min-h-[90vh]), se anclan
            aparte hasta abajo de la sección. Mismo espíritu que el aviso
            legal de la referencia (no diagnosticamos, aceptas nuestros
            términos), redactado con texto propio. */}
        <p className="mt-8 sm:mt-0 sm:absolute sm:bottom-6 sm:inset-x-0 z-10 px-4 sm:px-6 text-center text-white/60 text-[11px] sm:text-xs leading-relaxed">
          <span className="max-w-xl mx-auto block">
            Te ayudamos a encontrar y contactar especialistas: no ofrecemos diagnósticos ni sustituimos una consulta médica.
            {" "}Al usar BuscoUnDoctor aceptas nuestros{" "}
            <Link to="/terminos-y-condiciones" className="underline hover:text-white/90">Términos y condiciones</Link>
            {" "}y nuestro{" "}
            <Link to="/aviso-de-privacidad" className="underline hover:text-white/90">Aviso de privacidad</Link>.
          </span>
        </p>

      </section>

      {/* Franja de confianza: mismo formato que la barra de datos (+36M
          visitas, +390K profesionales...) que Doctoralia pone justo debajo
          de su hero — headline en negritas + texto de apoyo, en 3 columnas.
          Usamos nuestras 3 promesas reales en vez de métricas de tráfico que
          no tenemos. */}
      <section className="bg-white border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-9 sm:py-11">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 text-center">
            {TRUST_STRIP.map((item) => (
              <div key={item.key} className="flex sm:flex-col items-center sm:items-center justify-center gap-3 sm:gap-1.5">
                {item.key === "resenas" ? (
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                ) : (
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${item.key === "cedula" ? "text-emerald-500" : "text-brand-blue"}`} />
                )}
                <div className="text-left sm:text-center">
                  <p className="font-heading font-extrabold text-lg sm:text-xl text-brand-navy leading-tight">{item.headline}</p>
                  <p className="text-muted-foreground text-xs sm:text-sm">{item.caption}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specialties: 5 categorías destacadas, tarjetas grandes con imagen
          (estilo "Explore" tipo Dubai). En móvil el slider se sale del
          margen de la página por el lado derecho a propósito (bleed),
          mostrando 2 tarjetas completas y una asomando, igual que la
          referencia. Las imágenes se administran en
          /admin/imagenes-del-sitio (Specialty.home_card_image_url); si aún
          no hay imagen sube, se muestra un círculo de color + ícono. */}
      <section>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10">
          <div className="text-center mb-9">
            <p className="text-xs sm:text-sm font-semibold text-brand-blue uppercase tracking-widest mb-1.5">Especialidades</p>
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-brand-navy">Atención médica integral para cada necesidad</h2>
          </div>
        </div>

        {/* Slider horizontal: se usa en móvil Y en tablet/iPad (hasta antes
            de lg, 1024px). Con solo 5 tarjetas, un grid de 5 columnas fijo
            (grid-cols-5) no tiene suficiente ancho por tarjeta en ese rango
            y el nombre de la especialidad se corta contra el borde (ej.
            "Ginecólog[o]", "Dermatólog[o]" en iPad) -- por eso el corte se
            movió de sm (640px) a lg (1024px). El padding izquierdo va como
            scroll-padding (además de padding normal) porque, sin él, Chrome
            hace scroll-snap automático al cargar la página y "se come" el
            padding-left -- la primera tarjeta terminaba pegada al borde en
            vez de dejar el espacio. */}
        <div
          className="lg:hidden flex gap-3 overflow-x-auto pb-2 pl-4 snap-x snap-mandatory scroll-smooth"
          style={{ scrollbarWidth: 'none', scrollPaddingLeft: '1rem' }}
        >
          {FEATURED_HOME_CATEGORIES.map((cat, idx) => {
            const s = specialties.find((x) => x.name === cat.name);
            if (!s) return null;
            return (
              <Link
                key={cat.name}
                to={`/${s.profession_slug}/${resolveCitySlug(zones)}`}
                className="relative flex-shrink-0 w-[47vw] max-w-[230px] aspect-[3/2] snap-start rounded-2xl overflow-hidden"
              >
                {s.home_card_image_url ? (
                  // Foto con fondo azul marino ya incluido (misma proporción 3:2
                  // que la tarjeta): se muestra completa y el nombre va arriba,
                  // en el espacio azul que deja la composición de la foto.
                  <>
                    <img src={s.home_card_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <span className="absolute top-3 inset-x-0 text-center font-heading font-extrabold text-xl text-white">{s.display_name || s.name}</span>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-brand-navy px-3 overflow-hidden">
                    <CardDoctorIllustration {...CATEGORY_ILLUSTRATION_VARIANTS[idx % CATEGORY_ILLUSTRATION_VARIANTS.length]} />
                    <span className="relative font-heading font-extrabold text-xl text-white text-center leading-tight">{s.display_name || s.name}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 lg:pt-0 pb-10">
          {/* Desktop (lg+, 1024px): fila de 5. Ver comentario arriba del
              slider sobre por qué el corte no puede ser antes (sm). */}
          <div className="hidden lg:grid grid-cols-5 gap-4">
            {FEATURED_HOME_CATEGORIES.map((cat, idx) => {
              const s = specialties.find((x) => x.name === cat.name);
              if (!s) return null;
              return (
                <Link
                  key={cat.name}
                  to={`/${s.profession_slug}/${resolveCitySlug(zones)}`}
                  className="group relative aspect-[3/2] rounded-2xl overflow-hidden"
                >
                  {s.home_card_image_url ? (
                    // Mismo tratamiento que la versión móvil (ver comentario arriba).
                    <>
                      <img
                        src={s.home_card_image_url}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <span className="absolute top-4 inset-x-0 text-center font-heading font-extrabold text-2xl text-white">{s.display_name || s.name}</span>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-brand-navy px-3 overflow-hidden transition-transform duration-300 group-hover:scale-105">
                      <CardDoctorIllustration {...CATEGORY_ILLUSTRATION_VARIANTS[idx % CATEGORY_ILLUSTRATION_VARIANTS.length]} />
                      <span className="relative font-heading font-extrabold text-2xl text-white text-center leading-tight">{s.display_name || s.name}</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
          <div className="flex justify-center mt-10">
            <Link
              to="/especialistas"
              className="inline-flex items-center gap-2 bg-white hover:bg-accent border border-border text-brand-navy text-sm font-semibold px-6 py-2.5 rounded-full shadow-sm transition-colors">
              Ver todas las especialidades
            </Link>
          </div>
        </div>
      </section>

      {/* Explora por especialidad: un slider horizontal con 10 doctores por
          especialidad, respetando el ancho normal de la página (max-w-7xl,
          igual que el resto del contenido). Esqueleto/mockup — todavía no
          hay doctores reales registrados en estas 5 especialidades, así que
          se usan tarjetas placeholder ("Doctor 1", "Doctor 2"...) con
          ciudad/años/precio de relleno y sin link a ningún perfil.
          Reemplazar por datos reales de Specialist filtrados por
          especialidad en cuanto haya doctores dados de alta. */}
      <section className="bg-white pt-10 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-9">
            <p className="text-xs sm:text-sm font-semibold text-brand-blue uppercase tracking-widest mb-1.5">Explora por especialidad</p>
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-brand-navy">Encuentra especialistas cerca de ti</h2>
          </div>

          {SPECIALTY_SLIDER_PLACEHOLDERS.map((spec) => (
            <div key={spec} className="mb-10 last:mb-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-bold text-base sm:text-lg text-brand-navy">{spec}</h3>
                <div className="hidden sm:flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => scrollSpecialtySlider(spec, -1)}
                    aria-label={`${spec}: anteriores`}
                    className="w-9 h-9 rounded-full border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollSpecialtySlider(spec, 1)}
                    aria-label={`${spec}: siguientes`}
                    className="w-9 h-9 rounded-full border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div
                ref={(el) => { specialtySliderRefs.current[spec] = el; }}
                className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
                style={{ scrollbarWidth: 'none' }}
              >
                {Array.from({ length: 10 }, (_, idx) => idx + 1).map((n) => {
                  const info = PLACEHOLDER_DOCTOR_INFO[(n - 1) % PLACEHOLDER_DOCTOR_INFO.length];
                  return (
                    <div
                      key={n}
                      className="flex flex-shrink-0 w-[270px] sm:w-[300px] snap-start rounded-2xl border border-border/50 bg-card overflow-hidden"
                    >
                      {/* Placeholder de foto: cuando haya doctores reales, subir
                          fotos cuadradas de 1000x1000px y mostrarlas aquí con
                          <img className="w-full h-full object-cover" .../> — el
                          object-cover recorta la imagen cuadrada para llenar
                          exactamente el alto del recuadro sin deformarse. */}
                      <div className="w-24 sm:w-28 self-stretch flex-shrink-0 bg-brand-bluePale flex items-center justify-center overflow-hidden">
                        <span className="font-heading font-bold text-2xl text-brand-blue/50">D{n}</span>
                      </div>
                      <div className="flex-1 min-w-0 p-4">
                        <h4 className="font-heading font-bold text-sm text-foreground leading-tight">Doctor {n}</h4>
                        <p className="text-brand-blue text-xs font-medium mt-0.5">{spec}</p>
                        <div className="flex items-center gap-0.5 mt-1.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                          <p className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            {info.city}
                          </p>
                          <p>{info.years}+ años de experiencia</p>
                          <p>
                            Primera consulta:{" "}
                            <span className="font-medium text-foreground">${info.price} MXN</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Por qué BuscoUnDoctor: es gratis, dos columnas — pacientes a la
          izquierda, registro de doctor a la derecha. Solo la imagen, sin
          texto encima ni tarjeta de texto debajo (a pedido explícito). La
          columna de doctores es un link completo a /registro-medico ya que
          perdimos el botón de texto. Solo desktop aquí — en móvil esta
          sección va más abajo (después de Especialistas destacados). */}
      <section className="hidden sm:block bg-brand-blueLight/60">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <div className="grid sm:grid-cols-2 gap-8">
            {familyPhotoUrl && (
              <img
                src={familyPhotoUrl}
                alt="Agendar en BuscoUnDoctor es gratis para pacientes"
                className="w-full h-auto rounded-3xl shadow-sm"
              />
            )}
            {doctorPhotoUrl && (
              <Link to="/registro-medico">
                <img
                  src={doctorPhotoUrl}
                  alt="Regístrate como doctor en BuscoUnDoctor"
                  className="w-full h-auto rounded-3xl shadow-sm"
                />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* "¡Es gratis!": versión móvil, movida aquí (debajo de Especialistas
          destacados). Solo las imágenes, sin texto encima ni tarjeta de
          texto debajo (a pedido explícito). Oculta en desktop, que ya tiene
          su propio bloque de dos columnas más arriba. Mismo espaciado
          vertical (pt-10 pb-10) que el resto de las secciones del home.
          space-y-5 (20px) se veía casi pegado porque ambas fotos tienen
          fondos muy claros que se confunden con el fondo blanco de la
          página -- se sube a space-y-10 (40px) para que el corte entre una
          y otra sea evidente a simple vista. */}
      <div className="sm:hidden px-4 pt-10 pb-10 space-y-10">
        {familyPhotoUrl && (
          <img
            src={familyPhotoUrl}
            alt="Agendar en BuscoUnDoctor es gratis para pacientes"
            className="w-full h-auto rounded-2xl"
          />
        )}
        {doctorPhotoUrl && (
          <Link to="/registro-medico">
            <img
              src={doctorPhotoUrl}
              alt="Regístrate como doctor en BuscoUnDoctor"
              className="w-full h-auto rounded-2xl"
            />
          </Link>
        )}
      </div>

      {/* Cómo verificamos a nuestros médicos: rápido de leer, directo a la confianza.
          Se oculta en móvil porque el mensaje ya se comunica en el subtítulo del hero. */}
      <section className="hidden sm:block">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-10">
          <div className="bg-brand-navy rounded-3xl overflow-hidden relative p-7 sm:p-10">
            <div className="absolute -top-12 -right-12 w-56 h-56 bg-brand-blue/20 rounded-full pointer-events-none" />
            <div className="relative flex flex-col md:flex-row items-center gap-6 sm:gap-8">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/10 border-2 border-brand-bluePale flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-10 h-10 sm:w-12 sm:h-12 text-brand-bluePale" />
              </div>
              <div className="text-center md:text-left">
                <h2 className="font-heading font-bold text-2xl sm:text-3xl text-white">Cada médico, verificado a mano</h2>
                <p className="text-white/70 mt-2 max-w-lg">Nada de perfiles falsos: revisamos la cédula profesional de cada doctor antes de publicarlo.</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2.5 mt-5">
                  <span className="flex items-center gap-2 text-sm text-white/90">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    Cédula subida y revisada
                  </span>
                  <span className="flex items-center gap-2 text-sm text-white/90">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    Revisión manual, no automática
                  </span>
                  <span className="flex items-center gap-2 text-sm text-white/90">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    Sello visible en su perfil
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Únete a BuscoUnDoctor: banner de reclutamiento de médicos, justo
          arriba del blog, mostrado como 3 pasos (registro, validación,
          nuevos pacientes) con un solo botón de acción al final. Ver
          comentario de JOIN_STEPS más arriba. */}
      <section className="bg-white pt-10 pb-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-foreground">
              Únete a <span className="text-brand-blue">BuscoUnDoctor</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6">
            {JOIN_STEPS.map((step) => (
              <div key={step.number} className="flex flex-col items-center text-center">
                <div className="relative w-16 h-16 rounded-full bg-brand-navy flex items-center justify-center mb-4">
                  <step.icon className="w-7 h-7 text-brand-bluePale" strokeWidth={1.75} />
                  <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-brand-blue text-white text-xs font-bold flex items-center justify-center border-2 border-white">
                    {step.number}
                  </span>
                </div>
                <h3 className="font-heading font-bold text-lg text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs">{step.description}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-10">
            <Link
              to="/registro-medico"
              className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue/90 text-white font-heading font-semibold text-sm px-6 py-3 rounded-full shadow-sm transition-colors"
            >
              Regístrate gratis
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Blog: última sección antes del footer, slider deslizable con todos los artículos */}
      {posts.length > 0 &&
      <section style={{ background: 'linear-gradient(to bottom, white 0%, #EAF2FF 12%, #EAF2FF 88%, white 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-brand-navy">Blog de salud</h2>
            <div className="flex items-center gap-2">
              <Link to="/blog" className="text-sm font-medium text-primary hidden sm:flex items-center gap-1 hover:gap-2 transition-all mr-2">
                <span>Ver todos</span> <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={() => scrollBlog(-1)}
                aria-label="Artículos anteriores"
                className="hidden sm:flex w-9 h-9 rounded-full border border-border/50 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollBlog(1)}
                aria-label="Artículos siguientes"
                className="hidden sm:flex w-9 h-9 rounded-full border border-border/50 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div
            ref={blogScrollRef}
            className="flex gap-4 sm:gap-5 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
            style={{ scrollbarWidth: 'none' }}
          >
            {posts.map((p, i) =>
            <div key={p.id} className="flex-shrink-0 w-[82vw] sm:w-[320px] snap-start">
              <BlogCard post={p} priority={i === 0} />
            </div>
            )}
          </div>
          <Link to="/blog" className="text-sm font-medium text-primary sm:hidden flex items-center gap-1 mt-4">
            <span>Ver todos los artículos</span> <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        </section>
      }
    </div>);

}