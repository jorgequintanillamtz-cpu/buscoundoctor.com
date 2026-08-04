import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Check, X, ShieldCheck, Users, Clock, Search, MessageCircle,
  Star, TrendingUp, Award, Sparkles, Plus,
  ArrowRight, MapPin, BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import Logo from "@/components/Logo";

const CTA_URL = "/registro-medico";
// Misma clave que lee RegistroMedico.jsx al montar: si existe, precarga el
// paso 1 (datos) y salta directo al paso 2, para que el médico no tenga que
// volver a escribir lo que ya lleno aquí en la landing.
const LANDING_PREFILL_KEY = "buscoundoctor_landing_prefill";
const ORIGIN = "https://buscoundoctor.com";
const PAGE_URL = `${ORIGIN}/para-medicos`;

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}
function setOgMeta(property, content) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("property", property); document.head.appendChild(el); }
  el.setAttribute("content", content);
}
function setCanonicalLink(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) { el = document.createElement("link"); el.setAttribute("rel", "canonical"); document.head.appendChild(el); }
  el.setAttribute("href", href);
}
function addJsonLd(id, data) {
  const el = document.createElement("script");
  el.type = "application/ld+json";
  el.id = id;
  el.text = JSON.stringify(data);
  document.head.appendChild(el);
  return el;
}

const HERO_IMAGE = "https://media.base44.com/images/public/69daf616236dcba44672309d/cc72aad07_generated_image.png";
// Foto de ejemplo (banco de imágenes, licencia Unsplash) solo para ilustrar
// cómo se ve un perfil; el perfil completo es ficticio.
const EXAMPLE_DOCTOR_PHOTO = "https://images.unsplash.com/photo-1642975967602-653d378f3b5b?w=200&h=200&fit=crop&crop=faces&auto=format&q=80";

// Beneficios como lista dividida (sin tarjetas/cuadros).
const BENEFITS = [
  { icon: TrendingUp, color: "blue", title: "Más pacientes nuevos, cada mes", desc: "Apareces justo cuando alguien en tu ciudad busca un especialista como tú, todos los días." },
  { icon: ShieldCheck, color: "emerald", title: "Más confianza", desc: "La cédula verificada dice que eres quien dices ser." },
  { icon: Star, color: "amber", title: "Mejor reputación", desc: "Las opiniones de tus pacientes trabajan por ti." },
  { icon: Search, color: "violet", title: "Optimizado para Google", desc: "Sin que tú hagas nada de SEO." },
  { icon: MessageCircle, color: "cyan", title: "Contacto directo", desc: "Te escriben por WhatsApp, sin intermediarios." },
  { icon: Users, color: "rose", title: "Hecho para especialistas", desc: "Pensado para médicos, no es un directorio genérico." },
];
const COLOR_MAP = {
  blue: "bg-brand-bluePale text-brand-blue",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
  cyan: "bg-cyan-50 text-cyan-600",
  rose: "bg-rose-50 text-rose-600",
};

const TESTIMONIALS = [
  { name: "Dra. Ejemplo Ramírez", specialty: "Dermatóloga", city: "Monterrey", quote: "Recibo mensajes de pacientes que ya saben qué necesitan y llegan listos para agendar." },
  { name: "Dr. Ejemplo Torres", specialty: "Cardiólogo", city: "San Pedro", quote: "Completé mi perfil en diez minutos. No he vuelto a pagar por publicidad." },
  { name: "Dra. Ejemplo Salas", specialty: "Pediatra", city: "Monterrey", quote: "Los pacientes llegan ya conociendo mi experiencia y las opiniones de otros papás." },
];

