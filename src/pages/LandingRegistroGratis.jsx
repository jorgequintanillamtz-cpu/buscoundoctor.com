import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Star, ArrowRight, BadgeCheck, Crown, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import Logo from "@/components/Logo";
import { LAUNCH_DATE, useCountdown } from "@/lib/launchCountdown";
import GoogleIcon from "@/components/icons/GoogleIcon";

// Landing de conversión para tráfico de anuncios (versión mejorada de
// /doctores-registro, que se dejó intacta por si ya hay anuncios apuntando ahí).
// Cambios de fondo, decididos con Jorge (2026-10-04):
//  - El formulario va en la PRIMERA pantalla del celular (antes quedaba casi dos
//    pantallas más abajo, detrás del título, los beneficios y un countdown grande).
//  - Un solo countdown (la barra de arriba); se quitó el de cajas grandes.
//  - Título que promete algo que sí podemos cumplir (antes: "ya te está buscando
//    en Google y ChatGPT", que hoy no se puede demostrar).
//  - Línea de confianza junto al botón y expectativa honesta: "4 pasos cortos,
//    unos 3 minutos" (antes decía "20 segundos" y el paso siguiente pedía cédula,
//    precio y dirección).
//  - Guarda de dónde llegó el doctor (utm_*, gclid/fbclid, referrer) y lo manda a
//    Microsoft Clarity como etiquetas para poder comparar qué anuncio rinde.
//
// noindex a propósito: es una página para llevar tráfico pagado directo a
// conversión, no para posicionar en buscadores.

// Misma clave que lee RegistroMedico.jsx al montar: precarga el paso 1 del
// registro y salta directo al paso 2 (igual que /para-medicos y /doctores-registro).
const LANDING_PREFILL_KEY = "buscoundoctor_landing_prefill";
const ACQUISITION_KEY = "buscoundoctor_acquisition";
const ORIGIN = "https://buscoundoctor.com";
const PAGE_URL = `${ORIGIN}/registro-gratis`;
const HERO_IMAGE = "https://iiklgyzyvbrtrxjfucoc.supabase.co/storage/v1/object/public/site-assets/hero-para-medicos.png";
// Foto de ejemplo, solo para ilustrar cómo se ve un perfil (el perfil completo es
// ficticio y la sección lo dice). Es una de las 3 fotos genéricas que Jorge dio
// para los correos (no es de ningún doctor registrado); está cerrada en la cara,
// a diferencia de la de Unsplash que usa /para-medicos, que se veía muy chica.
const EXAMPLE_DOCTOR_PHOTO = "https://iiklgyzyvbrtrxjfucoc.supabase.co/storage/v1/object/public/site-assets/hero-registro-recuperacion-doctor-3.jpg";

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

// De dónde llegó esta persona. Se guarda solo la PRIMERA vez (quien vuelve por
// otro camino no pisa el anuncio original) y se manda a Clarity como etiquetas.
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
function captureAcquisition() {
  try {
    const params = new URLSearchParams(window.location.search);
    const found = {};
    UTM_KEYS.forEach((k) => { const v = params.get(k); if (v) found[k] = v.slice(0, 100); });
    if (params.get("gclid")) found.gclid = "1";
    if (params.get("fbclid")) found.fbclid = "1";
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(ACQUISITION_KEY) || "null"); } catch { /* sin datos previos */ }
    if (!saved) {
      saved = { ...found, landing: "registro-gratis", referrer: (document.referrer || "").slice(0, 200), at: new Date().toISOString() };
      localStorage.setItem(ACQUISITION_KEY, JSON.stringify(saved));
    }
    if (typeof window.clarity === "function") {
      window.clarity("set", "landing", "registro-gratis");
      Object.entries(found).forEach(([k, v]) => window.clarity("set", k, String(v)));
    }
  } catch { /* nunca debe romper la página */ }
}

const HOW_IT_WORKS = [
  { n: "1", title: "Crea tu perfil", text: "Tus datos, tu cédula y la dirección de tu consultorio. Unos 3 minutos en total." },
  { n: "2", title: "Verificamos tu cédula", text: "Nuestro equipo la revisa antes de publicar, normalmente en menos de 24 horas." },
  { n: "3", title: "Los pacientes te encuentran", text: "Apareces en búsquedas por especialidad y zona, y te escriben directo por WhatsApp." },
];

// Los 3 pasos reales del registro (/registro-medico: datos -> consultorio -> cuenta;
// las fotos se suben después, desde el panel). En esta página el médico está en el paso 1; mostrarlos desde aquí
// le dice cuánto falta y que es corto (cada paso es una pantalla).
const REGISTRO_STEPS = ["Tus datos", "Tu consultorio", "Tu cuenta"];

