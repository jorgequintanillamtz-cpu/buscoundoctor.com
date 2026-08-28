import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MapPin, ArrowRight, Search, ShieldCheck, Star, Users, Sparkles, Stethoscope, ChevronLeft, ChevronRight, Plus, CheckCircle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import SearchableSelect from "../components/SearchableSelect";
import { buildSearchOptions } from "@/lib/searchOptions";
import SpecialtyCard from "../components/SpecialtyCard";
import BlogCard from "../components/BlogCard";
import Logo from "../components/Logo";
import { resolveCitySlug } from "@/lib/citySlug";

// `mobile: true` marca las 5 filas más importantes, que son las únicas que
// se muestran en el slider/tabla recortada de móvil (el resto solo aparece
// en la comparativa completa de escritorio).
const COMPARISON_ROWS = [
  { us: "Cédula profesional verificada", them: "Confías sin comprobar nada", mobile: true },
  { us: "Varios especialistas para comparar", them: "Normalmente solo 1 o 2 nombres", mobile: true },
  { us: "Experiencia, precios y horarios en un lugar", them: "Depende de lo que recuerden" },
  { us: "Reseñas de varios pacientes reales", them: "La opinión de una sola persona", mobile: true },
  { us: "Encuentras opciones en minutos", them: "Esperas días a que te recomienden" },
  { us: "Precio visible antes de agendar", them: "No lo sabes hasta llegar", mobile: true },
  { us: "Filtras por ciudad", them: "Puede estar lejos sin saberlo" },
  { us: "Contacto directo por WhatsApp", them: "Depende de que te compartan el contacto", mobile: true },
  { us: "Perfil actualizado por el médico", them: "Información desactualizada" },
  { us: "Filtras por tu necesidad específica", them: "La recomendación era para alguien más" },
];

const HOME_FAQS = [
  { question: "¿Cuesta usar BuscoUnDoctor?", answer: "No, usar BuscoUnDoctor es completamente gratuito para pacientes. Puedes buscar especialistas, revisar perfiles verificados y contactar directamente a cualquier médico sin costo ni necesidad de registrarte." },
  { question: "¿Cómo se verifica a los médicos?", answer: "Cada médico debe subir su cédula profesional al crear su perfil. Un administrador de BuscoUnDoctor revisa ese documento manualmente antes de aprobar la publicación, y el sello de ‘Cédula profesional verificada’ solo aparece una vez confirmada la revisión." },
  { question: "¿Cómo agendo una cita?", answer: "Contactas directamente al médico desde su perfil, por WhatsApp o llamada telefónica. BuscoUnDoctor no gestiona la agenda del consultorio; es el propio médico quien confirma contigo el horario disponible." },
  { question: "¿BuscoUnDoctor da consejos médicos o diagnósticos?", answer: "No. Somos un directorio que te ayuda a encontrar y contactar especialistas; no ofrecemos diagnósticos, recomendaciones de tratamiento ni asesoría médica. Cualquier duda de salud debe consultarse directamente con un profesional." },
  { question: "¿Puedo dejar una reseña de mi médico?", answer: "Sí. Desde el perfil del médico que consultaste puedes escribir una reseña con tu calificación y comentario. Las reseñas se revisan antes de publicarse para mantener la calidad de la información y evitar spam." },
];

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

