import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Loader2, ArrowLeft, CheckCircle2, MapPin, Share2, X, PenLine, Heart } from "lucide-react";
import { formErrorMessage } from "@/lib/formErrors";
import RecommendationsLanding, { useLandingData } from "@/components/RecommendationsLandingNueva";
import { TOP_SPECIALTY_SLUGS } from "@/lib/topSpecialties";
import { specialtyLabel as aliasLabel } from "@/lib/specialtyAliases";
import { trackEvent, trackTag } from "@/lib/trackEvent";
import { RECOMMENDATION_SECTIONS, MAX_TAGS } from "@/lib/recommendationTags";

// COPIA de prueba de /recomendaciones, en /recomendaciones-nueva, para rediseñarla sin tocar la
// original (2026-10-28, pedido de David). Si gusta más, pasa a ser la principal. Usa su propia
// copia de la parte de abajo (RecommendationsLandingNueva.jsx); lo demás es compartido.
//
// /recomendaciones -- los pacientes recomiendan a su doctor (CLAUDE.md §8r). Piloto: página con
// `noindex`, sin enlaces desde el resto del sitio. 3 pasos: (1) el doctor, (2) la recomendación,
// (3) verificar el correo con un código y aceptar. Todo pasa por 3 funciones de la base de datos
// con límites anti-abuso; aquí solo se arma la pantalla.
const REASONS = {
  codigo_vencido: "El código venció. Pide uno nuevo.",
  demasiados_intentos: "Demasiados intentos con ese código. Pide uno nuevo.",
  ya_recomendaste: "Ya habías recomendado a este doctor. ¡Gracias!",
  correo_no_permitido: "Usa tu correo personal (no uno temporal).",
  no_se_pudo_enviar: "No pudimos mandar el código. Intenta de nuevo en un momento.",
};

const CONSENT_VERSION = "v1";
const PAGE_URL = "https://buscoundoctor.com/recomendaciones";
const isFemale = (name) => /^\s*(dra|doctora)\b/i.test(name || "");

// Título del hero: cada palabra entra HERO_WORD_STEP ms después de la anterior y tarda HERO_WORD_MS
// (index.css: hero-word); luego las burbujas de ciudades. HERO_TITLE_MS = cuándo terminó de entrar la última palabra.
const HERO_WORDS = [{ w: "Doctores" }, { w: "Recomendados", accent: true }];
const HERO_CITIES = ["Monterrey", "San Pedro Garza García"];
const HERO_WORD_STEP = 140;
const HERO_WORD_MS = 550;
const HERO_TITLE_MS = (HERO_WORDS.length - 1) * HERO_WORD_STEP + HERO_WORD_MS;

// Contador del hero: aparece desde el principio en ceros y, cuando termina de entrar el título (HERO_TITLE_MS)
// y ya llegó el dato, sube hasta el número de doctores de la lista (`doctors` de list_recommendations_landing)
// en ~1.5 s. `total` es null mientras carga. Con "reducir movimiento", muestra el número directo.
function RecommendationCounter({ total }) {
  const [n, setN] = useState(0);
  const [titleDone, setTitleDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTitleDone(true), HERO_TITLE_MS);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (total == null || !titleDone) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setN(total); return undefined; }
    const ms = 1500;
    let start = null;
    let raf = 0;
    const tick = (t) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / ms);
      setN(Math.round(total * (1 - Math.pow(1 - p, 3)))); // arranca rápido y frena al llegar
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [total, titleDone]);
  // Tipo reloj: una cajita por dígito, con tantas cajitas como dígitos tiene el total (rellena con ceros
  // mientras sube: 000 → 125), para que no cambie de ancho durante la animación.
  const digits = String(n).padStart(String(total ?? 0).length, "0").split("");
  return (
    <div className="mt-5 text-white/85">
      <div className="flex justify-center gap-1.5" aria-hidden="true">
        {digits.map((dg, i) => (
          <span key={i} className="relative w-11 h-14 sm:w-12 sm:h-16 rounded-lg bg-white/10 border border-white/20 shadow-inner flex items-center justify-center font-heading font-bold text-3xl sm:text-4xl text-white tabular-nums overflow-hidden">
            {dg}
            {/* Línea del medio, como en los relojes de paletas */}
            <span className="absolute inset-x-0 top-1/2 h-px bg-brand-navy/60" />
          </span>
        ))}
      </div>
      {total != null && <span className="sr-only">{total} {total === 1 ? "doctor recomendado" : "doctores recomendados"}</span>}
    </div>
  );
}

// Siluetas de personas y doctores a los lados del hero (el mismo dibujo que HeroPeopleIllustration del inicio,
// Home.jsx), apoyadas en el borde de abajo. Solo en pantallas grandes, donde los lados quedan libres.
const SIDE_PEOPLE = {
  left: [{ x: 6, scale: 0.72, opacity: 0.07 }, { x: 118, scale: 1.02, opacity: 0.12, doctor: true }, { x: 255, scale: 0.64, opacity: 0.08 }],
  right: [{ x: 20, scale: 0.66, opacity: 0.08 }, { x: 130, scale: 1.06, opacity: 0.13, doctor: true }, { x: 262, scale: 0.74, opacity: 0.09 }],
};

