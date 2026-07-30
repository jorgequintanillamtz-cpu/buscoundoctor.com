import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Check, X, Minus, ShieldCheck, Users, Clock, Gift, Search, MessageCircle,
  Star, UserPlus, FileText, Rocket, TrendingUp, Award, Globe, Camera,
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

const BENEFITS_WHY = [
  "Más visibilidad cuando un paciente busca exactamente tu especialidad",
  "Perfil profesional médico optimizado para aparecer en Google",
  "Pacientes nuevos te contactan directo por WhatsApp, sin intermediarios",
  "Comparte tus datos de contacto, horarios y ubicación en un solo lugar",
  "Sube fotografías de tu consultorio y tu trabajo",
  "Recibe y muestra las opiniones de tus pacientes",
  "Verificación de cédula profesional incluida, sin costo",
  "Tu perfil sigue trabajando por ti aunque no estés conectado",
];

const STEPS = [
  {
    icon: UserPlus,
    title: "Crea tu cuenta",
    desc: "Regístrate con tu correo o con Google. Solo necesitas tu nombre, especialidad y WhatsApp.",
  },
  {
    icon: FileText,
    title: "Completa tu perfil",
    desc: "Agrega tu cédula profesional, zona, horarios y fotos. Tú decides qué información mostrar.",
  },
  {
    icon: Rocket,
    title: "Empieza a recibir pacientes",
    desc: "Tu perfil queda visible en el directorio médico y en Google cuando busquen tu especialidad.",
  },
];

const BENEFIT_CARDS = [
  { icon: TrendingUp, title: "Más pacientes nuevos", desc: "Aparece frente a personas que ya están buscando un especialista como tú, en el momento exacto en que lo necesitan." },
  { icon: ShieldCheck, title: "Mayor confianza", desc: "La verificación de cédula profesional le dice al paciente, antes de escribirte, que eres quien dices ser." },
  { icon: Star, title: "Mejor reputación", desc: "Las opiniones de tus pacientes construyen una reputación digital que trabaja por ti todo el tiempo." },
  { icon: Search, title: "Perfil optimizado para buscadores", desc: "Tu perfil está armado para posicionar en Google por tu especialidad y tu ciudad, sin que tú tengas que hacer nada de SEO." },
  { icon: Globe, title: "Presencia digital sin gastar en publicidad", desc: "No necesitas pagar anuncios ni administrar redes sociales para que te encuentren." },
];

const COMPARISON_ROWS = [
  { label: "Pacientes te encuentran buscando tu especialidad", busco: true, redes: false, maps: "partial", web: "partial", directorios: "partial" },
  { label: "Verificación de cédula profesional", busco: true, redes: false, maps: false, web: false, directorios: "partial" },
  { label: "Contacto directo por WhatsApp", busco: true, redes: "partial", maps: false, web: "partial", directorios: false },
  { label: "No requiere crear contenido constantemente", busco: true, redes: false, maps: true, web: true, directorios: true },
  { label: "Optimizado para buscadores (SEO médico)", busco: true, redes: false, maps: "partial", web: "partial", directorios: false },
  { label: "Gratis para empezar", busco: true, redes: true, maps: true, web: false, directorios: "partial" },
];

const COMPARISON_COLUMNS = [
  { key: "busco", label: "BuscoUnDoctor", highlight: true },
  { key: "redes", label: "Redes sociales" },
  { key: "maps", label: "Google Maps" },
  { key: "web", label: "Sitio web propio" },
  { key: "directorios", label: "Directorios tradicionales" },
];

const TESTIMONIALS = [
  { name: "Dra. Ejemplo Ramírez", specialty: "Dermatóloga", city: "Monterrey", quote: "Desde que tengo mi perfil, recibo mensajes de pacientes que ya saben qué necesitan y llegan listos para agendar." },
  { name: "Dr. Ejemplo Torres", specialty: "Cardiólogo", city: "San Pedro Garza García", quote: "Me tomó menos de diez minutos completar mi perfil. No he vuelto a pagar por publicidad." },
  { name: "Dra. Ejemplo Salas", specialty: "Pediatra", city: "Monterrey", quote: "Los pacientes llegan a la consulta ya conociendo mi experiencia y leyendo las opiniones de otros papás." },
];

