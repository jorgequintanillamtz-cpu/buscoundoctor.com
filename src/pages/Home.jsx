import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MapPin, ArrowRight, Search, ShieldCheck, MessageCircle, Star, Users, Sparkles, Stethoscope, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import SpecialtyCard from "../components/SpecialtyCard";
import SpecialistCard from "../components/SpecialistCard";
import BlogCard from "../components/BlogCard";
import ZoneCard from "../components/ZoneCard";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

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

const triggerClass =
  "border-0 shadow-none h-auto p-0 gap-1 focus:ring-0 focus:ring-offset-0 text-sm font-medium text-foreground bg-transparent [&>span]:line-clamp-1";
const contentClass = "rounded-2xl border-none shadow-xl p-2 bg-white";
const itemClass =
  "rounded-xl px-3 py-2 text-sm cursor-pointer focus:bg-brand-bluePale focus:text-brand-navy data-[state=checked]:bg-brand-bluePale data-[state=checked]:text-brand-navy";

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
  const blogScrollRef = useRef(null);

  const submitHeroSearch = () => {
    const params = new URLSearchParams();
    if (heroSpecialty) params.set("specialty", heroSpecialty);
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
      const [specs, specialists, blogPosts, zoneList, topReviews, allActive] = await Promise.all([
      base44.entities.Specialty.filter({ active: true }),
      base44.entities.Specialist.filter({ featured: true, active: true }),
      base44.entities.BlogPost.filter({ published: true }, "-created_date", 100),
      base44.entities.Zone.filter({ active: true }),
      base44.entities.Review.filter({ approved: true }, "-rating", 3),
      base44.entities.Specialist.filter({ active: true })]
      );
      setSpecialties(specs);
      setFeatured(specialists);
      setPosts(blogPosts);
      setZones(zoneList);
      setTotalSpecialists(allActive.length);

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
      <section className="relative bg-brand-navy overflow-hidden">
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

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-20 sm:pt-20 sm:pb-28">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            {/* Left: copy + search */}
            <div className="text-left">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-1.5 mb-5">
                <MapPin className="w-3.5 h-3.5 text-brand-bluePale" />
                <span className="text-xs font-medium text-white">Monterrey, Nuevo León</span>
              </div>
              <h1 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight mb-4">
                <span className="text-white block">Encuentra al doctor</span>
                <span className="text-brand-bluePale block">ideal para ti</span>
              </h1>
              <p className="text-white/80 text-base sm:text-lg max-w-lg mb-6">
                Directorio médico verificado en Monterrey y San Pedro Garza García. Compara perfiles con cédula profesional verificada y contacta directo, sin intermediarios.
              </p>

              {/* Iconos de confianza en línea */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6">
                <span className="flex items-center gap-1.5 text-xs sm:text-sm text-white/90">
                  <ShieldCheck className="w-4 h-4 text-brand-bluePale" /> Cédula profesional verificada
                </span>
                <span className="flex items-center gap-1.5 text-xs sm:text-sm text-white/90">
                  <MessageCircle className="w-4 h-4 text-brand-bluePale" /> Contacto directo sin intermediarios
                </span>
                <span className="flex items-center gap-1.5 text-xs sm:text-sm text-white/90">
                  <Sparkles className="w-4 h-4 text-brand-bluePale" /> Búsqueda 100% gratuita
                </span>
              </div>

              {/* Floating white search card */}
              <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-5 mb-6">
                <SearchBar />
              </div>

              {/* Botones */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Button size="lg" className="min-h-[44px] font-heading font-semibold bg-brand-blue hover:bg-brand-blue/90 text-white" asChild>
                  <Link to="/especialistas">
                    Buscar especialista <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="min-h-[44px] font-heading font-semibold bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white" asChild>
                  <Link to="/registro-medico">
                    Soy médico, quiero unirme
                  </Link>
                </Button>
              </div>

              {/* Prueba social */}
              <div className="flex items-center gap-3">
                <div className="flex -space-x-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-9 h-9 rounded-full bg-brand-blue/40 border-2 border-brand-navy flex items-center justify-center">
                      <Users className="w-4 h-4 text-white/80" />
                    </div>
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-white/80">
                  {totalSpecialists > 0
                    ? <>Más de <span className="font-semibold text-white">{totalSpecialists} especialistas</span> ya forman parte de BuscoUnDoctor</>
                    : "Especialistas verificados en Monterrey y San Pedro"}
                </p>
              </div>
            </div>

            {/* Right: doctor illustration + tarjetas flotantes */}
            <div className="relative hidden md:flex justify-center items-center">
              <div
                className="absolute w-[360px] h-[400px] bg-gradient-to-br from-brand-blue/50 to-brand-bluePale/20"
                style={{ borderRadius: '62% 38% 55% 45% / 50% 60% 40% 50%' }}
              />
              <DoctorHeroIllustration className="relative z-10 w-64 h-72 lg:w-72 lg:h-80 drop-shadow-2xl" />

              {/* Tarjetas flotantes superpuestas */}
              <div className="absolute -left-4 top-6 z-20 bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-brand-blue flex-shrink-0" />
                <span className="text-xs font-semibold text-brand-navy">Cédula verificada</span>
              </div>
              <div className="absolute right-0 top-1/3 z-20 bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-2.5">
                <Users className="w-5 h-5 text-brand-blue flex-shrink-0" />
                <span className="text-xs font-semibold text-brand-navy">
                  {totalSpecialists > 0 ? `+${totalSpecialists} especialistas` : "Directorio en crecimiento"}
                </span>
              </div>
              <div className="absolute left-2 bottom-4 z-20 bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-2.5">
                <MessageCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-xs font-semibold text-brand-navy">Contacto directo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tira de confianza (4 tarjetas) */}
      <section className="relative z-10 -mt-10 sm:-mt-14 mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-3xl shadow-xl border border-border/50 grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border/50">
            {TRUST_STRIP.map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-2 px-4 py-5">
                <div className="w-11 h-11 rounded-full bg-brand-bluePale flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-brand-blue" />
                </div>
                <div>
                  <p className="text-sm font-heading font-semibold text-brand-navy leading-tight">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specialties: estilo "Shop by Category" */}
      <section className="bg-brand-blueLight/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-brand-navy">Especialidades</h2>
            <Link to="/especialistas" className="text-sm font-medium text-brand-blue flex items-center gap-1 hover:gap-2 transition-all">
              <span>Ver todas</span> <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {specialties.slice(0, 7).map((s) =>
            <div key={s.id} className="flex-shrink-0 w-24 sm:w-28">
              <SpecialtyCard specialty={s} mobile />
            </div>
            )}
          </div>
        </div>
      </section>

      {/* Zonas destacadas */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">Zonas destacadas</h2>
          <Link to="/especialistas" className="text-sm font-medium text-primary flex items-center gap-1 hover:gap-2 transition-all">
            <span>Ver todas</span> <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {zones.slice(0, 6).map((z) =>
          <ZoneCard key={z.id} zone={z} />
          )}
        </div>
      </section>

      {/* Featured: carrusel horizontal */}
      <section className="bg-brand-blueLight/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-brand-navy">Especialistas destacados</h2>
            <Link to="/especialistas" className="text-sm font-medium text-brand-blue flex items-center gap-1 hover:gap-2 transition-all">
              <span>Ver todos</span> <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible" style={{ scrollbarWidth: 'none' }}>
            {featured.map((s, i) =>
            <div key={s.id} className="flex-shrink-0 w-[85vw] sm:w-auto">
              <SpecialistCard specialist={s} priority={i === 0} />
            </div>
            )}
          </div>
        </div>
      </section>

      {/* Blog: slider deslizable con todos los artículos */}
      {posts.length > 0 &&
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">Blog de salud</h2>
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
        </section>
      }

      {/* Testimonios */}
      {testimonials.length >= 3 &&
      <section className="relative bg-brand-navy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="text-center mb-8">
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-white">Lo que dicen nuestros pacientes</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {testimonials.slice(0, 3).map((r) =>
            <div key={r.id} className="flex flex-col bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex gap-0.5 mb-3">
                {[1, 2, 3, 4, 5].map((s) =>
                <Star key={s} className={`w-4 h-4 ${r.rating >= s ? "fill-brand-blue text-brand-blue" : "text-border"}`} />
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

      {/* Cómo funciona */}
      <section className="bg-brand-blueLight/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-10">
          <div className="text-center mb-8">
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-brand-navy">¿Cómo funciona?</h2>
            <p className="text-sm text-muted-foreground mt-1">Encuentra y contacta a tu especialista en 3 pasos</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-white shadow-sm border border-border/50 flex items-center justify-center mb-3">
                <Search className="w-6 h-6 text-brand-blue" />
              </div>
              <span className="font-heading font-bold text-sm text-brand-blue mb-1">Paso 1</span>
              <h3 className="font-heading font-semibold text-sm text-brand-navy">Busca tu especialista</h3>
              <p className="text-xs text-muted-foreground mt-1">Filtra por especialidad o zona en Monterrey.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-white shadow-sm border border-border/50 flex items-center justify-center mb-3">
                <ShieldCheck className="w-6 h-6 text-brand-blue" />
              </div>
              <span className="font-heading font-bold text-sm text-brand-blue mb-1">Paso 2</span>
              <h3 className="font-heading font-semibold text-sm text-brand-navy">Compara perfiles verificados</h3>
              <p className="text-xs text-muted-foreground mt-1">Revisa cédula profesional, reseñas y ubicación.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-white shadow-sm border border-border/50 flex items-center justify-center mb-3">
                <MessageCircle className="w-6 h-6 text-brand-blue" />
              </div>
              <span className="font-heading font-bold text-sm text-brand-blue mb-1">Paso 3</span>
              <h3 className="font-heading font-semibold text-sm text-brand-navy">Contacta y agenda</h3>
              <p className="text-xs text-muted-foreground mt-1">Escríbele por WhatsApp o agenda tu cita directo.</p>
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
    </div>);

}
