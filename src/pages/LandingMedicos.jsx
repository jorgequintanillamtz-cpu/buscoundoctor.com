import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Star, Award, Sparkles, CreditCard, ShieldCheck,
  ArrowRight, BadgeCheck, MessageCircle, Clock, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import Logo from "@/components/Logo";

const CTA_URL = "/registro-medico";
// Fecha de lanzamiento público de la plataforma (hora de Monterrey, UTC-6).
const LAUNCH_DATE = new Date("2026-10-15T00:00:00-06:00");
// Misma clave que lee RegistroMedico.jsx al montar: si existe, precarga el
// paso 1 (datos) y salta directo al paso 2, para que el médico no tenga que
// volver a escribir lo que ya lleno aquí en la landing.
const LANDING_PREFILL_KEY = "buscoundoctor_landing_prefill";
const ORIGIN = "https://buscoundoctor.com";
const PAGE_URL = `${ORIGIN}/para-medicos`;

// Cuenta regresiva en vivo hasta LAUNCH_DATE, actualizada cada segundo.
function useCountdown(target) {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, target.getTime() - Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft(Math.max(0, target.getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  const totalSeconds = Math.floor(timeLeft / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    done: timeLeft <= 0,
  };
}

function CountdownBox({ value, label }) {
  return (
    <div className="bg-brand-blue rounded-2xl px-3 py-2.5 sm:px-5 sm:py-4 text-center min-w-[68px] sm:min-w-[92px] shadow-md shadow-brand-blue/20">
      <p className="font-heading font-extrabold text-3xl sm:text-5xl text-white tabular-nums leading-none">
        {String(value).padStart(2, "0")}
      </p>
      <p className="text-[10px] sm:text-xs text-white/85 mt-1.5 uppercase tracking-wide font-bold">{label}</p>
    </div>
  );
}

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
  const heroRef = useRef(null);
  const countdown = useCountdown(LAUNCH_DATE);
  const launchDateLabel = LAUNCH_DATE.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Monterrey" });

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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <Logo to="/" className="h-[47px] sm:h-[52px]" />
          <CtaButton size="sm">Registrar mi perfil</CtaButton>
        </div>
        {!countdown.done && (
          <div className="bg-brand-bluePale/60 border-t border-brand-blue/10 py-1.5 px-2">
            <p className="text-center text-xs sm:text-sm font-semibold text-brand-blue flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Lanzamos en {countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s</span>
              <span className="hidden sm:inline text-brand-navy/70 font-normal">· Regístrate antes para salir más arriba</span>
            </p>
          </div>
        )}
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
          {/* Título + subtítulo a la izquierda (sin badge, checklist ni botón --
              la conversión real pasa en el Paso 1 justo abajo) y, al lado, un
              perfil de ejemplo lo más completo posible: foto, nombre,
              especialidad, sello de verificado, calificación, reseña, precio
              y botón de contacto -- tal como se ve un perfil real en el sitio. */}
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 id="hero-heading" className="font-heading font-extrabold text-4xl sm:text-5xl leading-[1.1] text-foreground tracking-tight">
                Regístrate <span className="text-brand-blue">gratis ahorita</span> y sé de los primeros en el directorio
              </h1>
              {/* Subtítulo como bullets: lo importante que un médico necesita
                  saber antes de registrarse. Cada uno con un ícono que hace
                  referencia a su contenido, en verde. */}
              <ul className="mt-6 space-y-2.5 inline-block text-left">
                {[
                  { icon: CreditCard, text: "Gratis, sin tarjeta de crédito" },
                  { icon: ShieldCheck, text: "Cédula profesional verificada, le da confianza a tus pacientes" },
                  { icon: MessageCircle, text: "Contacto directo por WhatsApp, sin intermediarios" },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3 text-base text-foreground font-medium">
                    <span className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 text-emerald-600" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            {/* Mockup de producto: perfil de ejemplo completo, mismo estilo
                visual que el perfil público real (sello "Verificado",
                calificación, reseña, precio y botón de contacto). */}
            <div className="relative">
              <span className="absolute -top-3 -left-3 z-10 bg-foreground text-background text-[10px] font-bold tracking-wide uppercase px-3 py-1 rounded-full shadow">
                Ejemplo de perfil
              </span>
              <div className="bg-card border border-border/50 rounded-3xl shadow-2xl p-6 max-w-sm mx-auto" aria-hidden="true">
                <div className="flex items-start gap-3 pb-4 border-b border-border/50">
                  <img
                    src={EXAMPLE_DOCTOR_PHOTO}
                    alt=""
                    className="w-16 h-16 rounded-full object-cover ring-2 ring-white shadow flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-heading font-bold text-foreground truncate">Dr. Alejandro Mendoza</p>
                    <p className="text-sm text-muted-foreground truncate">Cardiólogo · Monterrey, N.L.</p>
                    <span className="inline-flex items-center gap-1.5 pl-2 pr-3 py-1 mt-1.5 rounded-full bg-brand-blue text-white font-heading font-bold text-[10px] tracking-tight shadow-sm">
                      <BadgeCheck className="w-3 h-3" strokeWidth={2.5} /> Verificado
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border/50">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                    <span className="text-xs font-semibold text-foreground ml-1">4.9</span>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    32 opiniones
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed py-3 border-b border-border/50">
                  “Excelente atención, muy profesional y explica todo con calma.” — paciente real
                </p>

                <div className="flex items-center justify-between py-3 border-b border-border/50">
                  <span className="text-sm text-foreground font-medium">Consulta de primera vez</span>
                  <span className="text-sm font-bold text-brand-navy">$800 MXN</span>
                </div>

                <Button className="w-full rounded-xl mt-4 bg-green-600 hover:bg-green-700 gap-2" tabIndex={-1}>
                  <svg className="w-4 h-4 text-white flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12.001 2C6.478 2 2 6.478 2 12c0 1.72.443 3.406 1.286 4.881L2 22l5.264-1.371A9.955 9.955 0 0 0 12.001 22C17.523 22 22 17.522 22 12S17.523 2 12.001 2zm0 18.06c-1.573 0-3.114-.42-4.468-1.216l-.32-.188-3.126.814.836-3.05-.208-.312A8.006 8.006 0 0 1 4 12c0-4.411 3.589-8 8.001-8 4.412 0 8 3.589 8 8s-3.588 8.06-8 8.06z" />
                  </svg>
                  Consultar horarios
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-3">Así se ve un perfil completo en BuscoUnDoctor</p>
            </div>
          </div>
          </div>
        </section>

        {/* ============ COUNTDOWN DE LANZAMIENTO ============ */}
        {!countdown.done && (
          <section aria-labelledby="countdown-heading" className="max-w-4xl mx-auto px-4 sm:px-6 pb-10 sm:pb-14">
            <div className="relative bg-card border border-border/50 rounded-3xl overflow-hidden p-6 sm:p-8 text-center shadow-sm">
              <div className="absolute -top-10 -right-10 w-56 h-56 bg-brand-blue/10 rounded-full pointer-events-none" />
              <div className="absolute -bottom-14 -left-14 w-48 h-48 bg-brand-bluePale/60 rounded-full pointer-events-none" />
              <div className="relative">
                <Logo className="h-8 sm:h-9 mx-auto mb-4" />
                <span className="inline-flex items-center gap-1.5 bg-brand-bluePale text-brand-blue text-xs font-bold tracking-wide uppercase px-3 py-1.5 rounded-full mb-4">
                  <Sparkles className="w-3 h-3" />
                  Lanzamos el {launchDateLabel}
                </span>
                <h2 id="countdown-heading" className="font-heading font-bold text-xl sm:text-2xl text-brand-navy mb-5">
                  Regístrate ahora y sé de los primeros médicos visibles en el directorio
                </h2>

                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6">
                  <CountdownBox value={countdown.days} label="Días" />
                  <CountdownBox value={countdown.hours} label="Horas" />
                  <CountdownBox value={countdown.minutes} label="Min" />
                  <CountdownBox value={countdown.seconds} label="Seg" />
                </div>

                <div className="grid sm:grid-cols-2 gap-3 max-w-xl mx-auto text-left">
                  <div className="flex items-start gap-2.5 bg-brand-bluePale/40 border border-brand-blue/10 rounded-2xl px-4 py-3">
                    <Clock className="w-4 h-4 text-brand-blue flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-brand-navy">Entre más pronto te registres, más prioridad tienes para salir más arriba</p>
                  </div>
                  <div className="flex items-start gap-2.5 bg-brand-bluePale/40 border border-brand-blue/10 rounded-2xl px-4 py-3">
                    <CheckCircle2 className="w-4 h-4 text-brand-blue flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-brand-navy">Entre más completo esté tu perfil, más arriba sales</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

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

        {/* ============ MIEMBRO FUNDADOR: 1 AÑO DE PREMIUM GRATIS ============ */}
        <section aria-labelledby="fundador-heading" className="max-w-4xl mx-auto px-4 sm:px-6 pb-14 sm:pb-18">
          <div className="relative bg-card border border-border/50 rounded-3xl overflow-hidden p-6 sm:p-10 shadow-sm">
            <div className="absolute -top-14 -left-14 w-56 h-56 bg-brand-bluePale/50 rounded-full pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-brand-blue/10 rounded-full pointer-events-none" />
            <div className="relative grid md:grid-cols-[auto,1fr] gap-6 md:gap-8 items-center">
              <div className="flex justify-center md:justify-start">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-brand-blue flex items-center justify-center flex-shrink-0 p-3">
                  <img src="/logo.webp" alt="" className="w-full h-full object-contain brightness-0 invert" />
                </div>
              </div>
              <div className="text-center md:text-left">
                <span className="inline-block text-xs font-bold tracking-wide uppercase text-brand-blue bg-brand-bluePale px-3 py-1.5 rounded-full mb-3">
                  Oferta de lanzamiento
                </span>
                <h2 id="fundador-heading" className="font-heading font-bold text-2xl sm:text-3xl text-foreground mb-2">
                  Sé Miembro Fundador
                </h2>
                <p className="text-muted-foreground mb-5">
                  Regístrate antes del lanzamiento y obtén el plan Premium <span className="font-semibold text-brand-navy">gratis durante 1 año</span> (valor $999 MXN/mes — $11,988 MXN al año) — sin tarjeta, sin compromiso.
                </p>
                <div className="grid sm:grid-cols-2 gap-2.5 max-w-xl mx-auto md:mx-0">
                  {[
                    "Perfil destacado en búsquedas",
                    "Galería de fotos y video",
                    "Reseñas verificadas",
                    "Estadísticas de visitas y contactos",
                    "Múltiples consultorios",
                    "Soporte prioritario",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 justify-center md:justify-start">
                      <CheckCircle2 className="w-4 h-4 text-brand-blue flex-shrink-0" />
                      <span className="text-sm text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ CTA FINAL ============ */}
        <section aria-labelledby="cta-final-heading" className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <Award className="w-9 h-9 text-brand-blue mx-auto mb-4" />
          <h2 id="cta-final-heading" className="font-heading font-extrabold text-3xl sm:text-4xl text-foreground tracking-tight">
            Tu próximo paciente ya te está buscando
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
