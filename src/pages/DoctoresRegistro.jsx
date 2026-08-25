import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Star, ArrowRight, BadgeCheck, Sparkles, Crown, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import Logo from "@/components/Logo";
import CountdownBox from "@/components/CountdownBox";
import { LAUNCH_DATE, useCountdown } from "@/lib/launchCountdown";

// Misma clave que lee RegistroMedico.jsx al montar: si existe, precarga el
// paso 1 (datos) y salta directo al paso 2 — igual que hace /para-medicos.
const LANDING_PREFILL_KEY = "buscoundoctor_landing_prefill";
const ORIGIN = "https://buscoundoctor.com";
const PAGE_URL = `${ORIGIN}/doctores-registro`;

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}
function setCanonicalLink(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) { el = document.createElement("link"); el.setAttribute("rel", "canonical"); document.head.appendChild(el); }
  el.setAttribute("href", href);
}

// Foto de ejemplo (banco de imágenes, licencia Unsplash) solo para ilustrar
// cómo se ve un perfil; el perfil completo es ficticio. Misma foto que usa
// /para-medicos para que el mockup se vea idéntico.
const EXAMPLE_DOCTOR_PHOTO = "https://images.unsplash.com/photo-1642975967602-653d378f3b5b?w=200&h=200&fit=crop&crop=faces&auto=format&q=80";

// Versión corta de /para-medicos (LandingMedicos.jsx) para tráfico de
// anuncios: el hero (título, bullet de Miembro Fundador y mockup de perfil)
// es EXACTAMENTE el mismo — copiado tal cual, sin recortar nada — y lo único
// que se agrega debajo es el countdown en chico y el Paso 1 del registro.
// Todo lo demás de /para-medicos (sección grande de countdown con cajas,
// Miembro Fundador aparte, CTA final con WhatsApp) se dejó fuera a
// propósito para que la página sea corta.
//
// noindex a propósito: el contenido es un subconjunto de /para-medicos, así
// que indexarla generaría contenido duplicado sin ningún beneficio de SEO
// adicional — esta página es para llevar tráfico pagado directo a
// conversión, no para posicionar en buscadores.
export default function DoctoresRegistro() {
  const navigate = useNavigate();
  const [showStickyCta, setShowStickyCta] = useState(false);
  const heroRef = useRef(null);
  const countdown = useCountdown(LAUNCH_DATE);
  const launchDateLabel = LAUNCH_DATE.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Monterrey" });

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

  useEffect(() => {
    document.title = "Registro para Médicos Especialistas | BuscoUnDoctor";
    setMeta("description", "Regístrate en el directorio médico de México. Crea tu perfil profesional y consigue pacientes nuevos por especialidad y zona.");
    setMeta("robots", "noindex, follow");
    setCanonicalLink(PAGE_URL);
  }, []);

  // Sticky CTA móvil: aparece después de pasar el hero, igual que en /para-medicos
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
      {/* Header mínimo: solo logo, sin nav -- nada que distraiga del título y el formulario */}
      <header className="border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-center">
          <Logo to="/" className="h-[47px] sm:h-[52px]" />
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
        {/* ============ HERO (idéntico a /para-medicos) ============ */}
        <section ref={heroRef} aria-labelledby="hero-heading" className="relative overflow-hidden">
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
            <div className="text-center lg:text-left">
              <h1 id="hero-heading" className="font-heading font-extrabold text-4xl sm:text-5xl leading-[1.1] text-foreground tracking-tight">
                <span>Tu próximo paciente en <span className="text-brand-blue">Monterrey</span> ya te está buscando en</span>
                <span className="flex flex-nowrap items-center justify-center lg:justify-start gap-x-2 text-2xl sm:text-3xl mt-1.5">
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
                      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                      <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.7 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.6 39.7 16.3 44 24 44z" />
                      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4 5.7l6.6 5.6C40.5 36.5 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z" />
                    </svg>
                    Google
                  </span>
                  <span>y</span>
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-foreground" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.0552v5.5826a4.504 4.504 0 0 1-4.4945 4.4903zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.5963 3.8558L13.1078 8.3971l2.02-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.7948.7948 0 0 0-.4079-.6765zm2.0107-3.0231-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V5.986a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.7014 5.3743a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
                    </svg>
                    ChatGPT
                  </span>
                </span>
              </h1>
              <ul className="mt-6 space-y-2.5 inline-block text-left">
                {[
                  { icon: Crown, text: "1 año gratis de Premium (ahorras $11,988 MXN) siendo Miembro Fundador" },
                  { icon: Users, text: "Oferta exclusiva para los primeros 10 doctores de cada especialidad" },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3 text-base text-foreground font-medium">
                    <span className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 text-emerald-600" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button
                  onClick={() => document.getElementById("paso1")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  size="lg"
                  className="rounded-xl font-semibold gap-2 bg-brand-blue hover:bg-brand-blue/90 text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all h-14 px-10 text-base"
                >
                  Registrar mi perfil gratis
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

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

        {/* ============ COUNTDOWN EN CHICO ============ */}
        {!countdown.done && (
          <section aria-labelledby="countdown-heading" className="max-w-md mx-auto px-4 sm:px-6 pb-8 text-center">
            <span id="countdown-heading" className="inline-flex items-center gap-1.5 bg-brand-bluePale text-brand-blue text-[11px] font-bold tracking-wide uppercase px-3 py-1.5 rounded-full mb-3">
              <Sparkles className="w-3 h-3" />
              Lanzamos el {launchDateLabel}
            </span>
            <div className="flex items-center justify-center gap-2">
              <CountdownBox value={countdown.days} label="Días" compact />
              <CountdownBox value={countdown.hours} label="Horas" compact />
              <CountdownBox value={countdown.minutes} label="Min" compact />
              <CountdownBox value={countdown.seconds} label="Seg" compact />
            </div>
          </section>
        )}

        {/* ============ PASO 1 DEL REGISTRO ============ */}
        <section id="paso1" aria-labelledby="paso1-heading" className="max-w-2xl mx-auto px-4 sm:px-6 pb-14 sm:pb-18 scroll-mt-28 sm:scroll-mt-32">
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
      </main>

      {/* Footer mínimo */}
      <footer className="bg-brand-navy py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <Logo to="/" className="h-8 brightness-0 invert" />
          <p className="text-xs text-white/60">
            © {new Date().getFullYear()} BuscoUnDoctor · Directorio médico en Monterrey y San Pedro Garza García
          </p>
        </div>
      </footer>

      {/* Sticky CTA móvil: aparece al pasar el hero, igual que en /para-medicos */}
      {showStickyCta && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border/50 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <Button
            asChild
            className="w-full h-12 rounded-xl font-semibold gap-2 bg-brand-blue hover:bg-brand-blue/90 text-white shadow-md"
          >
            <Link to="#paso1" onClick={(e) => { e.preventDefault(); document.getElementById("paso1")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
              Registrar mi perfil gratis
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