const FAQS = [
  { q: "¿Tiene costo crear mi perfil?", a: "Crear tu perfil básico no tiene costo: quedas en el directorio, con tu especialidad, zona y contacto por WhatsApp. Si más adelante quieres funciones adicionales (perfil destacado, galería, estadísticas), existe un plan Premium opcional — tú decides si lo usas." },
  { q: "¿Cuánto tarda el registro?", a: "Entre 3 y 5 minutos. Tu perfil queda visible de inmediato; puedes seguir completando fotos y horarios después." },
  { q: "¿Cómo verifican mi cédula profesional?", a: "Revisamos manualmente tu número de cédula contra los registros oficiales antes de marcar tu perfil como verificado." },
  { q: "¿Qué especialidades aceptan?", a: "Prácticamente todas: cardiología, ginecología, dermatología, pediatría, ortopedia, psiquiatría y más." },
  { q: "¿Necesito tener página web propia?", a: "No. Tu perfil en BuscoUnDoctor es tu presencia digital, sin hosting ni conocimientos técnicos." },
  { q: "¿Voy a aparecer en Google?", a: "Sí, cada perfil está optimizado para aparecer cuando alguien busca tu especialidad en tu ciudad." },
  { q: "¿Puedo cancelar cuando quiera?", a: "Sí, sin preguntas ni penalizaciones, desde tu panel en cualquier momento." },
];

function CtaButton({ children = "Registrar mi perfil gratis", size = "lg", className = "" }) {
  return (
    <Button
      asChild
      size={size}
      className={`rounded-xl font-semibold gap-2 bg-brand-blue hover:bg-brand-blue/90 text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all ${className}`}
    >
      <Link to={CTA_URL} aria-label="Registrar mi perfil médico gratis en BuscoUnDoctor">
        {children}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </Button>
  );
}