function HeroSidePeople({ side }) {
  return (
    <svg viewBox="0 0 360 200" className={`hidden lg:block absolute bottom-0 ${side === "left" ? "left-0" : "right-0"} w-[300px] xl:w-[380px] h-auto pointer-events-none select-none`} aria-hidden="true">
      {SIDE_PEOPLE[side].map((p, i) => (
        <g key={i} transform={`translate(${p.x}, ${200 - 170 * p.scale})`}>
          <g transform={`scale(${p.scale})`}>
            <path d="M0,170 L0,80 Q0,50 30,50 L70,50 Q100,50 100,80 L100,170 Z" className="fill-white" opacity={p.opacity} />
            <circle cx="50" cy="30" r="28" className="fill-white" opacity={p.opacity} />
            {p.doctor && (
              <>
                <rect x="38" y="58" width="24" height="55" rx="6" className="fill-brand-navy" opacity={Math.min(p.opacity * 1.8, 0.5)} />
                <circle cx="50" cy="66" r="6" className="fill-brand-bluePale" opacity={Math.min(p.opacity * 3, 0.65)} />
              </>
            )}
          </g>
        </g>
      ))}
    </svg>
  );
}

export default function RecomendacionesNueva() {
  const [step, setStep] = useState(1); // 1 doctor | 2 recomendación | 3 verificar | 4 gracias
  const [target, setTarget] = useState(null); // { mode: "existing", kind, id, full_name, specialty, zone } | { mode: "new", ... }
  const [tags, setTags] = useState([]);
  const [message, setMessage] = useState("");
  const [firstName, setFirstName] = useState(""); // primer nombre opcional: si se escribe, se muestra junto a la recomendación
  const [comment, setComment] = useState(""); // comentario público corto (lo revisa el equipo; sin nombre)
  const [showPrivate, setShowPrivate] = useState(false);
  const [email, setEmail] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false); // ya recomendó a uno: el mismo código vale 30 min para los demás doctores
  const [code, setCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Paso 1
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null); // null = aún no busca
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  // Al agregar un doctor nuevo: ya elegida la especialidad, mientras se escribe el nombre se muestran los doctores
  // parecidos de esa especialidad, para elegirlos en vez de duplicarlos (CLAUDE.md §8r).
  const [similar, setSimilar] = useState([]);
  const similarSeq = useRef(0);
  const [newDoc, setNewDoc] = useState({ title: "", full_name: "", specialty: "", zone: "", hospital: "", license_number: "", contact_phone: "", subspecialty: "" }); // title: "Dr." | "Dra."; full_name: solo el nombre
  const [specialties, setSpecialties] = useState([]);
  const [subspecialties, setSubspecialties] = useState([]);
  const [showOtherSpecialties, setShowOtherSpecialties] = useState(false);
  const [zones, setZones] = useState([]);
  const searchSeq = useRef(0);
  const [params] = useSearchParams();

  // Elegir a un doctor por su enlace y pasar directo al paso 2. Lo usan (a) quien llega desde la página de un doctor
  // ("Recomendar a este doctor", /recomendaciones?doctor=su-enlace) y (b) el botón "Yo también lo recomiendo" de las
  // tarjetas de la landing. Si el enlace no sirve, todo sigue normal en el paso 1.
  const startWithSlug = async (slug) => {
    try {
      const { data } = await base44.functions.invoke("getRecommendedDoctor", { slug });
      if (data?.ok && data.id) {
        setTarget({ mode: "existing", kind: "suggestion", id: data.id, full_name: data.full_name, specialty: data.specialty, subspecialty: data.subspecialty, zone: data.zone });
        setStep(2);
        return true;
      }
      // No es un doctor "recomendado" sin perfil: puede ser un doctor ya registrado y publicado (viene de su perfil).
      const { data: sp } = await base44.functions.invoke("getSpecialistRecommendations", { slug });
      if (sp?.ok && sp.id) {
        setTarget({ mode: "existing", kind: "specialist", id: sp.id, full_name: sp.full_name, specialty: sp.specialty, zone: sp.zone });
        setStep(2);
        return true;
      }
    } catch { /* si falla, se queda en el paso 1 */ }
    return false;
  };
  useEffect(() => {
    const slug = params.get("doctor");
    if (slug) startWithSlug(slug);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Medición (Clarity): visita, y cada paso al que se llega (el 4 es "enviada").
  useEffect(() => { trackTag("landing", "recomendaciones-nueva"); }, []);
  useEffect(() => { trackEvent(step === 4 ? "rec_enviada" : `rec_paso_${step}`); }, [step]);

  // Botón flotante (solo celular): aparece al bajar por la landing y regresa al formulario.
  const [showFab, setShowFab] = useState(false);
  const landing = useLandingData(); // doctores y comentarios de la landing (también alimentan la columna de la derecha en escritorio)
  useEffect(() => {
    const onScroll = () => setShowFab(window.scrollY > 700);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.title = "Recomienda a tu doctor | BuscoUnDoctor";
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) { robots = document.createElement("meta"); robots.setAttribute("name", "robots"); document.head.appendChild(robots); }
    robots.setAttribute("content", "noindex, nofollow");
    base44.entities.Specialty.filter({ active: true }).then((l) => setSpecialties([...l].sort((a, b) => (a.display_name || a.name).localeCompare(b.display_name || b.name, "es")))).catch(() => {});
    base44.entities.Zone.filter({ active: true }).then(setZones).catch(() => {});
    base44.entities.Subspecialty.filter({ active: true }).then((l) => setSubspecialties(l)).catch(() => {});
  }, []);

  // Empezar cada paso desde arriba (en celular "Siguiente" queda abajo; ver CLAUDE.md §10).
  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  // Búsqueda con pausa de 350 ms
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) { setResults(null); setSearching(false); return undefined; }
    const seq = ++searchSeq.current;
    setSearching(true);
    const id = setTimeout(async () => {
      try {
        const { data } = await base44.functions.invoke("searchRecommendableDoctors", { query: q });
        if (seq === searchSeq.current) setResults(Array.isArray(data) ? data : []);
      } catch {
        if (seq === searchSeq.current) setResults([]);
      }
      if (seq === searchSeq.current) setSearching(false);
    }, 350);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    const q = newDoc.full_name.trim();
    if (!adding || !newDoc.specialty || q.length < 3) { setSimilar([]); return undefined; }
    const seq = ++similarSeq.current;
    const id = setTimeout(async () => {
      try {
        const { data } = await base44.functions.invoke("findSimilarDoctors", { specialty: newDoc.specialty, query: q });
        if (seq === similarSeq.current) setSimilar(Array.isArray(data) ? data : []);
      } catch {
        if (seq === similarSeq.current) setSimilar([]); // es una ayuda: si falla, se puede agregar igual
      }
    }, 350);
    return () => clearTimeout(id);
  }, [adding, newDoc.specialty, newDoc.full_name]);

  const targetName = target?.full_name || "";
  const she = isFemale(targetName);
  const splitTitle = (raw) => {
    const m = String(raw || "").trim().match(/^(dra|doctora|dr|doctor)\.?\s+/i);
    if (!m) return { title: "", name: String(raw || "").trim() };
    return { title: /^dra|^doctora/i.test(m[1]) ? "Dra." : "Dr.", name: String(raw).trim().slice(m[0].length).trim() };
  };
  const phoneDigits = newDoc.contact_phone.replace(/\D/g, "");
  const phoneProblem = phoneDigits && !(phoneDigits.length === 10 || (phoneDigits.length === 12 && phoneDigits.startsWith("52")));
  // Subespecialidades de la especialidad elegida (opcional). Si cambia la especialidad, la elegida deja de valer sola.
  const specialtyId = specialties.find((x) => x.name === newDoc.specialty)?.id;
  const subOptions = specialtyId ? subspecialties.filter((x) => x.parent_specialty_id === specialtyId).sort((a, b) => a.name.localeCompare(b.name, "es")) : [];
  const subValue = subOptions.some((x) => x.name === newDoc.subspecialty) ? newDoc.subspecialty : "";
  const newDocValid = !!newDoc.title && newDoc.full_name.trim().length >= 4 && !!newDoc.specialty && !phoneProblem;
  const emailValid = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(email.trim());

  const pickExisting = (r) => {
    setTarget({ mode: "existing", kind: r.kind, id: r.id, full_name: r.full_name, specialty: r.specialty, zone: r.zone });
    setAdding(false);
    setError("");
    setStep(2); // al tocar un doctor de la lista se pasa directo a la recomendación, sin pantalla de confirmación
  };
  // Atrás desde el paso 2: se suelta el doctor elegido para volver a la búsqueda (o al formulario, que conserva lo escrito).
  const goBack = () => {
    if (step === 1) setAdding(false);
    else if (step === 2) { setTarget(null); setStep(1); }
    else setStep(step - 1);
    setError("");
  };
  const confirmNew = () => {
    if (!newDocValid) return;
    setTarget({ mode: "new", ...newDoc, subspecialty: subValue, full_name: `${newDoc.title} ${newDoc.full_name.trim()}` });
    setError("");
  };
  // Un solo botón "Siguiente": con un doctor de la lista, o con el formulario "¿Quién es tu doctor?" completo.
  const canContinue = !!target || (adding && newDocValid);
  const goNext = () => {
    if (!canContinue) return;
    if (!target) confirmNew();
    setStep(2);
  };
  const specialtyLabel = (name) => specialties.find((s) => s.name === name)?.display_name || name;

  const firstNameClean = firstName.replace(/\s+/g, " ").trim();
  const nameProblem = firstNameClean && (firstNameClean.length < 2 || !/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)?$/.test(firstNameClean))
    ? "Escribe solo tu primer nombre, sin números ni símbolos." : "";
  const commentClean = comment.replace(/\s+/g, " ").trim();
  const commentProblem = !commentClean ? ""
    : commentClean.length < 20 ? "Escribe al menos 20 letras, o deja el comentario vacío."
    : /(https?:|www\.|@|\.com|\.mx|\.net|\.org)/i.test(commentClean) || commentClean.replace(/\D/g, "").length >= 7 ? "Sin enlaces, correos ni teléfonos, por favor."
    : "";

  // "¿Qué destacas?": un selector por tema (El doctor, El consultorio, Tiempo…); cada uno solo trae las
  // opciones de su tema y se puede escoger una. En total, hasta MAX_TAGS (el servidor también lo exige).
  const sectionTag = (sec) => tags.find((t) => sec.tags.some((x) => x.v === t)) || "";
  const setSection = (sec, v) => setTags((cur) => {
    const rest = cur.filter((t) => !sec.tags.some((x) => x.v === t));
    return v ? [...rest, v] : rest;
  });

  const requestCode = async () => {
    if (!emailValid || busy || cooldown > 0) return;
    setBusy(true); setError("");
    try {
      const { data } = await base44.functions.invoke("requestRecommendationCode", { email: email.trim() });
      if (data?.ok) { setCodeSent(true); setCode(""); setCooldown(30); trackEvent("rec_codigo_pedido"); }
      else setError(REASONS[data?.reason] || "No pudimos mandar el código. Intenta de nuevo.");
    } catch (e) {
      setError(formErrorMessage(e, "No pudimos mandar el código. Revisa tu correo e intenta de nuevo."));
    }
    setBusy(false);
  };

  const submit = async () => {
    if (!codeSent || code.length !== 6 || !consent || busy) return;
    setBusy(true); setError("");
    const dest = target.mode === "new"
      ? { new: { full_name: target.full_name, specialty: target.specialty, zone: target.zone || null, hospital: target.hospital || null, license_number: target.license_number || null, contact_phone: target.contact_phone || null, subspecialty: target.subspecialty || null } }
      : target.kind === "suggestion" ? { suggestion_id: target.id } : { specialist_id: target.id };
    try {
      const { data } = await base44.functions.invoke("submitRecommendation", {
        email: email.trim(), code, target: dest, tags, message: message.trim() || null, comment: commentClean || null, name: firstNameClean || null,
        consent: true, marketing, consent_version: CONSENT_VERSION,
      });
      if (data?.ok) { setVerified(true); setStep(4); }
      else if (data?.reason === "codigo_incorrecto") {
        const n = data.intentos_restantes;
        setError(`Código incorrecto.${typeof n === "number" ? ` Te quedan ${n} ${n === 1 ? "intento" : "intentos"}.` : ""}`);
      } else {
        // Código vencido o con demasiados intentos: se pide otro (el paciente vuelve a "Confirmar mi correo").
        if (data?.reason === "codigo_vencido" || data?.reason === "demasiados_intentos") { setVerified(false); setCodeSent(false); setCode(""); }
        setError(REASONS[data?.reason] || "No pudimos guardar tu recomendación. Intenta de nuevo.");
      }
    } catch (e) {
      setError(formErrorMessage(e, "No pudimos guardar tu recomendación. Intenta de nuevo."));
    }
    setBusy(false);
  };

  const reset = () => {
    setStep(1); setTarget(null); setTags([]); setMessage(""); setComment(""); setShowPrivate(false);
    // Si ya confirmó su correo, conserva correo, código, nombre y aceptación: puede recomendar a todos sus doctores sin repetir nada.
    if (!verified) { setFirstName(""); setCode(""); setCodeSent(false); setConsent(false); setMarketing(false); }
    setQuery(""); setResults(null); setAdding(false);
    setNewDoc({ title: "", full_name: "", specialty: "", zone: "", hospital: "", license_number: "", contact_phone: "", subspecialty: "" }); setError(""); setShowOtherSpecialties(false);
  };

  const shareHref = `https://wa.me/?text=${encodeURIComponent(`Acabo de recomendar a mi doctor en BuscoUnDoctor. Tú también puedes recomendar al tuyo, toma un minuto: ${PAGE_URL}`)}`;

  return (
    <div id="top" className="min-h-screen bg-background">
      {/* Portada: azul sólido en toda la parte de arriba (título y formulario), sin difuminado. */}
      <div className="relative overflow-hidden bg-brand-navy">
      {step === 1 && <><HeroSidePeople side="left" /><HeroSidePeople side="right" /></>}
      {/* Portada azul: grande en el paso 1, compacta después para que el formulario quepa en el celular */}
      <header className={`relative overflow-hidden text-white text-center px-5 ${step === 1 ? "pt-8 pb-16" : "pt-6 pb-12"}`}>
        {step === 1 && (
          <>
            <svg aria-hidden="true" viewBox="0 0 100 100" className="hidden md:block absolute left-[6%] top-16 w-28 h-28 text-white/10 -rotate-6" fill="currentColor">
              <path d="M15 15h55a10 10 0 0 1 10 10v30a10 10 0 0 1-10 10H45L28 82V65H15A10 10 0 0 1 5 55V25a10 10 0 0 1 10-10z" />
            </svg>
            <svg aria-hidden="true" viewBox="0 0 100 100" className="hidden md:block absolute right-[7%] top-20 w-24 h-24 text-emerald-300/20 rotate-6" fill="currentColor">
              <path d="M50 88C20 62 8 46 8 32a21 21 0 0 1 42-6 21 21 0 0 1 42 6c0 14-12 30-42 56z" />
            </svg>
            <svg aria-hidden="true" viewBox="0 0 100 100" className="hidden lg:block absolute right-[18%] top-6 w-14 h-14 text-white/10 rotate-12" fill="currentColor">
              <path d="M15 15h55a10 10 0 0 1 10 10v30a10 10 0 0 1-10 10H45L28 82V65H15A10 10 0 0 1 5 55V25a10 10 0 0 1 10-10z" />
            </svg>
          </>
        )}
        <Link to="/" className="inline-block">
          <img src="/logo.webp" alt="BuscoUnDoctor" className="h-12 sm:h-8 lg:h-12 w-auto brightness-0 invert" />
        </Link>
        {step === 1 && (
          <div className="max-w-xl lg:max-w-3xl mx-auto mt-6">
            {/* Al cargar: las palabras entran una por una (index.css: hero-word). Debajo, el contador (desde el principio
                en ceros; sube cuando termina de entrar el título) y luego las burbujas de ciudades. */}
            <h1 className="font-heading font-bold text-[2.45rem] sm:text-[2.95rem] leading-tight lg:whitespace-nowrap">
              {HERO_WORDS.map(({ w, accent }, i) => (
                <span key={w}>{i > 0 && " "}<span className={`hero-word ${accent ? "text-emerald-300" : ""}`} style={{ animationDelay: `${i * HERO_WORD_STEP}ms` }}>{w}</span></span>
              ))}
            </h1>
            {landing !== false && !(landing && landing.doctors.length === 0) && <RecommendationCounter total={landing ? landing.doctors.length : null} />}
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {HERO_CITIES.map((c, i) => (
                <span key={c} className="hero-word" style={{ animationDelay: `${(HERO_WORDS.length + i) * HERO_WORD_STEP}ms` }}>
                  <span className="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-white/10 border border-white/20 text-xs sm:text-sm font-medium text-white/90">
                    <MapPin className="w-3.5 h-3.5" aria-hidden="true" /> {c}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
        {step === 2 && target && (
          <div className="max-w-xl mx-auto mt-5">
            <p className="font-heading font-bold text-xl">{targetName}</p>
            <p className="text-white/75 text-sm mt-0.5">{[specialtyLabel(target.specialty), target.subspecialty, target.zone].filter(Boolean).join(" · ")}</p>
          </div>
        )}
        {step === 3 && (
          <div className="max-w-xl mx-auto mt-5">
            <p className="font-heading font-bold text-xl">Último paso</p>
            <p className="text-white/75 text-sm mt-0.5">Confirma que eres tú</p>
          </div>
        )}
      </header>

      <main className="relative z-10 max-w-lg mx-auto px-4 -mt-8 pb-16">
        <div className="bg-card rounded-3xl border border-border/50 shadow-lg p-5 sm:p-7">
          {(step === 2 || step === 3 || (step === 1 && adding && !target)) && (
            <button type="button"
              onClick={goBack}
              className="-mt-1 mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground min-h-[44px] -ml-1 px-1">
              <ArrowLeft className="w-4 h-4" /> Atrás
            </button>
          )}
          {step <= 3 && (
            <div className="flex gap-1.5 mb-5" aria-label={`Paso ${step} de 3`}>
              {[1, 2, 3].map((n) => (
                <span key={n} className={`flex-1 h-1.5 rounded-full ${n <= step ? "bg-brand-augusta" : "bg-border"}`} />
              ))}
            </div>
          )}

          {/* ---------- PASO 1: el doctor ---------- */}
          {step === 1 && (
            <div>
              {/* En el formulario de "escribir su nombre" no va este título: ahí solo se pregunta lo que sigue. */}
              {!(adding && !target) && <h2 className="font-heading font-semibold text-lg text-foreground mb-3">¿A quién quieres recomendar?</h2>}

              {target ? (
                <div className="rounded-2xl border border-brand-augusta bg-brand-augustaLight p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-brand-augustaDark">{target.full_name}</p>
                    <p className="text-sm text-brand-augustaDark/80">{[specialtyLabel(target.specialty), target.subspecialty, target.zone].filter(Boolean).join(" · ")}</p>
                  </div>
                  <button type="button" onClick={() => setTarget(null)} aria-label="Cambiar de doctor" className="p-1 text-brand-augustaDark/70 hover:text-brand-augustaDark"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <>
                  {!adding && (
                    <>
                      <div className="relative">
                        <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Busca por nombre del doctor" className="h-12 rounded-xl pl-10" />
                        {searching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2" />}
                      </div>
                      {results && results.length > 0 && (
                        <ul className="mt-2 space-y-2">
                          {results.map((r) => (
                            <li key={`${r.kind}-${r.id}`}>
                              <button type="button" onClick={() => pickExisting(r)} className="w-full text-left rounded-xl border border-border/60 hover:border-brand-augusta/50 px-4 py-3 transition-colors">
                                <p className="font-medium text-foreground">{r.full_name}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  {specialtyLabel(r.specialty)}{r.zone && <><MapPin className="w-3 h-3 ml-1" />{r.zone}</>}
                                </p>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {/* "Escribir su nombre" solo aparece cuando ya buscó: fuerte si no hubo resultados
                          ("sé el primero"), y como enlace discreto si hubo resultados pero ninguno es su doctor. */}
                      {(() => {
                        if (!results || searching) return null;
                        const startAdding = () => { trackEvent("rec_escribir_nombre"); setAdding(true); setNewDoc((d) => { const t = splitTitle(query); return { ...d, title: d.title || t.title, full_name: d.full_name || t.name }; }); };
                        if (results.length > 0) {
                          return (
                            <p className="mt-3 text-sm text-muted-foreground text-center">
                              ¿No es ninguno?{" "}
                              <button type="button" onClick={startAdding} className="font-semibold text-brand-augusta hover:underline">Sé el primero en recomendarlo</button>
                            </p>
                          );
                        }
                        return (
                          <div className="mt-4 rounded-2xl p-4 border-2 border-brand-augusta bg-brand-augustaLight">
                            <p className="text-sm font-semibold text-brand-augustaDark">No lo vemos en la lista. Sé el primero en recomendarlo.</p>
                            <button type="button" onClick={startAdding}
                              className="mt-3 w-full h-12 rounded-xl bg-brand-augusta hover:bg-brand-augustaDark text-white font-semibold flex items-center justify-center gap-2 transition-colors">
                              <PenLine className="w-5 h-5" /> Escribir su nombre
                            </button>
                          </div>
                        );
                      })()}
                    </>
                  )}

                  {adding && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">¿De qué especialidad es?</label>
                        {(() => {
                          const top = TOP_SPECIALTY_SLUGS.map((slug) => specialties.find((x) => x.slug === slug)).filter(Boolean);
                          const topNames = new Set(top.map((x) => x.name));
                          const others = specialties.filter((x) => !topNames.has(x.name));
                          const otherChosen = !!newDoc.specialty && !topNames.has(newDoc.specialty);
                          const otherOpen = showOtherSpecialties || otherChosen;
                          const chip = (on) => `px-3.5 h-10 rounded-full border text-sm font-medium transition-colors ${on ? "border-brand-augusta bg-brand-augustaLight text-brand-augustaDark" : "border-input bg-background text-foreground hover:border-brand-augusta/50"}`;
                          return (
                            <>
                              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Especialidad">
                                {top.map((x) => (
                                  <button key={x.id} type="button" role="radio" aria-checked={newDoc.specialty === x.name}
                                    onClick={() => { setNewDoc({ ...newDoc, specialty: x.name }); setSimilar([]); setShowOtherSpecialties(false); }}
                                    className={chip(newDoc.specialty === x.name)}>
                                    {aliasLabel(x.name, x.display_name || x.name)}
                                  </button>
                                ))}
                                <button type="button" role="radio" aria-checked={otherOpen}
                                  onClick={() => { setShowOtherSpecialties(true); if (!otherChosen) { setNewDoc({ ...newDoc, specialty: "" }); setSimilar([]); } }}
                                  className={chip(otherOpen)}>
                                  Otra especialidad
                                </button>
                              </div>
                              {otherOpen && (
                                <select value={otherChosen ? newDoc.specialty : ""} onChange={(e) => { setNewDoc({ ...newDoc, specialty: e.target.value }); setSimilar([]); }} className="mt-2 w-full h-11 px-3 rounded-xl border border-input bg-background text-sm" aria-label="Otra especialidad">
                                  <option value="">Elige la especialidad</option>
                                  {others.map((x) => <option key={x.id} value={x.name}>{aliasLabel(x.name, x.display_name || x.name)}</option>)}
                                </select>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      {subOptions.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1 block">Subespecialidad <span className="text-muted-foreground font-normal">(opcional)</span></label>
                          <select value={subValue} onChange={(e) => setNewDoc({ ...newDoc, subspecialty: e.target.value })} className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm" aria-label="Subespecialidad">
                            <option value="">No sé / ninguna</option>
                            {subOptions.map((x) => <option key={x.id} value={x.name}>{x.name}</option>)}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">¿Es doctor o doctora?</label>
                        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Doctor o doctora">
                          {["Dr.", "Dra."].map((t) => (
                            <button key={t} type="button" role="radio" aria-checked={newDoc.title === t} onClick={() => setNewDoc({ ...newDoc, title: t })}
                              className={`h-11 rounded-xl border text-sm font-medium transition-colors ${newDoc.title === t ? "border-brand-augusta bg-brand-augustaLight text-brand-augustaDark" : "border-input bg-background text-foreground hover:border-brand-augusta/50"}`}>
                              {t === "Dr." ? "Doctor (Dr.)" : "Doctora (Dra.)"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">Nombre y apellido(s)</label>
                        <Input value={newDoc.full_name}
                          onChange={(e) => { const t = splitTitle(e.target.value); setNewDoc({ ...newDoc, title: t.title || newDoc.title, full_name: t.title ? t.name : e.target.value }); }}
                          disabled={!newDoc.specialty}
                          placeholder={newDoc.specialty ? "Ej. Ana Pérez López (sin Dr. ni Dra.)" : "Primero elige la especialidad"} className="h-11 rounded-xl" maxLength={100} />
                        {similar.length > 0 && (
                          <div className="mt-2 rounded-xl border border-brand-augusta/40 bg-brand-augustaLight/40 p-2">
                            <p className="text-xs font-medium text-brand-augustaDark px-2 pt-1 pb-1.5">¿Es alguno de estos? Toca para elegirlo.</p>
                            <ul className="space-y-1.5">
                              {similar.map((r) => (
                                <li key={`${r.kind}-${r.id}`}>
                                  <button type="button" onClick={() => pickExisting(r)} className="w-full text-left rounded-lg bg-white border border-border/60 hover:border-brand-augusta/60 px-3 py-2.5 transition-colors">
                                    <p className="font-medium text-foreground text-sm">{r.full_name}</p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 flex-wrap">
                                      {specialtyLabel(r.specialty)}{r.zone && <><MapPin className="w-3 h-3 ml-1" />{r.zone}</>}
                                      <span className="ml-1 text-[11px] bg-muted px-2 py-0.5 rounded-full">{r.kind === "specialist" ? "Ya está en BuscoUnDoctor" : "Ya lo recomendaron"}</span>
                                    </p>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1 block">¿Dónde consulta? <span className="text-muted-foreground font-normal">(opcional)</span></label>
                          <select value={newDoc.zone} onChange={(e) => setNewDoc({ ...newDoc, zone: e.target.value })} className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm">
                            <option value="">Elige</option>
                            {zones.map((z) => <option key={z.id} value={z.name}>{z.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1 block">Hospital / clínica <span className="text-muted-foreground font-normal">(opcional)</span></label>
                          <Input value={newDoc.hospital} onChange={(e) => setNewDoc({ ...newDoc, hospital: e.target.value })} placeholder="Ej. Zambrano Hellion" className="h-11 rounded-xl" maxLength={120} />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">Teléfono para citas <span className="text-muted-foreground font-normal">(opcional)</span></label>
                        <Input type="tel" inputMode="tel" autoComplete="off" value={newDoc.contact_phone}
                          onChange={(e) => setNewDoc({ ...newDoc, contact_phone: e.target.value.slice(0, 20) })}
                          placeholder="Ej. 81 1234 5678" className="h-11 rounded-xl" />
                        <p className={`text-xs mt-1.5 ${phoneProblem ? "text-red-600" : "text-muted-foreground"}`}>
                          {phoneProblem ? "Escribe los 10 números del teléfono." : "Si lo sabes, nos ayuda a que el doctor reciba citas. No lo mostramos al público."}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Con la búsqueda no hay "Siguiente": al tocar un doctor se pasa solo. Solo el formulario de "escribir su nombre" lo necesita. */}
              {adding && !target && (
                <Button type="button" onClick={goNext} disabled={!canContinue}
                  className="w-full mt-6 h-12 rounded-xl bg-brand-augusta hover:bg-brand-augusta/90 text-white font-semibold">
                  Siguiente
                </Button>
              )}
            </div>
          )}

          {/* ---------- PASO 2: la recomendación ---------- */}
          {step === 2 && (
            <div>
              <div className="rounded-2xl border-2 border-brand-augusta bg-brand-augustaLight text-brand-augustaDark text-center font-heading font-semibold text-lg py-4 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Sí, {she ? "la" : "lo"} recomiendo
              </div>

              <p className="text-sm font-medium text-foreground mt-5">¿Qué destacas? <span className="text-muted-foreground font-normal">(opcional)</span></p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">Elige una por tema, hasta {MAX_TAGS} en total: lo que más destaca {she ? "de ella" : "de él"}.</p>
              <div className="space-y-2">
                {RECOMMENDATION_SECTIONS.map((sec) => {
                  const picked = sectionTag(sec);
                  const full = !picked && tags.length >= MAX_TAGS;
                  return (
                    <select
                      key={sec.key}
                      value={picked}
                      onChange={(e) => setSection(sec, e.target.value)}
                      disabled={full}
                      aria-label={`Qué destacas: ${sec.label}`}
                      className={`w-full h-12 px-3.5 rounded-xl border text-sm bg-background disabled:opacity-50 ${picked ? "border-brand-augusta bg-brand-augustaLight text-brand-augustaDark font-medium" : "border-input text-muted-foreground"}`}
                    >
                      <option value="">{full ? `${sec.label}: ya elegiste ${MAX_TAGS}` : `${sec.label}: elige una`}</option>
                      {sec.tags.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                    </select>
                  );
                })}
              </div>

              <p className="text-sm font-medium text-foreground mt-6 mb-1.5">Cuéntanos qué hace {she ? "a esta doctora" : "a este doctor"} excelente <span className="text-muted-foreground font-normal">(opcional)</span></p>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value.slice(0, 160))} rows={3} placeholder="Ej. Me explicó todo con calma y siempre contestó mis dudas."
                className="rounded-xl resize-none" />
              <div className="flex items-start justify-between gap-3 mt-1.5">
                <p className={`text-xs ${commentProblem ? "text-red-600" : "text-muted-foreground"}`}>
                  {commentProblem || "Habla de su trato, cómo explica, el consultorio o la atención. Sin tu enfermedad ni nombres de otras personas. Se publica después de que lo revisemos."}
                </p>
                <span className="text-xs text-muted-foreground flex-shrink-0">{comment.length}/160</span>
              </div>

              {!showPrivate && !message ? (
                <button type="button" onClick={() => setShowPrivate(true)} className="mt-5 text-sm text-brand-blue hover:underline">
                  Dejarle un mensaje privado {she ? "a la doctora" : "al doctor"} (opcional)
                </button>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground mt-5 mb-1.5">Mensaje privado para {she ? "la doctora" : "el doctor"} <span className="text-muted-foreground font-normal">(opcional)</span></p>
                  <Textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 500))} rows={3} placeholder="Ej. Gracias por escucharme con tanta paciencia."
                    className="rounded-xl resize-none" />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Solo {she ? "ella" : "él"} lo verá, cuando reclame su perfil; no se publica. No escribas datos de salud ni de otras personas. {message.length}/500
                  </p>
                </>
              )}

              <div className="flex gap-3 mt-6">
                <Button type="button" variant="outline" onClick={goBack} className="h-12 rounded-xl px-4"><ArrowLeft className="w-4 h-4" /></Button>
                <Button type="button" onClick={() => setStep(3)} disabled={!!commentProblem} className="flex-1 h-12 rounded-xl bg-brand-augusta hover:bg-brand-augusta/90 text-white font-semibold">Siguiente</Button>
              </div>
            </div>
          )}

          {/* ---------- PASO 3: verificar y enviar ---------- */}
          {step === 3 && (
            <div>
              <h2 className="font-heading font-semibold text-lg text-foreground mb-4">¿Quién {she ? "la" : "lo"} recomienda?</h2>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Tu nombre</label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value.slice(0, 25))} placeholder="Ej. María" className="h-12 rounded-xl" autoComplete="given-name" />
              <p className={`text-xs mt-1.5 mb-5 ${nameProblem ? "text-red-600" : "text-muted-foreground"}`}>
                {nameProblem || "Si lo escribes, aparece junto a tu recomendación. Solo tu primer nombre: nunca tu apellido ni tu correo."}
              </p>

              <label className="text-sm font-medium text-foreground mb-1.5 block">Tu correo electrónico</label>
              <div className="flex gap-2">
                <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (codeSent) { setCodeSent(false); setCode(""); setVerified(false); } }}
                  placeholder="tucorreo@ejemplo.com" className="h-12 rounded-xl flex-1" autoComplete="email" />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Solo lo usamos para confirmar que eres una persona real. No se muestra.</p>

              {!codeSent ? (
                <Button type="button" onClick={requestCode} disabled={!emailValid || busy}
                  className="w-full mt-4 h-12 rounded-xl bg-brand-augusta hover:bg-brand-augusta/90 text-white font-semibold">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar mi correo"}
                </Button>
              ) : (
                <>
                  {verified ? (
                    <p className="mt-5 flex items-start gap-2 rounded-xl bg-brand-augustaLight text-brand-augustaDark text-sm px-3.5 py-3">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" /> Ya confirmaste tu correo. Solo toca "Enviar recomendación".
                    </p>
                  ) : (
                    <>
                      <label className="text-sm font-medium text-foreground mt-5 mb-1.5 block">Código de 6 números</label>
                      <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code"
                        placeholder="000000" className="h-12 rounded-xl text-center text-xl tracking-[0.5em] font-semibold" />
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Te lo mandamos a {email.trim()}. Revisa también spam.{" "}
                        <button type="button" onClick={requestCode} disabled={cooldown > 0 || busy} className="text-brand-augusta font-medium hover:underline disabled:opacity-50 disabled:no-underline">
                          {cooldown > 0 ? `Pedir otro en ${cooldown} s` : "Pedir otro código"}
                        </button>
                      </p>
                    </>
                  )}

                  <div className="space-y-3 mt-5">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                      <span className="text-xs text-muted-foreground leading-relaxed">
                        <span className="text-foreground font-medium">Acepto que se guarde mi recomendación de forma privada</span> y que BuscoUnDoctor use mi correo solo para verificarla.{" "}
                        <Link to="/aviso-de-privacidad" target="_blank" className="underline">Aviso de privacidad</Link>
                      </span>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <Checkbox checked={marketing} onCheckedChange={(v) => setMarketing(v === true)} className="mt-0.5" />
                      <span className="text-xs text-muted-foreground leading-relaxed">
                        <span className="text-foreground font-medium">Quiero recibir novedades de BuscoUnDoctor por correo.</span> Puedo darme de baja cuando quiera. (Opcional)
                      </span>
                    </label>
                  </div>

                  <Button type="button" onClick={submit} disabled={code.length !== 6 || !consent || busy || !!nameProblem}
                    className="w-full mt-5 h-12 rounded-xl bg-brand-augusta hover:bg-brand-augusta/90 text-white font-semibold">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar recomendación"}
                  </Button>
                </>
              )}

              {error && <p role="alert" className="text-sm text-destructive mt-3">{error}</p>}

              <button type="button" onClick={() => setStep(2)} className="mt-4 text-sm text-muted-foreground hover:underline inline-flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Volver
              </button>
            </div>
          )}

          {/* ---------- GRACIAS ---------- */}
          {step === 4 && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-brand-augustaLight text-brand-augusta flex items-center justify-center mx-auto"><CheckCircle2 className="w-8 h-8" /></div>
              <h2 className="font-heading font-bold text-xl text-foreground mt-4">¡Gracias por recomendar{she ? "la" : "lo"}!</h2>
              <p className="text-sm text-muted-foreground mt-2">Tu recomendación quedó en revisión. Tu apellido y tu correo nunca se muestran.</p>
              <Button type="button" onClick={reset} className="w-full mt-6 h-12 rounded-xl bg-brand-augusta hover:bg-brand-augusta/90 text-white font-semibold">Recomendar a otro doctor</Button>
              <Button asChild variant="outline" className="w-full mt-3 h-12 rounded-xl gap-2">
                <a href={shareHref} target="_blank" rel="noopener noreferrer"><Share2 className="w-4 h-4" /> Compartir con un amigo</a>
              </Button>
            </div>
          )}

          {step === 1 && error && <p role="alert" className="text-sm text-destructive mt-3">{error}</p>}
        </div>

        {/* En los pasos 1 y 4 este aviso ya sale en el pie de la landing (no se repite). */}
        {!(step === 1 || step === 4) && (
          <p className="text-center text-xs text-white/60 mt-5 px-4">
            Las recomendaciones son opiniones de usuarios, no de BuscoUnDoctor. ¿Algún problema?{" "}
            <Link to="/contacto" className="underline">Escríbenos</Link>
          </p>
        )}
      </main>
      </div>

      {/* Landing: debajo del formulario, solo al inicio y al terminar (durante los pasos 2 y 3 no distrae). */}
      {(step === 1 || step === 4) && <RecommendationsLanding data={landing} onRecommend={(slug) => { trackEvent("rec_desde_tarjeta"); startWithSlug(slug); }} />}

      {/* Botón flotante del celular: baja con la persona y la regresa al formulario. */}
      {(step === 1 || step === 4) && showFab && (
        <div className="sm:hidden fixed bottom-4 inset-x-4 z-40">
          <button type="button"
            onClick={() => { if (step === 4) reset(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="w-full h-12 rounded-full bg-brand-augusta hover:bg-brand-augustaDark text-white font-semibold shadow-lg flex items-center justify-center gap-2 transition-colors">
            <Heart className="w-4 h-4 fill-current" aria-hidden="true" /> {step === 4 ? "Recomendar a otro doctor" : "Recomendar a mi doctor"}
          </button>
        </div>
      )}
    </div>
  );
}
