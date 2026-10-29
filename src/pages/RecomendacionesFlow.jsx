import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Loader2, ArrowLeft, CheckCircle2, MapPin, Share2, X, PenLine, Heart, ChevronDown, Check } from "lucide-react";
import { formErrorMessage } from "@/lib/formErrors";
import RecommendationsLanding, { useLandingData } from "@/components/RecommendationsLandingFlow";
import { TOP_SPECIALTY_SLUGS } from "@/lib/topSpecialties";
import { specialtyLabel as aliasLabel } from "@/lib/specialtyAliases";
import { trackEvent, trackTag } from "@/lib/trackEvent";
import FlowNav from "@/components/FlowNav";
import useBodyScrollLock from "@/hooks/useBodyScrollLock";
import { RECOMMENDATION_SECTIONS, MAX_TAGS_FLOW as MAX_TAGS } from "@/lib/recommendationTags";

// TERCERA versión de prueba, en /recomendaciones-flow (2026-10-29, pedido de David): parte de la copia
// /recomendaciones-nueva con un estilo "flow" inspirado en oasishealth.app: un solo degradado que fluye de
// sección en sección sin cortes (cada sección empieza en el color en que terminó la anterior; tokens
// brand.flow* en tailwind.config.js), menú píldora de vidrio, títulos en peso medio y tarjetas translúcidas.
// Usa su propia parte de abajo (RecommendationsLandingFlow.jsx).
//
// (Origen) COPIA de prueba de /recomendaciones, en /recomendaciones-nueva, para rediseñarla sin tocar la
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

// v2 (2026-10-29, solo esta página): el paciente da nombre y apellido y acepta que se publiquen con su
// recomendación (o solo el nombre si marca "No mostrar mi apellido").
const CONSENT_VERSION = "v2";

// Nombre y apellido(s) de quien recomienda: letras, hasta 4 palabras separadas por espacio o guion. Si lo
// escribieron todo en minúsculas o todo en mayúsculas se pone con mayúscula inicial ("maría lópez" → "María
// López", con "de/del/la/las/los/y" en minúscula salvo al inicio); si no, se respeta ("María de la Garza").
// La base de datos aplica la misma regla.
const PERSON_NAME_RE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+){0,3}$/;
const NAME_PARTICLES = new Set(["de", "del", "la", "las", "los", "y"]);
const tidyName = (s) => {
  const t = s.replace(/\s+/g, " ").trim();
  if (t !== t.toLowerCase() && t !== t.toUpperCase()) return t;
  return t.toLowerCase().split(" ").map((w, i) => (i > 0 && NAME_PARTICLES.has(w) ? w
    : w.replace(/(^|-)(\p{L})/gu, (m, sep, ch) => sep + ch.toUpperCase()))).join(" ");
};
const PAGE_URL = "https://buscoundoctor.com/recomendaciones";
const isFemale = (name) => /^\s*(dra|doctora)\b/i.test(name || "");

// Título del hero: cada palabra entra HERO_WORD_STEP ms después de la anterior y tarda HERO_WORD_MS
// (index.css: hero-word); luego las burbujas de ciudades. HERO_TITLE_MS = cuándo terminó de entrar la última palabra.
const HERO_WORDS = [{ w: "Doctores" }, { w: "Recomendados", accent: true }];
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