export default function LandingMedicos() {
  const navigate = useNavigate();
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const heroRef = useRef(null);

  // --- Paso 1 del registro, embebido justo debajo del hero ---
  const [specialties, setSpecialties] = useState([]);
  const [step1, setStep1] = useState({
    title: "", full_name: "", whatsapp: "", specialty: "", subspecialty: "",
  });
  const [step1Error, setStep1Error] = useState("");

  useEffect(() => {
    base44.entities.Specialty.filter({ active: true }).then((specs) => {
      setSpecialties([...specs].sort((a, b) => a.name.localeCompare(b.name, "es")));
    }).catch(() => {});
  }, []);

  const updateStep1 = (field, value) => setStep1((prev) => ({ ...prev, [field]: value }));

  const validateStep1 = () => {
    if (!step1.title) return "Selecciona Dr. o Dra.";
    if (!step1.full_name.trim()) return "Escribe tu nombre completo";
    if (step1.whatsapp.replace(/\D/g, "").length < 10) return "Ingresa un número de WhatsApp válido (10 dígitos)";
    if (!step1.specialty.trim()) return "Selecciona o escribe tu especialidad";
    return "";
  };

  const handleContinueStep1 = () => {
    const err = validateStep1();
    if (err) { setStep1Error(err); return; }
    setStep1Error("");
    localStorage.setItem(LANDING_PREFILL_KEY, JSON.stringify(step1));
    navigate("/registro-medico");
  };

  // --- SEO: título, descripción, canonical, Open Graph, Twitter Card ---
  useEffect(() => {
    const title = "Registro para Médicos Especialistas | Directorio Médico BuscoUnDoctor";
    const description = "Regístrate en el directorio médico de México. Crea tu perfil profesional médico, gana visibilidad en Google y consigue pacientes nuevos por especialidad y zona.";

    document.title = title;
    setMeta("description", description);
    setMeta("robots", "index, follow");
    setCanonicalLink(PAGE_URL);

    setOgMeta("og:type", "website");
    setOgMeta("og:site_name", "BuscoUnDoctor");
    setOgMeta("og:title", title);
    setOgMeta("og:description", description);
    setOgMeta("og:image", HERO_IMAGE);
    setOgMeta("og:url", PAGE_URL);
    setOgMeta("og:locale", "es_MX");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setMeta("twitter:image", HERO_IMAGE);
  }, []);

  // --- SEO: JSON-LD (Organization, WebPage, Breadcrumb, FAQPage) ---
  useEffect(() => {
    const scripts = [];
    scripts.push(addJsonLd("ld-organization", {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "BuscoUnDoctor",
      "url": ORIGIN,
      "logo": HERO_IMAGE,
      "description": "Directorio médico verificado en México que conecta pacientes con médicos especialistas.",
    }));
    scripts.push(addJsonLd("ld-webpage", {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Registro para médicos especialistas | BuscoUnDoctor",
      "description": "Página de registro para médicos especialistas en el directorio médico BuscoUnDoctor.",
      "url": PAGE_URL,
      "isPartOf": { "@type": "WebSite", "name": "BuscoUnDoctor", "url": ORIGIN },
    }));
    scripts.push(addJsonLd("ld-breadcrumb", {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Inicio", "item": ORIGIN },
        { "@type": "ListItem", "position": 2, "name": "Para médicos", "item": PAGE_URL },
      ],
    }));
    scripts.push(addJsonLd("ld-faq", {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": FAQS.map((f) => ({
        "@type": "Question",
        "name": f.q,
        "acceptedAnswer": { "@type": "Answer", "text": f.a },
      })),
    }));
    return () => scripts.forEach((s) => s.remove());
  }, []);

  // --- Sticky CTA móvil: aparece después de pasar el hero ---
  useEffect(() => {
    const onScroll = () => {
      const heroBottom = heroRef.current?.getBoundingClientRect().bottom ?? 0;
      setShowStickyCta(heroBottom < 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header mínimo: solo logo + un único CTA. */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo to="/" className="h-9" />
          <CtaButton size="sm">Registrar mi perfil</CtaButton>
        </div>
      </header>

      <main>
        {/* ============ HERO ============ */}
        <section ref={heroRef} aria-labelledby="hero-heading" className="relative overflow-hidden">
          {/* Fondo con desvanecido, mismo tratamiento que el hero de la página principal */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute -top-24 -right-16 w-[420px] h-[420px] bg-brand-blue/10"
              style={{ borderRadius: '58% 42% 65% 35% / 55% 45% 55% 45%' }}
            />
            <div
              className="absolute bottom-0 -left-24 w-[300px] h-[300px] bg-brand-bluePale/40"
              style={{ borderRadius: '42% 58% 35% 65% / 45% 55% 45% 55%' }}
            />
          </div>
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block text-xs font-bold tracking-wide uppercase text-brand-blue bg-brand-bluePale px-3 py-1.5 rounded-full mb-5">
                Directorio médico de México
              </span>
              <h1 id="hero-heading" className="font-heading font-extrabold text-4xl sm:text-5xl leading-[1.1] text-foreground tracking-tight">
                Que los pacientes que buscan tu especialidad, te encuentren primero a ti
              </h1>
              <p className="text-lg text-muted-foreground mt-5 leading-relaxed">
                Crea tu perfil en el directorio médico de México y aparece en Google cuando alguien busque un especialista como tú. Empieza gratis, en menos de 5 minutos.
              </p>

              <ul className="mt-7 space-y-3">
                {[
                  "Perfil optimizado para Google",
                  "Contacto directo por WhatsApp",
                  "Cédula profesional verificada",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm sm:text-base text-foreground font-medium">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-emerald-600" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <CtaButton className="w-full sm:w-auto h-14 px-8 text-base">Registrar mi perfil gratis</CtaButton>
                <p className="text-xs text-muted-foreground mt-3">
                  Empieza gratis · Sin tarjeta de crédito · Actívalo en 5 minutos
                </p>
              </div>
            </div>

            {/* Mockup de producto: perfil de ejemplo, mejor presentado */}
            <div className="relative">
              <span className="absolute -top-3 -left-3 z-10 bg-foreground text-background text-[10px] font-bold tracking-wide uppercase px-3 py-1 rounded-full shadow">
                Ejemplo de perfil
              </span>
              <div className="bg-card border border-border/50 rounded-3xl shadow-2xl p-6 max-w-sm mx-auto" aria-hidden="true">
                <div className="flex items-center gap-3 pb-4 border-b border-border/50">
                  <div className="relative flex-shrink-0">
                    <img
                      src={EXAMPLE_DOCTOR_PHOTO}
                      alt=""
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-white shadow"
                    />
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center">
                      <BadgeCheck className="w-3.5 h-3.5 text-white" />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-heading font-bold text-foreground truncate">Dr. Alejandro Mendoza</p>
                    <p className="text-sm text-muted-foreground truncate">Cardiólogo · Monterrey, N.L.</p>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-amber-400" fill="currentColor" />)}
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    12 años de experiencia
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                  <MapPin className="w-4 h-4 flex-shrink-0" /> San Pedro Garza García
                </div>
                <div className="flex items-center gap-2 text-sm font-medium py-1">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                  <span className="text-emerald-700">Cédula profesional verificada</span>
                </div>
                <Button className="w-full rounded-xl mt-4 bg-emerald-600 hover:bg-emerald-600/90 gap-2" tabIndex={-1}>
                  <MessageCircle className="w-4 h-4" /> Contactar por WhatsApp
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-3">Así se ve un perfil en BuscoUnDoctor</p>
            </div>
          </div>
          </div>
        </section>

        {/* ============ PASO 1 DEL REGISTRO, EMBEBIDO JUSTO DEBAJO DEL HERO ============ */}
        <section aria-labelledby="paso1-heading" className="max-w-2xl mx-auto px-4 sm:px-6 pb-14 sm:pb-18">
          <div className="text-center mb-6">
            <span className="inline-block text-xs font-bold tracking-wide uppercase text-brand-blue bg-brand-bluePale px-3 py-1.5 rounded-full mb-3">
              Paso 1 de 4
            </span>
            <h2 id="paso1-heading" className="font-heading font-bold text-2xl sm:text-3xl text-foreground">
              Empieza tu registro ahora mismo
            </h2>
            <p className="text-muted-foreground mt-2">Cuéntanos lo básico. Toma 20 segundos.</p>
          </div>

          <div className="bg-card border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nombre completo</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button type="button" onClick={() => updateStep1("title", "Dr.")}
                    className={`h-10 rounded-xl border text-sm font-semibold transition-colors ${step1.title === "Dr." ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-accent"}`}>
                    Dr.
                  </button>
                  <button type="button" onClick={() => updateStep1("title", "Dra.")}
                    className={`h-10 rounded-xl border text-sm font-semibold transition-colors ${step1.title === "Dra." ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-accent"}`}>
                    Dra.
                  </button>
                </div>
                <Input value={step1.full_name} onChange={(e) => updateStep1("full_name", e.target.value)} placeholder="Nombre completo" className="rounded-xl" />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">WhatsApp</label>
                <Input value={step1.whatsapp} onChange={(e) => updateStep1("whatsapp", e.target.value)} placeholder="Ej: 8181234567" type="tel" className="rounded-xl" />
                <p className="text-xs text-muted-foreground mt-1">Aquí te contactarán tus pacientes directamente</p>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Especialidad</label>
                <select
                  value={specialties.some((s) => s.name === step1.specialty) ? step1.specialty : (step1.specialty ? "__otra__" : "")}
                  onChange={(e) => updateStep1("specialty", e.target.value === "__otra__" ? " " : e.target.value)}
                  className="w-full h-11 px-3 text-sm bg-background border border-input rounded-xl mb-2">
                  <option value="">Selecciona tu especialidad</option>
                  {specialties.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  <option value="__otra__">Otra (no está en la lista)</option>
                </select>
                {(step1.specialty === " " || (!specialties.some((s) => s.name === step1.specialty) && step1.specialty)) && (
                  <Input value={step1.specialty.trim()} onChange={(e) => updateStep1("specialty", e.target.value)} placeholder="Escribe tu especialidad" className="rounded-xl" />
                )}
              </div>
            </div>

            {step1Error && <p className="text-sm text-red-500 text-center mt-5">{step1Error}</p>}

            <Button type="button" onClick={handleContinueStep1} className="w-full min-h-[48px] rounded-xl gap-1.5 mt-6 bg-brand-blue hover:bg-brand-blue/90 text-white">
              Siguiente <ArrowRight className="w-4 h-4" />
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3">Sigues llenando el resto (cédula, precio, dirección...) en la siguiente pantalla.</p>
          </div>
        </section>

        {/* ============ TESTIMONIOS (placeholder) ============ */}
        <section aria-labelledby="testimonios-heading" className="bg-muted/40 py-14 sm:py-18">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 id="testimonios-heading" className="font-heading font-bold text-2xl sm:text-3xl text-foreground text-center mb-2">
              Lo que dicen los médicos registrados
            </h2>
            <p className="text-center text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 max-w-md mx-auto mb-8">
              Ejemplos ilustrativos — reemplázalos por testimonios reales.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {TESTIMONIALS.map((t) => (
                <div key={t.name} className="relative bg-card border border-border/50 rounded-2xl p-5">
                  <span className="absolute top-3 right-3 text-[10px] font-bold tracking-wide uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    Ejemplo
                  </span>
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 text-amber-400" fill="currentColor" />)}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">"{t.quote}"</p>
                  <p className="text-sm font-semibold text-foreground mt-3">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.specialty} · {t.city}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ FAQ (mismo diseño que el home) ============ */}
        <section aria-labelledby="faq-heading" className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-18">
          <div className="relative bg-brand-navy rounded-3xl overflow-hidden p-6 sm:p-10 lg:p-14">
            <div className="absolute -top-10 -right-10 w-56 h-56 bg-brand-blue/10 rounded-full pointer-events-none" />
            <div className="relative grid md:grid-cols-2 gap-10 lg:gap-16">
              <div>
                <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 text-white text-xs font-medium px-3 py-1.5 rounded-full mb-5">
                  <Sparkles className="w-3 h-3 text-brand-bluePale" />
                  Tus preguntas, respondidas
                </span>
                <h2 id="faq-heading" className="font-heading font-extrabold text-3xl sm:text-4xl leading-tight">
                  <span className="text-white block">Preguntas</span>
                  <span className="text-brand-bluePale block">Frecuentes</span>
                </h2>
                <p className="text-white/70 mt-4 leading-relaxed">
                  Esto es lo que más preguntan los médicos antes de crear su perfil.
                </p>

                <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="font-heading font-bold text-lg text-white">¿List@ para empezar?</h3>
                  <p className="text-sm text-white/70 mt-2 leading-relaxed">
                    Crea tu perfil ahora y aparece en el directorio en minutos.
                  </p>
                  <CtaButton className="mt-4">Registrar mi perfil</CtaButton>
                </div>
              </div>

              <div className="space-y-3">
                {FAQS.map((f, i) => (
                  <details
                    key={i}
                    open={openFaq === i}
                    onToggle={(e) => setOpenFaq(e.target.open ? i : null)}
                    className="group bg-white/5 border border-white/10 rounded-2xl px-5 py-4 open:bg-white/10 transition-colors"
                  >
                    <summary className="flex items-center justify-between gap-3 cursor-pointer list-none font-heading font-semibold text-sm sm:text-base text-white">
                      {f.q}
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-blue/20 flex items-center justify-center text-brand-bluePale group-open:rotate-45 transition-transform">
                        <Plus className="w-3.5 h-3.5" />
                      </span>
                    </summary>
                    <p className="text-sm text-white/70 leading-relaxed mt-3">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============ CTA FINAL ============ */}
        <section aria-labelledby="cta-final-heading" className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <Award className="w-9 h-9 text-brand-blue mx-auto mb-4" />
          <h2 id="cta-final-heading" className="font-heading font-extrabold text-3xl sm:text-4xl text-foreground tracking-tight">
            Tu próximo paciente ya te está buscando en Google
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Crear tu perfil toma menos de 5 minutos.
          </p>
          <div className="mt-8">
            <CtaButton className="h-14 px-10 text-base">Registrar mi perfil gratis</CtaButton>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Empieza gratis · Sin tarjeta de crédito · Actívalo en minutos
          </p>
        </section>
      </main>

      {/* Footer mínimo */}
      <footer className="border-t border-border/50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <Logo to="/" className="h-8" />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} BuscoUnDoctor · Directorio médico en Monterrey y San Pedro Garza García
          </p>
        </div>
      </footer>

      {/* Sticky CTA móvil */}
      {showStickyCta && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border/50 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <CtaButton className="w-full h-12">Registrar mi perfil gratis</CtaButton>
        </div>
      )}
    </div>
  );
}
