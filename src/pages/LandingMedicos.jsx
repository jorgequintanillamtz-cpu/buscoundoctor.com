import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Check, X, ShieldCheck, Users, Clock, Gift, Search, MessageCircle,
  Star, UserPlus, FileText, Rocket, TrendingUp, Award,
  ArrowRight, MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";

const CTA_URL = "/registro-medico";
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

const STEPS = [
  { icon: UserPlus, title: "Crea tu cuenta", desc: "Nombre, especialidad y WhatsApp. Nada más." },
  { icon: FileText, title: "Completa tu perfil", desc: "Cédula, zona, horarios y fotos. Tú decides qué mostrar." },
  { icon: Rocket, title: "Recibe pacientes", desc: "Tu perfil queda visible en el directorio y en Google." },
];

const BENEFIT_CARDS = [
  { icon: TrendingUp, title: "Más pacientes nuevos", desc: "Apareces justo cuando alguien busca tu especialidad." },
  { icon: ShieldCheck, title: "Más confianza", desc: "La cédula verificada dice que eres quien dices ser." },
  { icon: Star, title: "Mejor reputación", desc: "Las opiniones de tus pacientes trabajan por ti." },
  { icon: Search, title: "Optimizado para Google", desc: "Sin que tú hagas nada de SEO." },
  { icon: MessageCircle, title: "Contacto directo", desc: "Te escriben por WhatsApp, sin intermediarios." },
  { icon: Gift, title: "Sin gastar en ads", desc: "No necesitas redes sociales ni sitio web propio." },
];

const TESTIMONIALS = [
  { name: "Dra. Ejemplo Ramírez", specialty: "Dermatóloga", city: "Monterrey", quote: "Recibo mensajes de pacientes que ya saben qué necesitan y llegan listos para agendar." },
  { name: "Dr. Ejemplo Torres", specialty: "Cardiólogo", city: "San Pedro", quote: "Completé mi perfil en diez minutos. No he vuelto a pagar por publicidad." },
  { name: "Dra. Ejemplo Salas", specialty: "Pediatra", city: "Monterrey", quote: "Los pacientes llegan ya conociendo mi experiencia y las opiniones de otros papás." },
];

const FAQS = [
  { q: "¿Es gratis registrarme?", a: "Sí, el plan Gratis no tiene costo ni límite de tiempo: perfil público, tu especialidad y zona, y contacto por WhatsApp." },
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
      className={`rounded-xl font-semibold gap-2 bg-brand-blue hover:bg-brand-blue/90 text-white ${className}`}
    >
      <Link to={CTA_URL} aria-label="Registrar mi perfil médico gratis en BuscoUnDoctor">
        {children}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </Button>
  );
}

