import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MapPin, ArrowRight, Search, ShieldCheck, MessageCircle, Star, Users, Sparkles, Stethoscope, ChevronLeft, ChevronRight, Plus, CheckCircle, X, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import SearchableSelect from "../components/SearchableSelect";
import SpecialtyCard from "../components/SpecialtyCard";
import BlogCard from "../components/BlogCard";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const COMPARISON_ROWS = [
  { us: "Cédula profesional verificada", them: "Confías sin comprobar nada" },
  { us: "Varios especialistas para comparar", them: "Normalmente solo 1 o 2 nombres" },
  { us: "Experiencia, precios y horarios en un lugar", them: "Depende de lo que recuerden" },
  { us: "Reseñas de varios pacientes reales", them: "La opinión de una sola persona" },
  { us: "Encuentras opciones en minutos", them: "Esperas días a que te recomienden" },
  { us: "Precio visible antes de agendar", them: "No lo sabes hasta llegar" },
  { us: "Filtras por tu zona exacta", them: "Puede estar lejos sin saberlo" },
  { us: "Contacto directo por WhatsApp", them: "Depende de que te compartan el contacto" },
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

// Ilustración placeholder de médico (no hay foto real disponible todavía).
// Sustituir por una fotografía real cuando esté disponible.
function DoctorHeroIllustration({ className = "" }) {
  return (
    <svg viewBox="0 0 320 360" className={className} role="img" aria-label="Ilustración de médico">
      <defs>
        <clipPath id="doctorHeroFrame">
          <path d="M160 10c85 0 150 65 150 150 0 90-65 190-150 190S10 250 10 160C10 75 75 10 160 10z" />
        </clipPath>
      </defs>
      <g clipPath="url(#doctorHeroFrame)">
        <rect width="320" height="360" fill="#EAF2FF" />
        <path d="M55 360 C55 258 108 228 160 228 C212 228 265 258 265 360 Z" fill="#FFFFFF" />
        <path d="M120 233 L160 272 L200 233 L188 218 L132 218 Z" fill="#2F6FED" />
        <rect x="140" y="188" width="40" height="46" fill="#F2C29A" />
        <circle cx="160" cy="148" r="65" fill="#F5CEA6" />
        <path d="M96 138 C96 88 120 58 160 58 C200 58 224 88 224 138 C224 118 210 103 190 98 C175 94 145 94 130 98 C112 103 96 118 96 138Z" fill="#0B1E4D" />
        <path d="M128 240 C128 270 148 286 160 286 C172 286 192 270 192 240" stroke="#0B1E4D" strokeWidth="6" fill="none" strokeLinecap="round" />
        <circle cx="160" cy="293" r="8" fill="#0B1E4D" />
      </g>
    </svg>
  );
}

const TRUST_STRIP = [
  { icon: Users, label: "Perfiles para cada especialista", key: "perfiles" },
  { icon: Star, label: "Reseñas verificadas de pacientes reales", key: "resenas" },
  { icon: Search, label: "Busca por lo que más te importa: especialidad y zona", key: "busca" },
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

const triggerClass = "h-auto text-sm font-medium text-foreground bg-transparent";

export default function Home() {
  const navigate = useNavigate();
  const [specialties, setSpecialties] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [posts, setPosts] = useState([]);
  const [zones, setZones] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [totalSpecialists, setTotalSpecialists] = useState(0);
  const [loading, setLoading] = useState(true);
  const [heroSpecialty, setHeroSpecialty] = useState("");
  const [heroZone, setHeroZone] = useState("");
  const [insurers, setInsurers] = useState([]);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState("idle");
  const blogScrollRef = useRef(null);

  const submitNewsletter = async (e) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes("@")) {
      setNewsletterStatus("error");
      return;
    }
    setNewsletterStatus("loading");
    try {
      await base44.entities.NewsletterSubscriber.create({ email: newsletterEmail, source: "home" });
      setNewsletterStatus("success");
      setNewsletterEmail("");
    } catch {
      setNewsletterStatus("error");
    }
  };

  const submitHeroSearch = () => {
    // Navega a las páginas SEO dedicadas (/especialidad/:slug[/:zonaSlug]) en vez del
    // filtro genérico /especialistas?..., que lleva noindex a propósito (Sprint 11).
    const specialtyObj = specialties.find((s) => s.name === heroSpecialty);
    if (specialtyObj) {
      if (heroZone) {
        navigate(`/especialidad/${specialtyObj.slug}/${slugify(heroZone)}`);
      } else {
        navigate(`/especialidad/${specialtyObj.slug}`);
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
      const [specs, specialists, blogPosts, zoneList, topReviews, allActive, insurerList] = await Promise.all([
      base44.entities.Specialty.filter({ active: true }),
      base44.entities.Specialist.filter({ featured: true, active: true }),
      base44.entities.BlogPost.filter({ published: true }, "-created_date", 100),
      base44.entities.Zone.filter({ active: true }),
      base44.entities.Review.filter({ approved: true }, "-rating", 3),
      base44.entities.Specialist.filter({ active: true }),
      base44.entities.Insurer.list('name', 50).catch(() => [])]
      );
      setSpecialties(specs);
      setFeatured(specialists);
      setPosts(blogPosts);
      setZones(zoneList);
      setTotalSpecialists(allActive.length);
      // "Particular/Sin seguro" siempre al final, no es una aseguradora real
      setInsurers([...insurerList].sort((a, b) => {
        if (a.name === "Particular/Sin seguro") return 1;
        if (b.name === "Particular/Sin seguro") return -1;
        return 0;
      }));

      if (topReviews.length >= 3) {
        const specialistIds = [...new Set(topReviews.map((r) => r.specialist_id).filter(Boolean))];
        const reviewedSpecialists = specialistIds.length ?
        await base44.entities.Specialist.filter({ id: { $in: specialistIds } }) :
        [];
        const specialtyById = Object.fromEntries(reviewedSpecialists.map((s) => [s.id, s.specialty]));
        setTestimonials(topReviews.map((r) => ({ ...r, specialistSpecialty: specialtyById[r.specialist_id] || "" })));
      }

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
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>);

  }

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-brand-navy overflow-hidden pb-24 sm:pb-28">
        {/* Decorative organic blobs (full-bleed, clipped to section) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-24 -right-16 w-[420px] h-[420px] bg-brand-blue/20"
            style={{ borderRadius: '58% 42% 65% 35% / 55% 45% 55% 45%' }}
          />
          <div
            className="absolute bottom-0 -left-24 w-[300px] h-[300px] bg-brand-blue/10"
            style={{ borderRadius: '42% 58% 35% 65% / 45% 55% 45% 55%' }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            {/* Left: título + iconos de confianza */}
            <div className="text-left">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-1.5 mb-5">
                <MapPin className="w-3.5 h-3.5 text-brand-bluePale" />
                <span className="text-xs font-medium text-white">Monterrey, Nuevo León</span>
              </div>
              <h1 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight mb-8">
                <span className="text-white block">
                  Encuentra a tu especialista
                </span>
                <span className="text-white block">
                  en <span className="border-b-4 border-brand-blue">Monterrey</span> y San Pedro
                </span>
              </h1>

              {/* Iconos de confianza, estilo referencia */}
              <div className="flex flex-wrap gap-x-8 gap-y-6">
                {TRUST_STRIP.map((item) => (
                  <div key={item.key} className="flex flex-col items-start gap-2 max-w-[160px]">
                    {item.key === "resenas" ? (
                      <div className="h-11 flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-full border border-white/30 flex items-center justify-center">
                        <item.icon className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <p className="text-xs sm:text-sm text-white/80 leading-snug">
                      {item.key === "perfiles" && totalSpecialists > 0
                        ? `Perfiles verificados de ${totalSpecialists} especialistas`
                        : item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: ilustración */}
            <div className="relative hidden md:flex justify-center items-center">
              <div
                className="absolute w-[360px] h-[400px] bg-gradient-to-br from-brand-blue/50 to-brand-bluePale/20"
                style={{ borderRadius: '62% 38% 55% 45% / 50% 60% 40% 50%' }}
              />
              <DoctorHeroIllustration className="relative z-10 w-64 h-72 lg:w-72 lg:h-80 drop-shadow-2xl" />
            </div>
          </div>
        </div>

        {/* Curva ondulada en el borde inferior del hero, en vez de un corte recto */}
        <div className="absolute bottom-0 left-0 w-full leading-none pointer-events-none">
          <svg viewBox="0 0 1440 100" preserveAspectRatio="none" className="w-full h-14 sm:h-20" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,40 C240,90 480,0 720,25 C960,50 1200,95 1440,35 L1440,100 L0,100 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* Tarjeta blanca de búsqueda, superpuesta al borde entre el hero y la siguiente sección */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 -mt-14 sm:-mt-16 mb-10 sm:mb-14">
          <div className="bg-white rounded-3xl shadow-2xl p-5 sm:p-8">
            <h2 className="font-heading font-bold text-lg sm:text-xl text-brand-navy mb-4">Encuentra la atención que necesitas</h2>
            <div className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-0 sm:border sm:border-border/60 sm:rounded-full overflow-hidden">
              <div className="flex flex-col justify-center px-4 py-2 sm:py-1.5 flex-1 min-w-0 border sm:border-0 border-border/60 rounded-full sm:rounded-none">
                <label className="text-[10px] font-semibold text-muted-foreground leading-none mb-0.5">Especialidad</label>
                <SearchableSelect
                  options={specialtyOptions}
                  value={heroSpecialty}
                  onChange={setHeroSpecialty}
                  placeholder="¿Qué especialidad buscas?"
                  searchPlaceholder="Buscar especialidad..."
                  icon={Stethoscope}
                  hint="Especialidad"
                  triggerClassName={triggerClass}
                />
              </div>
              <div className="hidden sm:block w-px bg-border" />
              <div className="flex flex-col justify-center px-4 py-2 sm:py-1.5 flex-1 min-w-0 border sm:border-0 border-border/60 rounded-full sm:rounded-none">
                <label className="text-[10px] font-semibold text-muted-foreground leading-none mb-0.5">Zona</label>
                <SearchableSelect
                  options={zoneOptions}
                  value={heroZone}
                  onChange={setHeroZone}
                  placeholder="Monterrey y San Pedro"
                  searchPlaceholder="Buscar zona..."
                  icon={MapPin}
                  hint="Zona"
                  triggerClassName={triggerClass}
                />
              </div>
              <button
                type="button"
                onClick={submitHeroSearch}
                className="flex items-center justify-center gap-2 bg-brand-blue hover:bg-brand-blue/90 text-white font-heading font-semibold text-sm px-6 py-3 rounded-full sm:rounded-none flex-shrink-0"
              >
                <Search className="w-4 h-4" />
                Buscar
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-2 mt-4 text-xs sm:text-sm">
              {sortByPopularity(specialties).slice(0, 5).map((s, i) => (
                <span key={s.id} className="flex items-center gap-2">
                  {i > 0 && <span className="text-border">|</span>}
                  <Link to={`/especialidad/${s.slug}`} className="text-brand-blue font-medium hover:underline">{s.name}</Link>
                </span>
              ))}
              <span className="text-border">|</span>
              <Link to="/especialistas" className="text-brand-blue font-medium hover:underline">+ Ver más</Link>
            </div>
          </div>
        </div>

      {/* Specialties: las 8 más buscadas */}
      <section>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-10">
          <div className="text-center mb-9">
            <p className="text-xs sm:text-sm font-semibold text-brand-blue uppercase tracking-widest mb-1.5">Especialidades</p>
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-brand-navy">Atención médica integral para cada necesidad</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 sm:gap-x-10 gap-y-8">
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

      {/* Aseguradoras en nuestro sistema */}
      {insurers.length > 0 && (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-6">
        <div className="text-center mb-6">
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">Aseguradoras en nuestro sistema</h2>
          <p className="text-sm text-muted-foreground mt-1">Cada médico indica en su perfil cuáles acepta — no todos aceptan todas.</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {insurers.map((ins) => (
            <div key={ins.id} className="flex items-center gap-2 bg-card border border-border/50 rounded-full px-4 py-2.5">
              {ins.logo_url && <img src={ins.logo_url} alt={ins.name} className="w-5 h-5 object-contain" />}
              <span className="text-sm font-medium text-foreground">{ins.name}</span>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* Featured: 6 doctores distribuidos en fila completa (próximamente slider hasta 12) */}
      <section style={{ background: 'linear-gradient(to bottom, white 0%, #EAF2FF 12%, #EAF2FF 88%, white 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-10">
          <div className="text-center mb-9">
            <p className="text-xs sm:text-sm font-semibold text-brand-blue uppercase tracking-widest mb-1.5">Nuestro equipo</p>
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-brand-navy">Especialistas destacados</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 sm:gap-x-6 gap-y-9 justify-items-center">
            {featured.slice(0, 6).map((s) =>
            <Link
              key={s.id}
              to={`/especialista/${s.slug}`}
              className="group flex flex-col items-center w-full max-w-[10rem]"
            >
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                {s.profile_photo ? (
                  <img src={s.profile_photo} alt={s.full_name} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full bg-brand-bluePale flex items-center justify-center">
                    <span className="font-heading font-bold text-2xl text-brand-blue/50">
                      {s.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </span>
                  </div>
                )}
              </div>
              <div className="pt-3 text-center">
                <h3 className="font-heading font-bold text-sm text-foreground leading-tight group-hover:text-brand-blue transition-colors">{s.full_name}</h3>
                <p className="text-brand-blue text-xs font-medium mt-1">{s.specialty}</p>
                {s.years_experience &&
                <p className="text-muted-foreground text-[11px] mt-1">{s.years_experience}+ años de experiencia</p>
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

      {/* Testimonios */}
      {testimonials.length >= 3 &&
      <section className="relative bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="text-center mb-8">
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-brand-navy">¿Qué dicen nuestros pacientes?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {testimonials.slice(0, 3).map((r) =>
            <div key={r.id} className="flex flex-col bg-white border border-border/60 rounded-2xl p-6 shadow-sm">
              <div className="flex gap-0.5 mb-3">
                {[1, 2, 3, 4, 5].map((s) =>
                <Star key={s} className={`w-4 h-4 ${r.rating >= s ? "fill-amber-400 text-amber-400" : "text-border"}`} />
                )}
              </div>
              <p className="text-sm text-foreground leading-relaxed flex-1">"{r.comment}"</p>
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="font-heading font-semibold text-sm text-brand-navy">{r.patient_name || "Paciente verificado"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {r.specialist_name}{r.specialistSpecialty ? ` — ${r.specialistSpecialty}` : ""}
                </p>
              </div>
            </div>
            )}
          </div>
        </div>
      </section>
      }

      {/* Cómo verificamos a nuestros médicos: rápido de leer, directo a la confianza */}
      <section>
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

      {/* Por qué BuscoUnDoctor: mensaje único y directo sobre precio */}
      <section className="bg-brand-blueLight/60">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-white border border-border/60 rounded-full px-4 py-1.5 mb-4">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-brand-navy uppercase tracking-wide">Precio garantizado</span>
          </div>
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-brand-navy">
            Sin sobreprecio por agendar aquí
          </h2>
          <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
            Pagas exactamente lo mismo que si agendaras directo con el médico. BuscoUnDoctor no le suma ni un peso a tu consulta.
          </p>
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
              <div className="bg-brand-navy px-3 sm:px-8 py-5 sm:py-6 flex items-center gap-2 sm:gap-2.5">
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-brand-blue flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="font-heading font-bold text-xs sm:text-base text-white leading-tight">
                  BuscoUnDoctor<span className="text-brand-bluePale">.com</span>
                </h3>
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

            {/* Filas de comparación, una junto a la otra */}
            <div className="rounded-b-3xl overflow-hidden">
              {COMPARISON_ROWS.map((row, i) => (
                <div key={i} className={`grid grid-cols-2 ${i % 2 === 1 ? "bg-brand-blueLight/40" : "bg-white"}`}>
                  <div className="flex items-start gap-1.5 sm:gap-2.5 px-3 sm:px-8 py-3 sm:py-3.5 border-r border-border/40">
                    <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span className="text-[11px] sm:text-sm text-foreground leading-snug">{row.us}</span>
                  </div>
                  <div className="flex items-start gap-1.5 sm:gap-2.5 px-3 sm:px-8 py-3 sm:py-3.5">
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground/60 flex-shrink-0 mt-0.5" />
                    <span className="text-[11px] sm:text-sm text-muted-foreground leading-snug">{row.them}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-10">
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

      {/* CTA: banner navy de ancho completo */}
      <section className="relative bg-brand-navy overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -bottom-16 -right-10 w-[280px] h-[280px] bg-brand-blue/20"
            style={{ borderRadius: '58% 42% 65% 35% / 55% 45% 55% 45%' }}
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid md:grid-cols-3 gap-8 items-center">
            <div className="md:col-span-2 text-center md:text-left">
              <h2 className="font-heading font-bold text-2xl sm:text-3xl text-white">
                Únete como especialista y llega a más pacientes
              </h2>
              <p className="text-white/80 mt-3 max-w-lg mx-auto md:mx-0">
                Crea tu perfil verificado en minutos, sin costo, y deja que los pacientes te contacten directamente por WhatsApp.
              </p>
              <Button size="lg" variant="secondary" className="mt-6 min-h-[44px] font-heading font-semibold bg-white text-brand-navy hover:bg-white/90" asChild>
                <Link to="/registro-medico">
                  Registrarme como especialista
                </Link>
              </Button>
            </div>
            <div className="hidden md:flex justify-center">
              <div className="w-28 h-28 rounded-full bg-brand-blue/20 flex items-center justify-center">
                <Stethoscope className="w-14 h-14 text-brand-bluePale" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Boletín de salud por correo */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-10">
        <div className="bg-card border border-border/50 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-brand-bluePale flex items-center justify-center flex-shrink-0">
            <Mail className="w-6 h-6 text-brand-blue" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-heading font-bold text-lg text-foreground">Recibe contenido de salud en tu correo</h3>
            <p className="text-sm text-muted-foreground mt-1">Artículos y consejos de nuestros especialistas, sin spam.</p>
          </div>
          <form onSubmit={submitNewsletter} className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="email"
              value={newsletterEmail}
              onChange={(e) => { setNewsletterEmail(e.target.value); setNewsletterStatus("idle"); }}
              placeholder="tu@correo.com"
              className="flex-1 sm:w-56 h-11 px-4 rounded-full border border-border/60 text-sm outline-none focus:border-brand-blue"
            />
            <button type="submit" disabled={newsletterStatus === "loading"} className="h-11 px-5 rounded-full bg-brand-blue hover:bg-brand-blue/90 text-white text-sm font-semibold flex items-center gap-1.5 flex-shrink-0">
              {newsletterStatus === "loading" && <Loader2 className="w-4 h-4 animate-spin" />}
              Suscribirme
            </button>
          </form>
        </div>
        {newsletterStatus === "success" && <p className="text-sm text-emerald-600 text-center sm:text-left mt-3">¡Listo! Ya estás suscrito.</p>}
        {newsletterStatus === "error" && <p className="text-sm text-red-500 text-center sm:text-left mt-3">Ingresa un correo válido para suscribirte.</p>}
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
