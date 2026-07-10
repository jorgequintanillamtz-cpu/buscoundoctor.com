import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MapPin, ArrowRight, Search, ShieldCheck, MessageCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchBar from "../components/SearchBar";
import SpecialtyCard from "../components/SpecialtyCard";
import SpecialistCard from "../components/SpecialistCard";
import BlogCard from "../components/BlogCard";
import ZoneCard from "../components/ZoneCard";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const HOME_FAQS = [
  { question: "¿Cuesta usar BuscoUnDoctor?", answer: "Es gratis para pacientes, no cobramos por buscar ni contactar médicos." },
  { question: "¿Cómo se verifica a los médicos?", answer: "Cada médico sube su cédula profesional, que un administrador revisa antes de publicar su perfil." },
  { question: "¿Cómo agendo una cita?", answer: "Contactas directamente al médico por WhatsApp o teléfono desde su perfil; nosotros no gestionamos la agenda." },
  { question: "¿BuscoUnDoctor da consejos médicos?", answer: "No, somos un directorio; toda consulta médica debe hacerse directamente con el especialista." },
  { question: "¿Puedo dejar una reseña de mi médico?", answer: "Sí, desde el perfil del médico después de haberlo consultado." },
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

export default function Home() {
  const [specialties, setSpecialties] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [posts, setPosts] = useState([]);
  const [zones, setZones] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [specs, specialists, blogPosts, zoneList, topReviews] = await Promise.all([
      base44.entities.Specialty.filter({ active: true }),
      base44.entities.Specialist.filter({ featured: true, active: true }),
      base44.entities.BlogPost.filter({ published: true }, "-created_date", 3),
      base44.entities.Zone.filter({ active: true }),
      base44.entities.Review.filter({ approved: true }, "-rating", 3)]
      );
      setSpecialties(specs);
      setFeatured(specialists);
      setPosts(blogPosts);
      setZones(zoneList);

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
      <section className="relative bg-brand-navy">
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

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-14 sm:pt-20 sm:pb-16">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            {/* Left: copy + search */}
            <div className="text-left">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-1.5 mb-5">
                <MapPin className="w-3.5 h-3.5 text-brand-bluePale" />
                <span className="text-xs font-medium text-white">Monterrey, Nuevo León</span>
              </div>
              <h1 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white leading-tight tracking-tight mb-4">
                <span>Encuentra los mejores doctores y especialistas de </span>
                <span className="text-brand-bluePale">Nuevo León</span>
              </h1>
              <p className="text-white/80 text-base sm:text-lg max-w-lg mb-6">
                Directorio médico verificado en Monterrey y San Pedro Garza García. Compara perfiles con cédula profesional verificada y contacta directo, sin intermediarios.
              </p>

              {/* Floating white search card */}
              <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-5">
                <SearchBar />
              </div>
            </div>

            {/* Right: doctor illustration over organic blob */}
            <div className="relative hidden md:flex justify-end items-center">
              <div
                className="absolute w-[360px] h-[400px] bg-gradient-to-br from-brand-blue/50 to-brand-bluePale/20"
                style={{ borderRadius: '62% 38% 55% 45% / 50% 60% 40% 50%' }}
              />
              <DoctorHeroIllustration className="relative z-10 w-64 h-72 lg:w-72 lg:h-80 drop-shadow-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Trust badges: sibling block pulled up with a negative top margin so it overlaps the hero's bottom edge */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 -mt-8 sm:-mt-10 mb-6 sm:mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          <div className="flex items-center gap-3 bg-white rounded-2xl shadow-lg border border-border/50 px-4 py-3.5">
            <div className="w-11 h-11 rounded-full bg-brand-bluePale flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-brand-blue" />
            </div>
            <span className="text-sm font-semibold text-brand-navy leading-snug">Cédula Profesional Verificada</span>
          </div>
          <div className="flex items-center gap-3 bg-white rounded-2xl shadow-lg border border-border/50 px-4 py-3.5">
            <div className="w-11 h-11 rounded-full bg-brand-bluePale flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-brand-blue" />
            </div>
            <span className="text-sm font-semibold text-brand-navy leading-snug">Contacto Directo sin Intermediarios</span>
          </div>
        </div>
      </div>

      {/* Specialties */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4" style={{ background: '#ffffff' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">Especialidades</h2>
          <Link to="/especialistas" className="text-sm font-medium text-primary flex items-center gap-1 hover:gap-2 transition-all">
            <span>Ver todas</span> <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {/* Mobile: horizontal scroll circles */}
        <div className="flex gap-4 overflow-x-auto pb-2 sm:hidden" style={{ scrollbarWidth: 'none' }}>
          {specialties.slice(0, 6).map((s) =>
          <SpecialtyCard key={s.id} specialty={s} mobile />
          )}
        </div>
        {/* Desktop: 3-col grid */}
        <div className="hidden sm:grid grid-cols-3 gap-3">
          {specialties.slice(0, 6).map((s) =>
          <SpecialtyCard key={s.id} specialty={s} />
          )}
        </div>
      </section>

      {/* Zonas destacadas */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4">
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

      {/* Featured */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">Especialistas destacados</h2>
          <Link to="/especialistas" className="text-sm font-medium text-primary flex items-center gap-1 hover:gap-2 transition-all">
            <span>Ver todos</span> <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {featured.map((s, i) =>
          <SpecialistCard key={s.id} specialist={s} priority={i === 0} />
          )}
        </div>
      </section>

      {/* Blog */}
      {posts.length > 0 &&
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">Blog de salud</h2>
            <Link to="/blog" className="text-sm font-medium text-primary flex items-center gap-1 hover:gap-2 transition-all">
              <span>Ver todos</span> <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {posts.map((p, i) =>
          <BlogCard key={p.id} post={p} priority={i === 0} />
          )}
          </div>
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-6">
        <div className="text-center mb-8">
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">¿Cómo funciona?</h2>
          <p className="text-sm text-muted-foreground mt-1">Encuentra y contacta a tu especialista en 3 pasos</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-secondary border border-border/50 flex items-center justify-center mb-3">
              <Search className="w-6 h-6 text-primary" />
            </div>
            <span className="font-heading font-bold text-sm text-primary mb-1">Paso 1</span>
            <h3 className="font-heading font-semibold text-sm text-foreground">Busca tu especialista</h3>
            <p className="text-xs text-muted-foreground mt-1">Filtra por especialidad o zona en Monterrey.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-secondary border border-border/50 flex items-center justify-center mb-3">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <span className="font-heading font-bold text-sm text-primary mb-1">Paso 2</span>
            <h3 className="font-heading font-semibold text-sm text-foreground">Compara perfiles verificados</h3>
            <p className="text-xs text-muted-foreground mt-1">Revisa cédula profesional, reseñas y ubicación.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-secondary border border-border/50 flex items-center justify-center mb-3">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <span className="font-heading font-bold text-sm text-primary mb-1">Paso 3</span>
            <h3 className="font-heading font-semibold text-sm text-foreground">Contacta y agenda</h3>
            <p className="text-xs text-muted-foreground mt-1">Escríbele por WhatsApp o agenda tu cita directo.</p>
          </div>
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-10">
        <div className="text-center mb-8">
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">Preguntas frecuentes</h2>
        </div>
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="bg-card rounded-2xl border border-border/50 divide-y divide-border/50">
            {HOME_FAQS.map((f, i) =>
            <AccordionItem key={i} value={`home-faq-${i}`} className="px-5">
              <AccordionTrigger className="text-left font-heading font-semibold text-sm sm:text-base text-foreground hover:no-underline">{f.question}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{f.answer}</AccordionContent>
            </AccordionItem>
            )}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-10">
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-8 sm:p-12 text-center">
          <h2 className="font-heading font-bold text-2xl sm:text-3xl text-primary-foreground">
            <span>¿Eres profesional de la salud?</span>
          </h2>
          <p className="text-primary-foreground/80 mt-3 max-w-md mx-auto">
            <span>Únete a nuestra plataforma y conecta con nuevos pacientes en Monterrey</span>
          </p>
          <Button size="lg" variant="secondary" className="mt-6 min-h-[44px] font-heading font-semibold" asChild>
            <Link to="/registro-medico">
              <span>Registrarme como especialista</span>
            </Link>
          </Button>
        </div>
      </section>
    </div>);

}