export default function RecomendacionesFlow() {
  const [step, setStep] = useState(1); // 1 doctor | 2 recomendación | 3 verificar | 4 gracias
  const [target, setTarget] = useState(null); // { mode: "existing", kind, id, full_name, specialty, zone } | { mode: "new", ... }
  const [tags, setTags] = useState([]);
  const [openSection, setOpenSection] = useState(null); // tema abierto en "¿Qué destacas?"
  const [message, setMessage] = useState("");
  // Nombre y apellido(s), obligatorios (2026-10-29, pedido de David: dan confianza y el equipo tiene el dato).
  // Se publican con la recomendación; con "No mostrar mi apellido" solo se ve el nombre (el equipo sí lo ve completo).
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [hideLastName, setHideLastName] = useState(false);
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
  const [searchOpen, setSearchOpen] = useState(false); // buscador de doctores de la lupa (celular)
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
  useEffect(() => { trackTag("landing", "recomendaciones-flow"); }, []);
  useEffect(() => { trackEvent(step === 4 ? "rec_enviada" : `rec_paso_${step}`); }, [step]);

  // Botón flotante (solo celular): aparece al bajar por la landing y regresa al formulario.
  const [showFab, setShowFab] = useState(false);
  const landing = useLandingData(); // doctores y comentarios de la landing (también alimentan la columna de la derecha en escritorio)
  // Si se llega con un ancla (#doctores, #especialidades…) desde otra página, baja a esa sección cuando ya cargó.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash || !landing) return undefined;
    const t = setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    return () => clearTimeout(t);
  }, [landing]);
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

  const firstNameClean = tidyName(firstName);
  const lastNameClean = tidyName(lastName);
  const badName = (v) => v && (v.length < 2 || !PERSON_NAME_RE.test(v));
  const nameProblem = badName(firstNameClean) ? "Escribe tu nombre solo con letras, sin números ni símbolos."
    : badName(lastNameClean) ? "Escribe tu apellido solo con letras, sin números ni símbolos." : "";
  const nameMissing = !firstNameClean || !lastNameClean;
  const shownName = hideLastName ? firstNameClean : `${firstNameClean} ${lastNameClean}`.trim();
  const commentClean = comment.replace(/\s+/g, " ").trim();
  const commentProblem = !commentClean ? ""
    : commentClean.length < 20 ? "Escribe al menos 20 letras, o deja el comentario vacío."
    : /(https?:|www\.|@|\.com|\.mx|\.net|\.org)/i.test(commentClean) || commentClean.replace(/\D/g, "").length >= 7 ? "Sin enlaces, correos ni teléfonos, por favor."
    : "";

  // "¿Qué destacas?": un renglón por tema (El doctor, El consultorio, Tiempo…) que se abre y deja marcar
  // varias opciones de ese tema (2026-10-29, pedido de David). En total, hasta MAX_TAGS (el servidor
  // también lo exige; no pide una por tema).
  const toggleTag = (v) => setTags((cur) =>
    cur.includes(v) ? cur.filter((t) => t !== v) : cur.length >= MAX_TAGS ? cur : [...cur, v]);

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
    if (!codeSent || code.length !== 6 || !consent || busy || nameMissing || nameProblem) return;
    setBusy(true); setError("");
    const dest = target.mode === "new"
      ? { new: { full_name: target.full_name, specialty: target.specialty, zone: target.zone || null, hospital: target.hospital || null, license_number: target.license_number || null, contact_phone: target.contact_phone || null, subspecialty: target.subspecialty || null } }
      : target.kind === "suggestion" ? { suggestion_id: target.id } : { specialist_id: target.id };
    try {
      const { data } = await base44.functions.invoke("submitRecommendation", {
        email: email.trim(), code, target: dest, tags, message: message.trim() || null, comment: commentClean || null,
        first_name: firstNameClean, last_name: lastNameClean, show_last_name: !hideLastName,
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

  // Botón del hero: abre "Escribir su nombre" (campos del doctor) y baja al formulario.
  const openAddDoctor = () => {
    trackEvent("rec_escribir_nombre");
    setAdding(true);
    requestAnimationFrame(() => document.getElementById("formulario")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const reset = () => {
    setStep(1); setTarget(null); setTags([]); setOpenSection(null); setMessage(""); setComment(""); setShowPrivate(false);
    // Si ya confirmó su correo, conserva correo, código, nombre y aceptación: puede recomendar a todos sus doctores sin repetir nada.
    if (!verified) { setFirstName(""); setLastName(""); setHideLastName(false); setCode(""); setCodeSent(false); setConsent(false); setMarketing(false); }
    setQuery(""); setResults(null); setAdding(false);
    setNewDoc({ title: "", full_name: "", specialty: "", zone: "", hospital: "", license_number: "", contact_phone: "", subspecialty: "" }); setError(""); setShowOtherSpecialties(false);
  };

  const shareHref = `https://wa.me/?text=${encodeURIComponent(`Acabo de recomendar a mi doctor en BuscoUnDoctor. Tú también puedes recomendar al tuyo, toma un minuto: ${PAGE_URL}`)}`;

  return (
    // --ring: el anillo de enfoque de los campos (Input/Textarea) en el azul gris de la portada (brand.flowSlate,
    // #4A5B7D en HSL) solo en esta página; el resto del sitio conserva el suyo.
    <div id="top" className="min-h-screen bg-brand-flowMist" style={{ "--ring": "220 26% 39%" }}>
      <FlowNav onSearch={() => setSearchOpen(true)} />
      {/* Portada: del azul pizarra arriba al azul casi blanco abajo (donde empieza la sección de doctores), pasando
          por tonos de azul para que la transición sea lenta y no se vea gris. */}
      <div className="relative bg-[linear-gradient(to_bottom,theme(colors.brand.flowHeroTop)_0%,theme(colors.brand.flowHeroTop)_12%,theme(colors.brand.flowHeroMid)_45%,theme(colors.brand.flowHeroLow)_75%,theme(colors.brand.flowMist)_100%)]">
      <header className={`relative text-white text-center px-5 ${step === 1 ? "pt-28 sm:pt-32 pb-16" : "pt-24 pb-12"}`}>
        {step === 1 && (
          <div className="max-w-xl lg:max-w-3xl mx-auto">
            {/* Texto técnico arriba (mayúsculas monoespaciadas y separadas), título en peso medio que entra palabra
                por palabra (index.css: hero-word), contador de vidrio (en ceros hasta que termina el título) y botones. */}
            <p className="hero-word font-mono text-[10px] sm:text-xs uppercase tracking-[0.18em] sm:tracking-[0.3em] text-white/75">Monterrey · San Pedro Garza García</p>
            <h1 className="mt-4 font-heading font-medium tracking-tight text-[2.6rem] sm:text-[3.4rem] leading-[1.05] lg:whitespace-nowrap">
              {HERO_WORDS.map(({ w, accent }, i) => (
                <span key={w}>{i > 0 && " "}<span className={`hero-word ${accent ? "text-emerald-200" : ""}`} style={{ animationDelay: `${i * HERO_WORD_STEP}ms` }}>{w}</span></span>
              ))}
            </h1>
            {landing !== false && !(landing && landing.doctors.length === 0) && <RecommendationCounter total={landing ? landing.doctors.length : null} />}
            <div className="flex flex-wrap justify-center gap-3 mt-7">
              {/* Abre directo los campos del doctor (especialidad, doctor o doctora, nombre), sin pasar por el buscador. */}
              <button type="button" onClick={openAddDoctor} className="inline-flex items-center justify-center h-12 px-6 rounded-full bg-white text-brand-navy font-semibold shadow-lg shadow-black/10 hover:bg-white/90 transition-colors">
                Recomendar a mi doctor
              </button>
              <a href="#doctores" className="hidden sm:inline-flex items-center justify-center h-12 px-6 rounded-full border border-white/40 bg-white/10 backdrop-blur-sm text-white font-semibold hover:bg-white/20 transition-colors">
                Ver doctores
              </a>
            </div>
          </div>
        )}
        {step === 2 && target && (
          <div className="max-w-xl mx-auto mt-5">
            <p className="font-heading font-medium tracking-tight text-2xl">{targetName}</p>
            <p className="text-white/75 text-sm mt-0.5">{[specialtyLabel(target.specialty), target.subspecialty, target.zone].filter(Boolean).join(" · ")}</p>
          </div>
        )}
        {step === 3 && (
          <div className="max-w-xl mx-auto mt-5">
            <p className="font-heading font-medium tracking-tight text-2xl">Último paso</p>
            <p className="text-white/75 text-sm mt-0.5">Confirma que eres tú</p>
          </div>
        )}
      </header>

      {/* En celular, la caja del formulario solo aparece cuando ya se están llenando datos (escribir un doctor, paso 2
          en adelante); para buscar un doctor está la lupa del menú. Desde tableta se ve siempre. */}
      <main id="formulario" className={`relative z-10 max-w-lg mx-auto px-4 pb-16 scroll-mt-24 ${step === 1 && !adding ? "hidden sm:block" : ""}`}>
        {/* El formulario es la pieza central de la portada: tarjeta blanca sólida (para leerse perfecto) que flota. */}
        <div className="bg-white rounded-[2rem] border border-white/60 shadow-2xl shadow-brand-navy/20 p-5 sm:p-7">
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
                <span key={n} className={`flex-1 h-1.5 rounded-full ${n <= step ? "bg-brand-flowSlate" : "bg-border"}`} />
              ))}
            </div>
          )}

          {/* ---------- PASO 1: el doctor ---------- */}
          {step === 1 && (
            <div>
              {/* En el formulario de "escribir su nombre" no va este título: ahí solo se pregunta lo que sigue. */}
              {!(adding && !target) && <h2 className="font-heading font-semibold text-lg text-foreground mb-3">¿A quién quieres recomendar?</h2>}

              {target ? (
                <div className="rounded-2xl border border-brand-flowSlate bg-brand-flowMist p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-brand-flowDeep">{target.full_name}</p>
                    <p className="text-sm text-brand-flowDeep/80">{[specialtyLabel(target.specialty), target.subspecialty, target.zone].filter(Boolean).join(" · ")}</p>
                  </div>
                  <button type="button" onClick={() => setTarget(null)} aria-label="Cambiar de doctor" className="p-1 text-brand-flowDeep/70 hover:text-brand-flowDeep"><X className="w-4 h-4" /></button>
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
                              <button type="button" onClick={() => pickExisting(r)} className="w-full text-left rounded-xl border border-border/60 hover:border-brand-flowSlate/50 px-4 py-3 transition-colors">
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
                              <button type="button" onClick={startAdding} className="font-semibold text-brand-flowSlate hover:underline">Sé el primero en recomendarlo</button>
                            </p>
                          );
                        }
                        return (
                          <div className="mt-4 rounded-2xl p-4 border-2 border-brand-flowSlate bg-brand-flowMist">
                            <p className="text-sm font-semibold text-brand-flowDeep">No lo vemos en la lista. Sé el primero en recomendarlo.</p>
                            <button type="button" onClick={startAdding}
                              className="mt-3 w-full h-12 rounded-xl bg-brand-flowSlate hover:bg-brand-flowDeep text-white font-semibold flex items-center justify-center gap-2 transition-colors">
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
                          const chip = (on) => `px-3.5 h-10 rounded-full border text-sm font-medium transition-colors ${on ? "border-brand-flowSlate bg-brand-flowMist text-brand-flowDeep" : "border-input bg-background text-foreground hover:border-brand-flowSlate/50"}`;
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
                              className={`h-11 rounded-xl border text-sm font-medium transition-colors ${newDoc.title === t ? "border-brand-flowSlate bg-brand-flowMist text-brand-flowDeep" : "border-input bg-background text-foreground hover:border-brand-flowSlate/50"}`}>
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
                          <div className="mt-2 rounded-xl border border-brand-flowSlate/40 bg-brand-flowMist/40 p-2">
                            <p className="text-xs font-medium text-brand-flowDeep px-2 pt-1 pb-1.5">¿Es alguno de estos? Toca para elegirlo.</p>
                            <ul className="space-y-1.5">
                              {similar.map((r) => (
                                <li key={`${r.kind}-${r.id}`}>
                                  <button type="button" onClick={() => pickExisting(r)} className="w-full text-left rounded-lg bg-white border border-border/60 hover:border-brand-flowSlate/60 px-3 py-2.5 transition-colors">
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
                  className="w-full mt-6 h-12 rounded-xl bg-brand-flowSlate hover:bg-brand-flowSlate/90 text-white font-semibold">
                  Siguiente
                </Button>
              )}
            </div>
          )}

          {/* ---------- PASO 2: la recomendación ---------- */}
          {step === 2 && (
            <div>
              <div className="rounded-2xl border-2 border-brand-flowSlate bg-brand-flowMist text-brand-flowDeep text-center font-heading font-semibold text-lg py-4 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Sí, {she ? "la" : "lo"} recomiendo
              </div>

              <div className="flex items-baseline justify-between gap-3 mt-5">
                <p className="text-sm font-medium text-foreground">¿Qué destacas? <span className="text-muted-foreground font-normal">(opcional)</span></p>
                {tags.length > 0 && <span className="text-xs font-medium text-brand-flowDeep flex-shrink-0">{tags.length} de {MAX_TAGS}</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">Elige las que quieras de cada tema, hasta {MAX_TAGS} en total: lo que más destaca {she ? "de ella" : "de él"}.</p>
              <div className="space-y-2">
                {RECOMMENDATION_SECTIONS.map((sec) => {
                  const picked = sec.tags.filter((t) => tags.includes(t.v));
                  const open = openSection === sec.key;
                  return (
                    <div key={sec.key} className={`rounded-xl border transition-colors ${picked.length ? "border-brand-flowSlate bg-brand-flowMist" : "border-input bg-background"}`}>
                      <button type="button" onClick={() => setOpenSection(open ? null : sec.key)} aria-expanded={open}
                        className="w-full min-h-12 px-3.5 py-2 flex items-center gap-2 text-left">
                        <span className="flex-1 min-w-0">
                          <span className={`block text-sm font-medium ${picked.length ? "text-brand-flowDeep" : "text-foreground"}`}>{sec.label}</span>
                          <span className="block text-xs text-muted-foreground truncate">
                            {picked.length ? picked.map((t) => t.label).join(", ") : "Elige una o varias"}
                          </span>
                        </span>
                        {picked.length > 0 && (
                          <span className="flex-shrink-0 min-w-6 h-6 px-1.5 rounded-full bg-brand-flowSlate text-white text-xs font-semibold inline-flex items-center justify-center">{picked.length}</span>
                        )}
                        <ChevronDown className={`w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
                      </button>
                      {open && (
                        <div className="px-3 pb-3 flex flex-wrap gap-2">
                          {sec.tags.map((t) => {
                            const on = tags.includes(t.v);
                            return (
                              <button key={t.v} type="button" onClick={() => toggleTag(t.v)} disabled={!on && tags.length >= MAX_TAGS} aria-pressed={on}
                                className={`inline-flex items-center gap-1.5 min-h-10 px-3.5 py-2 rounded-full border text-sm transition-colors disabled:opacity-40 ${on ? "bg-brand-flowSlate border-brand-flowSlate text-white" : "bg-white border-input text-foreground hover:border-brand-flowSlate"}`}>
                                {on && <Check className="w-3.5 h-3.5" aria-hidden="true" />}{t.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {tags.length >= MAX_TAGS && (
                <p className="text-xs text-brand-flowDeep mt-2">Ya elegiste {MAX_TAGS}. Quita una para cambiarla.</p>
              )}

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
                <Button type="button" onClick={() => setStep(3)} disabled={!!commentProblem} className="flex-1 h-12 rounded-xl bg-brand-flowSlate hover:bg-brand-flowSlate/90 text-white font-semibold">Siguiente</Button>
              </div>
            </div>
          )}

          {/* ---------- PASO 3: verificar y enviar ---------- */}
          {step === 3 && (
            <div>
              <h2 className="font-heading font-semibold text-lg text-foreground mb-4">¿Quién {she ? "la" : "lo"} recomienda?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rec-nombre" className="text-sm font-medium text-foreground mb-1.5 block">Nombre</label>
                  <Input id="rec-nombre" value={firstName} onChange={(e) => setFirstName(e.target.value.slice(0, 40))} placeholder="Ej. María" className="h-12 rounded-xl" autoComplete="given-name" />
                </div>
                <div>
                  <label htmlFor="rec-apellido" className="text-sm font-medium text-foreground mb-1.5 block">Apellido(s)</label>
                  <Input id="rec-apellido" value={lastName} onChange={(e) => setLastName(e.target.value.slice(0, 40))} placeholder="Ej. López" className="h-12 rounded-xl" autoComplete="family-name" />
                </div>
              </div>
              {nameProblem ? (
                <p className="text-xs text-red-600 mt-1.5">{nameProblem}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1.5">
                  {firstNameClean && lastNameClean
                    ? <>Se verá así junto a tu recomendación: <span className="font-semibold text-brand-flowDeep">{shownName}</span></>
                    : "Se muestra junto a tu recomendación para dar confianza. Tu correo nunca se muestra."}
                </p>
              )}
              <label className="flex items-start gap-2.5 cursor-pointer mt-3 mb-5">
                <Checkbox checked={hideLastName} onCheckedChange={(v) => setHideLastName(v === true)} className="mt-0.5" />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  <span className="text-foreground font-medium">No mostrar mi apellido</span>
                  <span className="block">Solo se verá tu nombre. Útil si prefieres que no se sepa que consultas con {she ? "esta doctora" : "este doctor"}.</span>
                </span>
              </label>

              <label className="text-sm font-medium text-foreground mb-1.5 block">Tu correo electrónico</label>
              <div className="flex gap-2">
                <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (codeSent) { setCodeSent(false); setCode(""); setVerified(false); } }}
                  placeholder="tucorreo@ejemplo.com" className="h-12 rounded-xl flex-1" autoComplete="email" />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Solo lo usamos para confirmar que eres una persona real. No se muestra.</p>

              {!codeSent ? (
                <Button type="button" onClick={requestCode} disabled={!emailValid || busy}
                  className="w-full mt-4 h-12 rounded-xl bg-brand-flowSlate hover:bg-brand-flowSlate/90 text-white font-semibold">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar mi correo"}
                </Button>
              ) : (
                <>
                  {verified ? (
                    <p className="mt-5 flex items-start gap-2 rounded-xl bg-brand-flowMist text-brand-flowDeep text-sm px-3.5 py-3">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" /> Ya confirmaste tu correo. Solo toca "Enviar recomendación".
                    </p>
                  ) : (
                    <>
                      <label className="text-sm font-medium text-foreground mt-5 mb-1.5 block">Código de 6 números</label>
                      <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code"
                        placeholder="000000" className="h-12 rounded-xl text-center text-xl tracking-[0.5em] font-semibold" />
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Te lo mandamos a {email.trim()}. Revisa también spam.{" "}
                        <button type="button" onClick={requestCode} disabled={cooldown > 0 || busy} className="text-brand-flowSlate font-medium hover:underline disabled:opacity-50 disabled:no-underline">
                          {cooldown > 0 ? `Pedir otro en ${cooldown} s` : "Pedir otro código"}
                        </button>
                      </p>
                    </>
                  )}

                  <div className="space-y-3 mt-5">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                      <span className="text-xs text-muted-foreground leading-relaxed">
                        <span className="text-foreground font-medium">Acepto que se publique mi recomendación con mi {hideLastName ? "nombre" : "nombre y apellido"}</span> y que BuscoUnDoctor use mi correo solo para verificarla.{" "}
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

                  <Button type="button" onClick={submit} disabled={code.length !== 6 || !consent || busy || nameMissing || !!nameProblem}
                    className="w-full mt-5 h-12 rounded-xl bg-brand-flowSlate hover:bg-brand-flowSlate/90 text-white font-semibold">
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
              <div className="w-14 h-14 rounded-full bg-brand-flowMist text-brand-flowSlate flex items-center justify-center mx-auto"><CheckCircle2 className="w-8 h-8" /></div>
              <h2 className="font-heading font-bold text-xl text-foreground mt-4">¡Gracias por recomendar{she ? "la" : "lo"}!</h2>
              <p className="text-sm text-muted-foreground mt-2">Tu recomendación quedó en revisión. {hideLastName ? "Tu apellido y tu correo no se muestran." : "Tu correo nunca se muestra."}</p>
              <Button type="button" onClick={reset} className="w-full mt-6 h-12 rounded-xl bg-brand-flowSlate hover:bg-brand-flowSlate/90 text-white font-semibold">Recomendar a otro doctor</Button>
              <Button asChild variant="outline" className="w-full mt-3 h-12 rounded-xl gap-2">
                <a href={shareHref} target="_blank" rel="noopener noreferrer"><Share2 className="w-4 h-4" /> Compartir con un amigo</a>
              </Button>
            </div>
          )}

          {step === 1 && error && <p role="alert" className="text-sm text-destructive mt-3">{error}</p>}
        </div>

        {/* En los pasos 1 y 4 este aviso ya sale en el pie de la landing (no se repite). */}
        {!(step === 1 || step === 4) && (
          <p className="text-center text-xs text-brand-navy/60 mt-5 px-4">
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
            onClick={() => { if (step === 4) reset(); openAddDoctor(); }}
            className="w-full h-12 rounded-full bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold shadow-lg shadow-brand-navy/30 flex items-center justify-center gap-2 transition-colors">
            <Heart className="w-4 h-4 fill-current" aria-hidden="true" /> {step === 4 ? "Recomendar a otro doctor" : "Recomendar a mi doctor"}
          </button>
        </div>
      )}

      {/* Buscador de doctores de la lupa del menú (celular) */}
      {searchOpen && (
        <DoctorSearchSheet
          onClose={() => setSearchOpen(false)}
          onRecommend={(r) => { setSearchOpen(false); pickExisting(r); }}
          onAddNew={() => { setSearchOpen(false); openAddDoctor(); }}
        />
      )}
    </div>
  );
}

// Buscador de doctores (la lupa del menú en celular): misma búsqueda que el formulario (doctores publicados y
// propuestas ya aprobadas, tolera faltas de ortografía). Tocar un resultado abre su página; "Recomendar" lo elige
// y pasa al paso 2; si no aparece, "Recomiéndalo" abre los campos para escribirlo.
function DoctorSearchSheet({ onClose, onRecommend, onAddNew }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null); // null = aún no busca
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  useBodyScrollLock(true);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 3) { setResults(null); setBusy(false); return undefined; }
    const mine = ++seq.current;
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await base44.functions.invoke("searchRecommendableDoctors", { query });
        if (mine === seq.current) setResults(Array.isArray(data) ? data : []);
      } catch {
        if (mine === seq.current) setResults([]);
      }
      if (mine === seq.current) setBusy(false);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const pageOf = (r) => (r.slug ? (r.kind === "specialist" ? `/especialista/${r.slug}` : `/recomendado-flow/${r.slug}`) : null);

  return (
    <div className="fixed inset-0 z-[60] bg-brand-navy/50 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Buscar un doctor">
      <div className="mx-3 mt-3 rounded-3xl bg-white shadow-2xl p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca a un doctor por su nombre" className="h-12 rounded-full pl-10 pr-10" />
            {busy && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2" />}
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="w-10 h-10 rounded-full flex items-center justify-center text-brand-navy hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>

        {results === null ? (
          <p className="text-sm text-muted-foreground px-1 pt-3">Escribe al menos 3 letras del nombre.</p>
        ) : results.length === 0 && !busy ? (
          <p className="text-sm text-brand-navy px-1 pt-3">No lo encontramos.</p>
        ) : (
          <ul className="mt-3 max-h-[60vh] overflow-y-auto space-y-2">
            {results.map((r) => {
              const to = pageOf(r);
              const info = (
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-brand-navy break-words">{r.full_name}</span>
                  <span className="block text-xs text-muted-foreground">{[aliasLabel(r.specialty), r.zone].filter(Boolean).join(" · ")}</span>
                </span>
              );
              return (
                <li key={`${r.kind}-${r.id}`} className="flex items-center gap-2 rounded-2xl border border-border/60 pl-4 pr-2 py-2.5">
                  {to ? <Link to={to} onClick={onClose} className="min-w-0 flex-1 flex">{info}</Link> : info}
                  <button type="button" onClick={() => onRecommend(r)} className="flex-shrink-0 h-9 px-3 rounded-full bg-brand-navy text-white text-xs font-semibold">Recomendar</button>
                </li>
              );
            })}
          </ul>
        )}

        {results !== null && !busy && (
          <button type="button" onClick={onAddNew} className="mt-3 w-full rounded-2xl bg-brand-flowMist px-4 py-3 text-left text-sm text-brand-navy">
            ¿No lo encuentras? <span className="font-semibold underline">Recomiéndalo tú</span>
          </button>
        )}
      </div>
    </div>
  );
}