const FAQS = [
  { q: "¿Es gratis registrarme en BuscoUnDoctor?", a: "Sí. El plan Gratis te permite tener un perfil público en el directorio médico, aparecer en tu especialidad y zona, y recibir contacto por WhatsApp, sin costo y sin límite de tiempo." },
  { q: "¿Cuánto tiempo tarda en estar listo mi perfil?", a: "El registro toma entre 3 y 5 minutos. Tu perfil queda visible en cuanto completas los datos básicos; puedes seguir agregando fotos, horarios y consultorios después." },
  { q: "¿Cómo verifican mi cédula profesional?", a: "Nuestro equipo revisa manualmente el número de cédula profesional que registras contra los registros oficiales antes de marcar tu perfil como verificado." },
  { q: "¿Qué especialidades médicas aceptan?", a: "Aceptamos médicos especialistas de prácticamente cualquier área: cardiología, ginecología, dermatología, pediatría, ortopedia, oftalmología, psiquiatría, medicina interna, y muchas más." },
  { q: "¿Necesito tener página web propia?", a: "No. Tu perfil en BuscoUnDoctor funciona como tu presencia digital: no necesitas página web, hosting ni conocimientos técnicos." },
  { q: "¿Voy a aparecer en Google?", a: "Sí. Cada perfil médico está optimizado para buscadores, para que aparezcas cuando alguien busque tu especialidad en tu ciudad." },
  { q: "¿Puedo editar mi perfil después de publicarlo?", a: "Sí, en cualquier momento desde tu panel: puedes actualizar tus datos, horarios, fotos y zona de atención cuando quieras." },
  { q: "¿Los pacientes me contactan directo o pasa por ustedes?", a: "Directo. Cuando un paciente ve tu perfil, te contacta por WhatsApp sin pasar por intermediarios ni comisiones por paciente." },
  { q: "¿Tiene algún costo oculto el plan Gratis?", a: "No. El plan Gratis es gratis para siempre. Si más adelante quieres funciones adicionales, existe un plan Premium opcional, sin ningún compromiso." },
  { q: "¿Qué diferencia hay entre el plan Gratis y el plan Premium?", a: "El plan Gratis te da presencia básica en el directorio. El plan Premium agrega perfil destacado, galería y video, casos de antes y después, estadísticas de visitas y más. Puedes ver el detalle completo en nuestra página de planes." },
  { q: "¿Puedo cancelar o eliminar mi perfil cuando quiera?", a: "Sí. Puedes desactivar o eliminar tu perfil cuando lo desees desde tu panel de médico, sin preguntas ni penalizaciones." },
  { q: "¿En qué ciudades está disponible BuscoUnDoctor?", a: "Actualmente operamos en Monterrey y San Pedro Garza García, y seguimos expandiendo cobertura a más ciudades de México." },
];