export default function LandingMedicos() {
  const [showStickyCta, setShowStickyCta] = useState(false);
  const heroRef = useRef(null);

  // --- SEO: título, descripción, canonical, Open Graph, Twitter Card ---
  useEffect(() => {
    const title = "Registro para Médicos Especialistas | Directorio Médico BuscoUnDoctor";
    const description = "Regístrate gratis en el directorio médico de México. Crea tu perfil profesional médico, gana visibilidad en Google y consigue pacientes nuevos por especialidad y zona.";

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
          <Link to="/" className="flex items-center gap-2" aria-label="BuscoUnDoctor, ir al inicio">
            <div className="w-7 h-7 rounded-lg bg-brand-blue flex items-center justify-center flex-shrink-0">
              <span className="text-white font-heading font-bold text-xs">B</span>
            </div>
            <span className="font-heading font-extrabold text-foreground hidden sm:inline">
              busco<span className="text-brand-blue">undoctor</span>
            </span>
          </Link>
          <CtaButton size="sm">Registrar mi perfil gratis</CtaButton>
        </div>
      </header>

      <main>
        {/* ============ HERO (con agitación integrada, sin sección aparte) ============ */}
        <section ref={heroRef} aria-labelledby="hero-heading" className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-14">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block text-xs font-bold tracking-wide uppercase text-brand-blue bg-brand-bluePale px-3 py-1.5 rounded-full mb-5">
                Directorio médico de México
              </span>
              <h1 id="hero-heading" className="font-heading font-extrabold text-4xl sm:text-5xl leading-[1.1] text-foreground tracking-tight">
                Consigue más pacientes nuevos, sin gastar en publicidad
              </h1>
              <p className="text-lg text-muted-foreground mt-5 leading-relaxed">
                Cada día, pacientes buscan tu especialidad en Google. Si no apareces, agendan con otro médico. Crea tu perfil gratis en menos de 5 minutos.
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
                <CtaButton className="w-full sm:w-auto h-14 px-8 text-base" />
                <p className="text-xs text-muted-foreground mt-3">
                  Gratis para siempre · Sin tarjeta de crédito · 5 minutos
                </p>
              </div>
            </div>

            {/* Mockup de producto en vez de foto de stock */}
            <div className="relative" aria-hidden="true">
              <div className="bg-card border border-border/50 rounded-3xl shadow-xl p-6 max-w-sm mx-auto">
                <div className="flex items-center gap-3 pb-4 border-b border-border/50">
                  <div className="w-14 h-14 rounded-full bg-brand-bluePale flex items-center justify-center text-brand-blue font-heading font-bold text-lg flex-shrink-0">
                    Dr
                  </div>
                  <div className="min-w-0">
                    <p className="font-heading font-bold text-foreground truncate">Dr(a). Tu Nombre</p>
                    <p className="text-sm text-muted-foreground truncate">Tu especialidad · Monterrey</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 py-3">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-amber-400" fill="currentColor" />)}
                  <span className="text-xs text-muted-foreground ml-1">Reseñas verificadas</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                  <MapPin className="w-4 h-4 flex-shrink-0" /> Tu zona de atención
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0 text-emerald-600" /> Cédula profesional verificada
                </div>
                <Button className="w-full rounded-xl mt-4 bg-emerald-600 hover:bg-emerald-600/90 gap-2" tabIndex={-1}>
                  <MessageCircle className="w-4 h-4" /> Contactar por WhatsApp
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-3">Así se verá tu perfil público</p>
            </div>
          </div>

          {/* Barra de confianza: afirmaciones verificables, sin cifras infladas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mt-14 pt-8 border-t border-border/50">
            {[
              { icon: ShieldCheck, label: "Cédula verificada" },
              { icon: Users, label: "Hecho para especialistas" },
              { icon: Clock, label: "Listo en minutos" },
              { icon: Gift, label: "Gratis para siempre" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center text-center gap-2">
                <Icon className="w-5 h-5 text-brand-blue" />
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ============ BENEFICIOS ============ */}
        <section aria-labelledby="beneficios-heading" className="bg-muted/40 py-14 sm:py-18">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 id="beneficios-heading" className="font-heading font-bold text-2xl sm:text-3xl text-foreground text-center mb-10">
              Esto es lo que ganas
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {BENEFIT_CARDS.map((b) => (
                <div key={b.title} className="bg-card border border-border/50 rounded-2xl p-5">
                  <div className="w-10 h-10 rounded-xl bg-brand-bluePale flex items-center justify-center mb-3">
                    <b.icon className="w-5 h-5 text-brand-blue" />
                  </div>
                  <h3 className="font-heading font-bold text-foreground text-sm">{b.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{b.desc}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <CtaButton />
            </div>
          </div>
        </section>

        {/* ============ CÓMO FUNCIONA ============ */}
        <section aria-labelledby="como-funciona-heading" className="bg-brand-navy py-14 sm:py-18">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 id="como-funciona-heading" className="font-heading font-bold text-2xl sm:text-3xl text-white text-center mb-10">
              Tres pasos, nada más
            </h2>
            <div className="grid sm:grid-cols-3 gap-5">
              {STEPS.map((step, i) => (
                <div key={step.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-brand-blue flex items-center justify-center mx-auto mb-4">
                    <step.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-bold text-brand-blue">PASO {i + 1}</span>
                  <h3 className="font-heading font-bold text-white mt-1">{step.title}</h3>
                  <p className="text-sm text-white/70 mt-2 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <CtaButton className="bg-white text-brand-navy hover:bg-white/90" />
            </div>
          </div>
        </section>

        {/* ============ POR QUÉ NO BASTA CON REDES SOCIALES (comparativa corta) ============ */}
        <section aria-labelledby="comparativa-heading" className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-18 text-center">
          <h2 id="comparativa-heading" className="font-heading font-bold text-2xl sm:text-3xl text-foreground">
            Facebook e Instagram no fueron hechos para que te encuentre un paciente
          </h2>
          <div className="mt-8 space-y-3 text-left max-w-md mx-auto">
            {[
              { ok: false, text: "Google Maps no verifica tu cédula profesional" },
              { ok: false, text: "Redes sociales no filtran pacientes por especialidad" },
              { ok: false, text: "Un sitio web propio cuesta mantenerlo y no te posiciona solo" },
              { ok: true, text: "BuscoUnDoctor hace las tres cosas, gratis" },
            ].map((row) => (
              <div key={row.text} className="flex items-center gap-3 bg-card border border-border/50 rounded-xl px-4 py-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${row.ok ? "bg-emerald-100" : "bg-muted"}`}>
                  {row.ok ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-muted-foreground" />}
                </span>
                <span className={`text-sm ${row.ok ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{row.text}</span>
              </div>
            ))}
          </div>
          <div className="mt-9">
            <CtaButton />
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

        {/* ============ FAQ ============ */}
        <section aria-labelledby="faq-heading" className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-18">
          <h2 id="faq-heading" className="font-heading font-bold text-2xl sm:text-3xl text-foreground text-center mb-10">
            Preguntas frecuentes
          </h2>
          <Accordion type="single" collapsible className="bg-card rounded-2xl border border-border/50 divide-y divide-border/50">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="px-5">
                <AccordionTrigger className="text-left font-heading font-semibold text-sm sm:text-base text-foreground hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* ============ CTA FINAL ============ */}
        <section aria-labelledby="cta-final-heading" className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <Award className="w-9 h-9 text-brand-blue mx-auto mb-4" />
          <h2 id="cta-final-heading" className="font-heading font-extrabold text-3xl sm:text-4xl text-foreground tracking-tight">
            Tu próximo paciente ya te está buscando en Google
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Crear tu perfil es gratis y toma menos de 5 minutos.
          </p>
          <div className="mt-8">
            <CtaButton className="h-14 px-10 text-base" />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Gratis para siempre · Sin tarjeta de crédito · Cancela cuando quieras
          </p>
        </section>
      </main>

      {/* Footer mínimo */}
      <footer className="border-t border-border/50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-brand-blue flex items-center justify-center flex-shrink-0">
              <span className="text-white font-heading font-bold text-[10px]">B</span>
            </div>
            <span className="font-heading font-bold text-sm text-foreground">
              busco<span className="text-brand-blue">undoctor</span>
            </span>
          </Link>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} BuscoUnDoctor · Directorio médico en Monterrey y San Pedro Garza García
          </p>
        </div>
      </footer>

      {/* Sticky CTA móvil */}
      {showStickyCta && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border/50 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <CtaButton className="w-full h-12" />
        </div>
      )}
    </div>
  );
}