function RegistroSteps({ current = 0 }) {
  return (
    <ol aria-label="Pasos del registro" className="flex items-start justify-between max-w-md mx-auto">
      {REGISTRO_STEPS.map((label, i) => {
        const active = i === current;
        return (
          <li key={label} className="flex-1 flex flex-col items-center relative" aria-current={active ? "step" : undefined}>
            {i > 0 && <span aria-hidden="true" className="absolute top-[15px] right-1/2 w-full h-px bg-border" />}
            <span
              className={`relative z-10 w-[30px] h-[30px] rounded-full flex items-center justify-center text-sm font-semibold border-2 ${
                active ? "border-brand-blue text-brand-blue bg-card" : "border-border text-muted-foreground bg-card"
              }`}
            >
              {i + 1}
            </span>
            <span className={`mt-1.5 text-[11px] leading-tight text-center ${active ? "font-semibold text-brand-blue" : "text-muted-foreground"}`}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function LandingRegistroGratis() {
  const navigate = useNavigate();
  const countdown = useCountdown(LAUNCH_DATE);
  const launchDateLabel = LAUNCH_DATE.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Monterrey" });

  const [specialties, setSpecialties] = useState([]);
  const [step1, setStep1] = useState({ title: "", full_name: "", whatsapp: "", specialty: "", subspecialty: "" });
  const [step1Error, setStep1Error] = useState("");

  useEffect(() => {
    base44.entities.Specialty.filter({ active: true }).then((specs) => {
      setSpecialties([...specs].sort((a, b) => a.name.localeCompare(b.name, "es")));
    }).catch(() => {});
  }, []);

  useEffect(() => { captureAcquisition(); }, []);

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
    // Si el enlace del anuncio trae un código de invitación (?ref=), se conserva.
    const ref = new URLSearchParams(window.location.search).get("ref");
    navigate(ref ? `/registro-medico?ref=${encodeURIComponent(ref)}` : "/registro-medico");
  };

  const goToForm = () => document.getElementById("registro")?.scrollIntoView({ behavior: "smooth", block: "start" });

  useEffect(() => {
    const title = "Crea tu perfil gratis y aparece cuando busquen un especialista en Monterrey | BuscoUnDoctor";
    const description = "Crea tu perfil verificado gratis y aparece cuando los pacientes busquen un especialista en Monterrey. Oferta Miembro Fundador para los primeros 10 doctores de cada especialidad.";
    document.title = title;
    setMeta("description", description);
    setMeta("robots", "noindex, follow");
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header mínimo: solo logo (y una barra con el lanzamiento), nada que distraiga del formulario */}
      <header className="border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-center">
          <Logo to="/" className="h-[30px]" />
        </div>
        {!countdown.done && (
          <div className="bg-brand-bluePale/60 border-t border-brand-blue/10 py-1.5 px-2">
            <p className="text-center text-xs font-semibold text-brand-blue flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Lanzamos el {launchDateLabel} · faltan {countdown.days} días</span>
            </p>
          </div>
        )}
      </header>

      <main>
        {/* ============ TÍTULO + FORMULARIO (en la primera pantalla del celular) ============ */}
        <section aria-labelledby="hero-heading" className="max-w-2xl mx-auto px-4 pt-4 sm:pt-10 pb-10">
          <div className="mb-4 sm:mb-7">
            <RegistroSteps current={0} />
          </div>
          <div className="text-center">
            <h1 id="hero-heading" className="font-heading font-extrabold text-[1.65rem] sm:text-4xl leading-[1.15] text-foreground tracking-tight">
              Aparece cuando busquen un especialista en <span className="text-brand-blue">Monterrey</span>
            </h1>
            <p className="mt-1.5 text-sm sm:text-base text-muted-foreground">
              Perfil verificado y gratis. Te contactan por WhatsApp.
            </p>
            <p className="mt-2.5 inline-flex items-start gap-2 text-left text-xs sm:text-sm font-medium text-foreground bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5">
              <Crown className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Miembro Fundador: 1 año de Premium gratis ($23,988 MXN) para los primeros 10 de cada especialidad.</span>
            </p>
          </div>

          {/* Lo que SÍ es cierto hoy: el perfil publicado es una página pública que
              Google puede mostrar. No prometemos posición ni tráfico. */}
          <p className="mt-4 sm:mt-6 flex items-center justify-center gap-2 text-sm font-medium text-foreground">
            <span className="w-7 h-7 rounded-full bg-card border border-border/70 shadow-sm flex items-center justify-center flex-shrink-0">
              <GoogleIcon className="w-4 h-4" />
            </span>
            Tu perfil puede aparecer en Google
          </p>

          <div id="registro" className="mt-4 sm:mt-6 bg-card border border-border/50 rounded-3xl p-4 sm:p-7 shadow-sm scroll-mt-4">
            <div className="grid gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nombre completo</label>
                <div className="grid grid-cols-2 gap-2 mb-1.5">
                  <button type="button" onClick={() => updateStep1("title", "Dr.")}
                    className={`h-9 rounded-xl border text-sm font-semibold transition-colors ${step1.title === "Dr." ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-accent"}`}>
                    Dr.
                  </button>
                  <button type="button" onClick={() => updateStep1("title", "Dra.")}
                    className={`h-9 rounded-xl border text-sm font-semibold transition-colors ${step1.title === "Dra." ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-accent"}`}>
                    Dra.
                  </button>
                </div>
                <Input value={step1.full_name} onChange={(e) => updateStep1("full_name", e.target.value)} placeholder="Nombre completo" className="rounded-xl" />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">WhatsApp</label>
                <Input value={step1.whatsapp} onChange={(e) => updateStep1("whatsapp", e.target.value)} placeholder="Ej: 8181234567" type="tel" className="rounded-xl" />
                <p className="text-xs text-muted-foreground mt-1">Aquí te contactarán tus pacientes directamente</p>
              </div>

              <div>
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

            {step1Error && <p className="text-sm text-red-500 text-center mt-4">{step1Error}</p>}

            <Button type="button" onClick={handleContinueStep1} className="w-full min-h-[48px] rounded-xl gap-1.5 mt-4 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold">
              Empezar mi registro gratis <ArrowRight className="w-4 h-4" />
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2.5 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              Gratis · sin tarjeta · tu cédula se verifica antes de publicar
            </p>
            <p className="text-[11px] text-muted-foreground/80 text-center mt-1.5">
              Unos 3 minutos en total. En la siguiente pantalla te pedimos tu correo, cédula y precio de consulta.
            </p>
          </div>
        </section>

        {/* ============ CÓMO FUNCIONA ============ */}
        <section aria-labelledby="como-heading" className="max-w-2xl mx-auto px-4 pb-10">
          <h2 id="como-heading" className="font-heading font-bold text-xl text-foreground text-center mb-5">Así de simple</h2>
          <ol className="space-y-4">
            {HOW_IT_WORKS.map((s) => (
              <li key={s.n} className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-brand-blue text-white font-heading font-bold text-sm flex items-center justify-center flex-shrink-0">{s.n}</span>
                <div>
                  <p className="font-semibold text-foreground">{s.title}</p>
                  <p className="text-sm text-muted-foreground">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ============ EJEMPLO DE PERFIL ============ */}
        <section aria-labelledby="ejemplo-heading" className="max-w-2xl mx-auto px-4 pb-10">
          <h2 id="ejemplo-heading" className="font-heading font-bold text-xl text-foreground text-center mb-1">Así se verá tu perfil</h2>
          <p className="text-center text-xs text-muted-foreground mb-4">Ejemplo ilustrativo de un perfil completo en BuscoUnDoctor</p>
          <div className="bg-card border border-border/50 rounded-3xl shadow-xl p-5 max-w-sm mx-auto" aria-hidden="true">
            <div className="flex items-start gap-3 pb-4 border-b border-border/50">
              <img src={EXAMPLE_DOCTOR_PHOTO} alt="" className="w-16 h-16 rounded-full object-cover ring-2 ring-white shadow flex-shrink-0" />
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
              <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">32 opiniones</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-foreground font-medium">Consulta de primera vez</span>
              <span className="text-sm font-bold text-brand-navy">$800 MXN</span>
            </div>
          </div>
          <div className="text-center mt-6">
            <Button onClick={goToForm} className="rounded-xl font-semibold gap-2 bg-brand-blue hover:bg-brand-blue/90 text-white h-12 px-8">
              Empezar mi registro gratis <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="bg-brand-navy py-7">
        <div className="max-w-2xl mx-auto px-4 flex flex-col items-center gap-3 text-center">
          <Logo to="/" className="h-7 brightness-0 invert" />
          <p className="text-xs text-white/60">© {new Date().getFullYear()} BuscoUnDoctor · Directorio médico en Monterrey y San Pedro Garza García</p>
          <p className="text-xs text-white/50">
            <Link to="/aviso-de-privacidad" className="hover:text-white/80">Aviso de privacidad</Link>
            <span className="mx-2">·</span>
            <Link to="/terminos-y-condiciones" className="hover:text-white/80">Términos y condiciones</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