function Mark({ value }) {
  if (value === true) {
    return (
      <span className="inline-flex w-6 h-6 rounded-full bg-emerald-100 items-center justify-center" aria-label="Sí">
        <Check className="w-3.5 h-3.5 text-emerald-600" />
      </span>
    );
  }
  if (value === "partial") {
    return (
      <span className="inline-flex w-6 h-6 rounded-full bg-amber-100 items-center justify-center" aria-label="Depende">
        <Minus className="w-3.5 h-3.5 text-amber-600" />
      </span>
    );
  }
  return (
    <span className="inline-flex w-6 h-6 rounded-full bg-muted items-center justify-center" aria-label="No">
      <X className="w-3.5 h-3.5 text-muted-foreground" />
    </span>
  );
}

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
      {/* Header mínimo: solo logo + un único CTA. Sin menú, sin buscador,
          sin enlaces que compitan con el registro. */}
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
        {/* ============ HERO ============ */}
        <section ref={heroRef} aria-labelledby="hero-heading" className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block text-xs font-bold tracking-wide uppercase text-brand-blue bg-brand-bluePale px-3 py-1.5 rounded-full mb-5">
                Directorio médico de México
              </span>
              <h1 id="hero-heading" className="font-heading font-extrabold text-4xl sm:text-5xl leading-[1.1] text-foreground tracking-tight">
                Consigue más pacientes nuevos, sin gastar en publicidad
              </h1>
              <p className="text-lg text-muted-foreground mt-5 leading-relaxed">
                Únete al directorio médico gratuito donde miles de pacientes buscan un doctor especialista como tú. Crea tu perfil médico profesional en menos de 5 minutos.
              </p>

              <ul className="mt-7 space-y-3">
                {[
                  "Perfil profesional optimizado para Google",
                  "Contacto directo por WhatsApp, sin intermediarios",
                  "Verificación de cédula profesional incluida",
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
                  Gratis para siempre · Sin tarjeta de crédito · Actívalo en 5 minutos
                </p>
              </div>
            </div>

            {/* Mockup de producto en vez de foto de stock: lo que el médico obtiene */}
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mt-16 pt-10 border-t border-border/50">
            {[
              { icon: ShieldCheck, label: "Cédula profesional verificada" },
              { icon: Users, label: "Hecho para especialistas en México" },
              { icon: Clock, label: "Perfil listo en minutos" },
              { icon: Gift, label: "Plan gratuito para siempre" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center text-center gap-2">
                <Icon className="w-5 h-5 text-brand-blue" />
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ============ PROBLEMA / AGITACIÓN ============ */}
        <section aria-labelledby="problema-heading" className="bg-muted/40 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 id="problema-heading" className="font-heading font-bold text-2xl sm:text-3xl text-foreground">
              Cada día, pacientes buscan tu especialidad en Google. ¿Te encuentran a ti?
            </h2>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              "Cardiólogo cerca de mí", "ginecólogo en Monterrey", "dermatólogo especialista"... miles de búsquedas como estas pasan todos los días en México. Si tu perfil médico no aparece ahí, ese paciente nuevo agenda con otro doctor.
            </p>
            <p className="text-foreground font-semibold mt-4">
              Sin presencia digital, no es que te falten pacientes: es que no te están encontrando.
            </p>
            <div className="mt-8">
              <CtaButton>Registrar mi perfil gratis</CtaButton>
            </div>
          </div>
        </section>

        {/* ============ POR QUÉ REGISTRARTE ============ */}
        <section aria-labelledby="porque-heading" className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 id="porque-heading" className="font-heading font-bold text-2xl sm:text-3xl text-foreground">
              Por qué los médicos especialistas eligen tener un perfil médico online
            </h2>
            <p className="text-muted-foreground mt-3">
              Un directorio médico gratuito, pensado para que un paciente nuevo te encuentre y te contacte sin fricción.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {BENEFITS_WHY.map((item) => (
              <div key={item} className="flex items-start gap-3 bg-card border border-border/50 rounded-2xl p-4">
                <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                </span>
                <span className="text-sm text-foreground">{item}</span>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <CtaButton />
          </div>
        </section>

        {/* ============ CÓMO FUNCIONA ============ */}
        <section aria-labelledby="como-funciona-heading" className="bg-brand-navy py-16 sm:py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 id="como-funciona-heading" className="font-heading font-bold text-2xl sm:text-3xl text-white">
                Tres pasos para empezar a recibir pacientes nuevos
              </h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-6">
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
            <div className="text-center mt-12">
              <CtaButton className="bg-white text-brand-navy hover:bg-white/90" />
            </div>
          </div>
        </section>

        {/* ============ BENEFICIOS (tarjetas) ============ */}
        <section aria-labelledby="beneficios-heading" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 id="beneficios-heading" className="font-heading font-bold text-2xl sm:text-3xl text-foreground">
              Esto es lo que ganas al registrar tu perfil médico
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {BENEFIT_CARDS.map((b) => (
              <div key={b.title} className="bg-card border border-border/50 rounded-2xl p-6">
                <div className="w-11 h-11 rounded-xl bg-brand-bluePale flex items-center justify-center mb-4">
                  <b.icon className="w-5 h-5 text-brand-blue" />
                </div>
                <h3 className="font-heading font-bold text-foreground">{b.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ COMPARATIVA ============ */}
        <section aria-labelledby="comparativa-heading" className="bg-muted/40 py-16 sm:py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 id="comparativa-heading" className="font-heading font-bold text-2xl sm:text-3xl text-foreground">
                ¿Por qué un directorio médico y no solo redes sociales?
              </h2>
              <p className="text-muted-foreground mt-3">
                Facebook, Instagram, Google Maps y tu propio sitio web pueden ayudar. Pero ninguno está diseñado, específicamente, para que un paciente encuentre y verifique a un médico especialista.
              </p>
            </div>

            <div className="bg-card border border-border/50 rounded-2xl overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-border/50">
                    <th scope="col" className="text-left px-4 py-3 font-medium text-muted-foreground"></th>
                    {COMPARISON_COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        scope="col"
                        className={`px-3 py-3 text-center font-heading font-bold text-xs sm:text-sm ${col.highlight ? "text-brand-blue" : "text-foreground"}`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.label} className="border-b border-border/30 last:border-0">
                      <th scope="row" className="text-left px-4 py-3 font-medium text-foreground">{row.label}</th>
                      {COMPARISON_COLUMNS.map((col) => (
                        <td key={col.key} className="px-3 py-3 text-center">
                          <Mark value={row[col.key]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-center mt-10">
              <CtaButton />
            </div>
          </div>
        </section>

        {/* ============ TESTIMONIOS (placeholder) ============ */}
        <section aria-labelledby="testimonios-heading" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center max-w-2xl mx-auto mb-4">
            <h2 id="testimonios-heading" className="font-heading font-bold text-2xl sm:text-3xl text-foreground">
              Lo que dicen los médicos que ya tienen su perfil
            </h2>
          </div>
          <p className="text-center text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 max-w-xl mx-auto mb-10">
            Ejemplos ilustrativos: reemplaza estos testimonios por reseñas reales de médicos registrados antes de promover esta página.
          </p>
          <div className="grid sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="relative bg-card border border-border/50 rounded-2xl p-6">
                <span className="absolute top-4 right-4 text-[10px] font-bold tracking-wide uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  Ejemplo
                </span>
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 text-amber-400" fill="currentColor" />)}
                </div>
                <p className="text-sm text-foreground leading-relaxed">"{t.quote}"</p>
                <p className="text-sm font-semibold text-foreground mt-4">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.specialty} · {t.city}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ FAQ ============ */}
        <section aria-labelledby="faq-heading" className="bg-muted/40 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10">
              <h2 id="faq-heading" className="font-heading font-bold text-2xl sm:text-3xl text-foreground">
                Preguntas frecuentes de médicos especialistas
              </h2>
            </div>
            <Accordion type="single" collapsible className="bg-card rounded-2xl border border-border/50 divide-y divide-border/50">
              {FAQS.map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="px-5">
                  <AccordionTrigger className="text-left font-heading font-semibold text-sm sm:text-base text-foreground hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {f.a}
                    {f.q.includes("Premium") && (
                      <>
                        {" "}
                        <Link to="/planes" className="text-brand-blue hover:underline font-medium">
                          Ver planes y precios
                        </Link>.
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ============ CTA FINAL ============ */}
        <section aria-labelledby="cta-final-heading" className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <Award className="w-10 h-10 text-brand-blue mx-auto mb-5" />
          <h2 id="cta-final-heading" className="font-heading font-extrabold text-3xl sm:text-4xl text-foreground tracking-tight">
            Tu próximo paciente ya te está buscando en Google
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Crear tu perfil médico es gratis y toma menos de 5 minutos.
          </p>
          <div className="mt-8">
            <CtaButton className="h-14 px-10 text-base" />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Gratis para siempre · Sin tarjeta de crédito · Cancela cuando quieras
          </p>
        </section>
      </main>

      {/* Footer mínimo: sin menú de navegación, para no distraer del registro. */}
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

      {/* Sticky CTA móvil: aparece al pasar el hero, siempre visible en desktop en el header */}
      {showStickyCta && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border/50 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <CtaButton className="w-full h-12" />
        </div>
      )}
    </div>
  );
}