const TRUST_STRIP = [
  { icon: Users, label: "Perfiles para cada especialista", key: "perfiles" },
  { icon: Star, label: "Reseñas verificadas de pacientes reales", key: "resenas" },
  { icon: ShieldCheck, label: "Cédulas profesionales verificadas a mano", key: "cedula" },
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
  const [featured, setFeatured] = useState([]);
  const [posts, setPosts] = useState([]);
  const [zones, setZones] = useState([]);
  // Especialidades y enfermedades combinadas en un solo buscador (mismo
  // patrón que src/components/SearchBar.jsx): el usuario puede escribir
  // tanto "dermatólogo" como "acné" en el buscador principal del home.
  // `heroSpecialty` guarda el id combinado ("spec:..." o "cond:...") pese al
  // nombre, para no tocar el resto de las referencias a esa variable.
  const searchOptions = useMemo(() => buildSearchOptions(specialties, conditions), [specialties, conditions]);
  // Nombre "como lo busca el paciente" por especialidad (ej. "Ginecólogo"),
  // para las tarjetas de doctores destacados más abajo.
  const specialtyDisplayMap = useMemo(() => {
    const map = {};
    specialties.forEach((s) => { map[s.name] = s.display_name || s.name; });
    return map;
  }, [specialties]);
  const zoneOptions = useMemo(() => zones.map((z) => ({ id: z.name, name: z.name })), [zones]);
  const [totalSpecialists, setTotalSpecialists] = useState(0);
  const [loading, setLoading] = useState(true);
  const [heroSpecialty, setHeroSpecialty] = useState("");
  const [heroZone, setHeroZone] = useState("");
  const [familyPhotoUrl, setFamilyPhotoUrl] = useState("");
  const [doctorPhotoUrl, setDoctorPhotoUrl] = useState("");
  const blogScrollRef = useRef(null);

  const submitHeroSearch = () => {
    // Navega a las páginas SEO dedicadas (/:professionSlug/:citySlug) en vez
    // del filtro genérico /especialistas?..., que lleva noindex a propósito (Sprint 11).
    const picked = searchOptions.find((o) => o.id === heroSpecialty);
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

  useEffect(() => {
    async function load() {
      const [specs, specialists, blogPosts, zoneList, allActive, siteSettings, conditionList] = await Promise.all([
      base44.entities.Specialty.filter({ active: true }),
      base44.entities.Specialist.filter({ featured: true, active: true }),
      base44.entities.BlogPost.filter({ published: true }, "-created_date", 100),
      base44.entities.Zone.filter({ active: true }),
      base44.entities.Specialist.filter({ active: true }),
      base44.entities.SiteSettings.list().catch(() => []),
      // Límite alto explícito: el banco ya pasa de 1000 registros y el
      // default del backend se queda corto ahí (mismo bug que se corrigió
      // en /admin/enfermedades y en SearchBar.jsx).
      base44.entities.Condition.filter({ active: true }, "name", 2000).catch(() => [])]
      );
      setSpecialties(specs);
      setConditions(conditionList);
      setFeatured(specialists);
      setPosts(blogPosts);
      setZones(zoneList);
      setTotalSpecialists(allActive.length);
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

  useEffect(() => {
    const faqLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": HOME_FAQS.map((f) => ({
        "@type": "Question",
        "name": f.question,
        "acceptedAnswer": { "@type": "Answer", "text": f.answer },
      })),
    };
    const faqScript = document.createElement("script");
    faqScript.type = "application/ld+json";
    faqScript.id = "home-jsonld-faq";
    faqScript.text = JSON.stringify(faqLd);
    document.head.appendChild(faqScript);
    return () => { faqScript.remove(); };
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
      <section className="relative bg-brand-navy overflow-hidden min-h-[85vh] sm:min-h-[90vh] flex flex-col justify-center py-16 sm:py-20">
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
          <div className="max-w-3xl mx-auto">
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight text-white mb-3 sm:mb-4">
              Encuentra a tu especialista en <span className="border-b-4 border-brand-blue">Monterrey</span> y San Pedro
            </h1>
            <p className="flex items-center justify-center gap-2 text-white/80 text-sm sm:text-base leading-relaxed mb-7 sm:mb-9 max-w-xl mx-auto">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 flex-shrink-0" />
              Describe qué te pasa o a quién buscas: te ayudamos a encontrar y agendar con el especialista correcto.
            </p>
          </div>

          {/* Buscador: sin tarjeta blanca alrededor, directo sobre el fondo
              azul. Ancho (casi del largo de la página) y bajo — campos lado
              a lado dentro de una píldora, sin la etiqueta chica arriba de
              cada campo. El id lo usa Header.jsx (IntersectionObserver) para
              mostrar el buscador compacto del header solo cuando este sale
              de la vista. */}
          <div id="hero-search-bar" className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0 bg-white rounded-2xl sm:rounded-full shadow-2xl sm:p-1.5 overflow-hidden">
              <div className="flex flex-col justify-center text-left px-6 py-3 sm:py-1.5 flex-1 min-w-0">
                <SearchableSelect
                  options={searchOptions}
                  value={heroSpecialty}
                  onChange={setHeroSpecialty}
                  placeholder="¿Qué especialidad o enfermedad buscas?"
                  icon={Stethoscope}
                  hint="Especialidad"
                  triggerClassName="h-auto text-base font-medium text-foreground bg-transparent"
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
                  triggerClassName="h-auto text-base font-medium text-foreground bg-transparent"
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

          {/* Pills de especialidades populares: flotando debajo del buscador,
              sin tarjeta que las contenga, como en la referencia. */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-5 sm:mt-6">
            {sortByPopularity(specialties).slice(0, 8).map((s) => (
              <Link
                key={s.id}
                to={`/${s.profession_slug}/${resolveCitySlug(zones)}`}
                className="text-xs sm:text-sm font-medium text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors rounded-full px-3 py-1.5"
              >
                {s.display_name || s.name}
              </Link>
            ))}
            <Link
              to="/especialistas"
              className="text-xs sm:text-sm font-medium text-brand-navy bg-white hover:bg-white/90 transition-colors rounded-full px-3 py-1.5"
            >
              Ver más
            </Link>
          </div>

          {/* Fila de confianza: texto fino debajo de las pills, como el
              disclaimer de la referencia. */}
          <div className="hidden sm:flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-9 text-white/70 text-xs">
            {TRUST_STRIP.map((item) => (
              <span key={item.key} className="flex items-center gap-1.5">
                <item.icon className={`w-3.5 h-3.5 flex-shrink-0 ${item.key === "cedula" ? "text-emerald-400" : "text-brand-bluePale"}`} />
                {item.key === "perfiles" ? "Perfiles verificados de especialistas" : item.label}
              </span>
            ))}
          </div>
        </div>

      </section>

      {/* Specialties: las 8 más buscadas */}
      <section>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-10">
          <div className="text-center mb-9">
            <p className="text-xs sm:text-sm font-semibold text-brand-blue uppercase tracking-widest mb-1.5">Especialidades</p>
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-brand-navy">Atención médica integral para cada necesidad</h2>
          </div>
          {/* Móvil: slider horizontal para no ocupar tanto espacio vertical */}
          <div
            className="sm:hidden flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scroll-smooth"
            style={{ scrollbarWidth: 'none' }}
          >
            {sortByPopularity(specialties).slice(0, 8).map((s) =>
            <div key={s.id} className="snap-start">
              <SpecialtyCard specialty={s} mobile />
            </div>
            )}
          </div>

          {/* Tablet/desktop: grid como antes */}
          <div className="hidden sm:flex flex-wrap justify-center gap-x-6 sm:gap-x-10 gap-y-8">
            {sortByPopularity(specialties).slice(0, 8).map((s) =>
            <SpecialtyCard key={s.id} specialty={s} />
            )}
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

      {/* Featured: 6 doctores distribuidos en fila completa (próximamente slider hasta 12) */}
      <section style={{ background: 'linear-gradient(to bottom, white 0%, #EAF2FF 12%, #EAF2FF 88%, white 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-10">
          <div className="text-center mb-9">
            <p className="text-xs sm:text-sm font-semibold text-brand-blue uppercase tracking-widest mb-1.5">Nuestro equipo</p>
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-brand-navy">Especialistas destacados</h2>
          </div>
          {/* Móvil: slider horizontal para no ocupar tanto espacio vertical */}
          <div
            className="sm:hidden flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scroll-smooth"
            style={{ scrollbarWidth: 'none' }}
          >
            {featured.slice(0, 6).map((s) =>
            <Link
              key={s.id}
              to={`/especialista/${s.slug}`}
              className="group flex flex-col items-center flex-shrink-0 w-28 snap-start"
            >
              <div className="w-28 h-28 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                {s.profile_photo ? (
                  <img src={s.profile_photo} alt={s.full_name} className="w-full h-full object-cover object-top" />
                ) : (
                  <div className="w-full h-full bg-brand-bluePale flex items-center justify-center">
                    <span className="font-heading font-bold text-2xl text-brand-blue/50">
                      {s.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </span>
                  </div>
                )}
              </div>
              <div className="pt-3 text-center">
                <h3 className="font-heading font-bold text-sm text-foreground leading-tight">{s.full_name}</h3>
                <p className="text-brand-blue text-xs font-medium mt-1">{specialtyDisplayMap[s.specialty] || s.specialty}</p>
                {s.years_experience &&
                <p className="text-muted-foreground text-[11px] mt-1">{s.years_experience}+ años</p>
                }
              </div>
            </Link>
            )}
          </div>

          {/* Tablet/desktop: grid como antes */}
          <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-x-4 sm:gap-x-6 gap-y-9 justify-items-center">
            {featured.slice(0, 6).map((s) =>
            <Link
              key={s.id}
              to={`/especialista/${s.slug}`}
              className="group flex flex-col items-center w-full max-w-[11rem]"
            >
              <div className="w-32 h-32 sm:w-36 sm:h-36 lg:w-40 lg:h-40 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                {s.profile_photo ? (
                  <img src={s.profile_photo} alt={s.full_name} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full bg-brand-bluePale flex items-center justify-center">
                    <span className="font-heading font-bold text-3xl text-brand-blue/50">
                      {s.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </span>
                  </div>
                )}
              </div>
              <div className="pt-3 text-center">
                <h3 className="font-heading font-bold text-base text-foreground leading-tight group-hover:text-brand-blue transition-colors">{s.full_name}</h3>
                <p className="text-brand-blue text-sm font-medium mt-1">{specialtyDisplayMap[s.specialty] || s.specialty}</p>
                {s.years_experience &&
                <p className="text-muted-foreground text-xs mt-1">{s.years_experience}+ años de experiencia</p>
                }
              </div>
            </Link>
            )}
          </div>
          <div className="flex justify-center mt-10">
            <Link
              to="/especialistas"
              className="inline-flex items-center gap-2 bg-white hover:bg-accent border border-border text-brand-navy text-sm font-semibold px-6 py-2.5 rounded-full shadow-sm transition-colors">
              Ver todos los doctores
            </Link>
          </div>
        </div>
      </section>

      {/* "¡Es gratis!": versión móvil, movida aquí (debajo de Especialistas
          destacados). Solo las imágenes, sin texto encima ni tarjeta de
          texto debajo (a pedido explícito). Oculta en desktop, que ya tiene
          su propio bloque de dos columnas más arriba. */}
      <div className="sm:hidden px-4 py-4 space-y-3">
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

      {/* BuscoUnDoctor vs. Recomendaciones: comparativa visual, fila por fila con VS */}
      <section className="bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-14">
          <div className="text-center mb-9">
            <p className="text-xs sm:text-sm font-semibold text-brand-blue uppercase tracking-widest mb-1.5">Comparativa</p>
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-brand-navy">
              ¿Y si solo le preguntas a un conocido?
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Así se compara buscar en BuscoUnDoctor contra ir con recomendaciones</p>
          </div>

          <div className="relative bg-white rounded-3xl border border-border/60 shadow-xl">
            {/* Encabezados */}
            <div className="grid grid-cols-2 rounded-t-3xl overflow-hidden">
              <div className="bg-brand-navy px-3 sm:px-8 py-5 sm:py-6 flex items-center justify-center sm:justify-start">
                {/* Logo real en vez del ícono + texto "BuscoUnDoctor.com", a tamaño grande
                    para llenar bien el recuadro (fondo transparente, sin placa). */}
                <Logo to="/" className="h-9 sm:h-12" />
              </div>
              <div className="bg-muted px-3 sm:px-8 py-5 sm:py-6 flex items-center gap-2 sm:gap-2.5">
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-muted-foreground/20 flex items-center justify-center flex-shrink-0">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                </div>
                <h3 className="font-heading font-bold text-xs sm:text-base text-muted-foreground leading-tight">Recomendaciones</h3>
              </div>
            </div>

            {/* Insignia "VS", en el flujo normal, superpuesta a la división con márgenes negativos (no se recorta) */}
            <div className="relative z-10 flex justify-center -mt-5 -mb-5 sm:-mt-6 sm:-mb-6">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white border-2 border-brand-blue shadow-md flex items-center justify-center">
                <span className="font-heading font-extrabold text-[10px] sm:text-xs text-brand-blue">VS</span>
              </div>
            </div>

            {/* Filas de comparación, una junto a la otra. En móvil solo las 5 más
                importantes (row.mobile), con una nota de que hay más; en
                desktop se muestran las 10. */}
            <div className="rounded-b-3xl overflow-hidden">
              {COMPARISON_ROWS.filter((row) => row.mobile).map((row, i) => (
                <div key={i} className={`sm:hidden grid grid-cols-2 ${i % 2 === 1 ? "bg-brand-blueLight/40" : "bg-white"}`}>
                  <div className="flex items-start gap-1.5 px-3 py-3 border-r border-border/40">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span className="text-[11px] text-foreground leading-snug">{row.us}</span>
                  </div>
                  <div className="flex items-start gap-1.5 px-3 py-3">
                    <X className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0 mt-0.5" />
                    <span className="text-[11px] text-muted-foreground leading-snug">{row.them}</span>
                  </div>
                </div>
              ))}
              {COMPARISON_ROWS.map((row, i) => (
                <div key={i} className={`hidden sm:grid grid-cols-2 ${i % 2 === 1 ? "bg-brand-blueLight/40" : "bg-white"}`}>
                  <div className="flex items-start gap-2.5 px-8 py-3.5 border-r border-border/40">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground leading-snug">{row.us}</span>
                  </div>
                  <div className="flex items-start gap-2.5 px-8 py-3.5">
                    <X className="w-4 h-4 text-muted-foreground/60 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground leading-snug">{row.them}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Nota en móvil: deja claro que hay más diferencias además de las 5 mostradas */}
            <p className="sm:hidden text-center text-xs text-muted-foreground px-4 py-3 border-t border-border/40">
              Y muchas diferencias más a favor de BuscoUnDoctor.
            </p>
          </div>
        </div>
      </section>

      {/* Preguntas frecuentes: oculta por completo en móvil para no alargar la
          página; sigue disponible en /preguntas-frecuentes y en desktop. */}
      <section className="hidden sm:block max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-10">
        <div className="relative bg-brand-navy rounded-3xl overflow-hidden p-6 sm:p-10 lg:p-14">
          <div className="absolute -top-10 -right-10 w-56 h-56 bg-brand-blue/10 rounded-full pointer-events-none" />
          <div className="relative grid md:grid-cols-2 gap-10 lg:gap-16">
            <div>
              <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 text-white text-xs font-medium px-3 py-1.5 rounded-full mb-5">
                <Sparkles className="w-3 h-3 text-brand-bluePale" />
                Tus preguntas, respondidas
              </span>
              <h2 className="font-heading font-extrabold text-3xl sm:text-4xl leading-tight">
                <span className="text-white block">Preguntas</span>
                <span className="text-brand-bluePale block">Frecuentes</span>
              </h2>
              <p className="text-white/70 mt-4 leading-relaxed">
                Reunimos las dudas más comunes sobre cómo funciona BuscoUnDoctor: qué cuesta, cómo verificamos a los médicos y cómo se agenda una cita.
              </p>

              <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="font-heading font-bold text-lg text-white">¿Sigues con dudas?</h3>
                <p className="text-sm text-white/70 mt-2 leading-relaxed">
                  Buscar al especialista correcto puede generar preguntas. Escríbenos y con gusto te ayudamos.
                </p>
                <Button className="mt-4 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-xl" asChild>
                  <Link to="/contacto">Contactar</Link>
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {HOME_FAQS.map((f, i) => (
                <details key={i} className="group bg-white/5 border border-white/10 rounded-2xl px-5 py-4 open:bg-white/10 transition-colors">
                  <summary className="flex items-center justify-between gap-3 cursor-pointer list-none font-heading font-semibold text-sm sm:text-base text-white">
                    {f.question}
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-blue/20 flex items-center justify-center text-brand-bluePale group-open:rotate-45 transition-transform">
                      <Plus className="w-3.5 h-3.5" />
                    </span>
                  </summary>
                  <p className="text-sm text-white/70 leading-relaxed mt-3">{f.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA: banner navy de ancho completo, rediseñado para vender mejor el
          registro al doctor — badge, checklist de beneficios concretos, prueba
          social real (número de especialistas ya inscritos) y CTA más fuerte,
          con el mismo lenguaje ya validado en /para-medicos. */}
      <section className="relative bg-brand-navy overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -bottom-16 -right-10 w-[280px] h-[280px] bg-brand-blue/20"
            style={{ borderRadius: '58% 42% 65% 35% / 55% 45% 55% 45%' }}
          />
          <div
            className="absolute -top-16 -left-10 w-[200px] h-[200px] bg-brand-blue/10"
            style={{ borderRadius: '42% 58% 35% 65% / 45% 55% 45% 55%' }}
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-9 sm:py-16">
          <div className="grid md:grid-cols-3 gap-8 md:gap-10 items-center">
            <div className="md:col-span-2 text-center md:text-left">
              {/* Badge "Para especialistas de la salud": visible también en móvil,
                  para que quede claro que esta sección es para los médicos y no
                  para los pacientes. El párrafo y el checklist siguen solo en desktop. */}
              <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                <Stethoscope className="w-3.5 h-3.5 text-brand-bluePale" />
                Para especialistas de la salud
              </span>
              <h2 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-white leading-tight">
                Que los pacientes que buscan tu especialidad te encuentren a ti primero
              </h2>

              {/* "Aparece en Google y ChatGPT": visible en móvil y desktop, es el
                  gancho principal que refuerza el CTA con logos reconocibles. */}
              <div className="mt-3 flex flex-wrap items-center justify-center md:justify-start gap-x-1.5 gap-y-1 text-sm text-white/90 font-medium">
                <span>Aparece en</span>
                <span className="inline-flex items-center gap-1">
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                    <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.7 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.6 39.7 16.3 44 24 44z" />
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4 5.7l6.6 5.6C40.5 36.5 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z" />
                  </svg>
                  Google
                </span>
                <span className="text-white/60">y</span>
                <span className="inline-flex items-center gap-1">
                  <svg className="w-4 h-4 flex-shrink-0 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.0552v5.5826a4.504 4.504 0 0 1-4.4945 4.4903zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.5963 3.8558L13.1078 8.3971l2.02-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.7948.7948 0 0 0-.4079-.6765zm2.0107-3.0231-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V5.986a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.7014 5.3743a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
                  </svg>
                  ChatGPT
                </span>
              </div>

              <p className="hidden sm:block text-white/80 mt-3 max-w-lg mx-auto md:mx-0">
                {totalSpecialists > 0
                  ? `Únete a los ${totalSpecialists} especialistas que ya tienen su perfil verificado en BuscoUnDoctor.`
                  : "Crea tu perfil verificado y aparece cuando un paciente busque tu especialidad."}
              </p>

              <ul className="hidden sm:flex mt-5 flex-wrap gap-x-5 gap-y-2.5 justify-center md:justify-start">
                {["Perfil verificado gratis", "Contacto directo por WhatsApp"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-white/90 font-medium">
                    <span className="w-5 h-5 rounded-full bg-emerald-400/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-emerald-400" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-5 sm:mt-7">
                <Button size="lg" variant="secondary" className="min-h-[48px] font-heading font-semibold bg-white text-brand-navy hover:bg-white/90 gap-2" asChild>
                  <Link to="/registro-medico">
                    Crear mi perfil gratis
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <p className="text-xs text-white/60 mt-3">Empieza gratis · Sin tarjeta de crédito · Actívalo en 5 minutos</p>
              </div>
            </div>
            <div className="hidden md:flex justify-center">
              <div className="w-28 h-28 rounded-full bg-brand-blue/20 flex items-center justify-center">
                <Stethoscope className="w-14 h-14 text-brand-bluePale" />
              </div>
            </div>
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