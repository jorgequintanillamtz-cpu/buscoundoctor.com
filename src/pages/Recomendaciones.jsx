import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Loader2, ArrowLeft, CheckCircle2, MapPin, Share2, X, UserPlus } from "lucide-react";
import { formErrorMessage } from "@/lib/formErrors";
import { RECOMMENDATION_SECTIONS, MAX_TAGS } from "@/lib/recommendationTags";

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

// Las 10 especialidades que se muestran primero al agregar un doctor (por slug del catálogo, en este orden).
// El resto sale al elegir "Otra especialidad". Para cambiarlas, edita esta lista.
const TOP_SPECIALTY_SLUGS = [
  "medicina-general", "ginecologia", "pediatria", "dentista", "dermatologia",
  "cardiologia", "ortopedia-y-traumatologia", "oftalmologia", "psicologia", "nutricion",
];

export default function Recomendaciones() {
  const [step, setStep] = useState(1); // 1 doctor | 2 recomendación | 3 verificar | 4 gracias
  const [target, setTarget] = useState(null); // { mode: "existing", kind, id, full_name, specialty, zone } | { mode: "new", ... }
  const [tags, setTags] = useState([]);
  const [message, setMessage] = useState("");
  const [firstName, setFirstName] = useState(""); // primer nombre opcional: si se escribe, se muestra junto a la recomendación
  const [comment, setComment] = useState(""); // comentario público corto (lo revisa el equipo; sin nombre)
  const [showPrivate, setShowPrivate] = useState(false);
  const [email, setEmail] = useState("");
  const [codeSent, setCodeSent] = useState(false);
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
  const [newDoc, setNewDoc] = useState({ title: "", full_name: "", specialty: "", zone: "", hospital: "", license_number: "" }); // title: "Dr." | "Dra."; full_name: solo el nombre
  const [specialties, setSpecialties] = useState([]);
  const [showOtherSpecialties, setShowOtherSpecialties] = useState(false);
  const [zones, setZones] = useState([]);
  const searchSeq = useRef(0);
  const [params] = useSearchParams();

  // Si llegan desde la página de un doctor ("Recomendar a este doctor", /recomendaciones?doctor=su-enlace),
  // el paso 1 ya trae a ese doctor elegido (se puede cambiar con la X). Si el enlace no sirve, todo sigue normal.
  useEffect(() => {
    const slug = params.get("doctor");
    if (!slug) return undefined;
    let active = true;
    base44.functions.invoke("getRecommendedDoctor", { slug })
      .then(async ({ data }) => {
        if (!active) return;
        if (data?.ok && data.id) {
          setTarget({ mode: "existing", kind: "suggestion", id: data.id, full_name: data.full_name, specialty: data.specialty, zone: data.zone });
          return;
        }
        // No es un doctor "recomendado" sin perfil: puede ser un doctor ya registrado y publicado (viene de su perfil).
        const { data: sp } = await base44.functions.invoke("getSpecialistRecommendations", { slug });
        if (active && sp?.ok && sp.id) {
          setTarget({ mode: "existing", kind: "specialist", id: sp.id, full_name: sp.full_name, specialty: sp.specialty, zone: sp.zone });
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.title = "Recomienda a tu doctor | BuscoUnDoctor";
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) { robots = document.createElement("meta"); robots.setAttribute("name", "robots"); document.head.appendChild(robots); }
    robots.setAttribute("content", "noindex, nofollow");
    base44.entities.Specialty.filter({ active: true }).then((l) => setSpecialties([...l].sort((a, b) => (a.display_name || a.name).localeCompare(b.display_name || b.name, "es")))).catch(() => {});
    base44.entities.Zone.filter({ active: true }).then(setZones).catch(() => {});
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
  const newDocValid = !!newDoc.title && newDoc.full_name.trim().length >= 4 && !!newDoc.specialty;
  const emailValid = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(email.trim());

  const pickExisting = (r) => {
    setTarget({ mode: "existing", kind: r.kind, id: r.id, full_name: r.full_name, specialty: r.specialty, zone: r.zone });
    setAdding(false);
    setError("");
  };
  const confirmNew = () => {
    if (!newDocValid) return;
    setTarget({ mode: "new", ...newDoc, full_name: `${newDoc.title} ${newDoc.full_name.trim()}` });
    setError("");
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
      if (data?.ok) { setCodeSent(true); setCode(""); setCooldown(30); }
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
      ? { new: { full_name: target.full_name, specialty: target.specialty, zone: target.zone || null, hospital: target.hospital || null, license_number: target.license_number || null } }
      : target.kind === "suggestion" ? { suggestion_id: target.id } : { specialist_id: target.id };
    try {
      const { data } = await base44.functions.invoke("submitRecommendation", {
        email: email.trim(), code, target: dest, tags, message: message.trim() || null, comment: commentClean || null, name: firstNameClean || null,
        consent: true, marketing, consent_version: CONSENT_VERSION,
      });
      if (data?.ok) { setStep(4); }
      else if (data?.reason === "codigo_incorrecto") {
        const n = data.intentos_restantes;
        setError(`Código incorrecto.${typeof n === "number" ? ` Te quedan ${n} ${n === 1 ? "intento" : "intentos"}.` : ""}`);
      } else setError(REASONS[data?.reason] || "No pudimos guardar tu recomendación. Intenta de nuevo.");
    } catch (e) {
      setError(formErrorMessage(e, "No pudimos guardar tu recomendación. Intenta de nuevo."));
    }
    setBusy(false);
  };

  const reset = () => {
    setStep(1); setTarget(null); setTags([]); setMessage(""); setComment(""); setFirstName(""); setShowPrivate(false); setCode(""); setCodeSent(false);
    setConsent(false); setMarketing(false); setQuery(""); setResults(null); setAdding(false);
    setNewDoc({ title: "", full_name: "", specialty: "", zone: "", hospital: "", license_number: "" }); setError(""); setShowOtherSpecialties(false);
  };

  const shareHref = `https://wa.me/?text=${encodeURIComponent(`Acabo de recomendar a mi doctor en BuscoUnDoctor. Tú también puedes recomendar al tuyo, toma un minuto: ${PAGE_URL}`)}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Portada azul: grande en el paso 1, compacta después para que el formulario quepa en el celular */}
      <header className={`bg-brand-navy text-white text-center px-5 ${step === 1 ? "pt-8 pb-16" : "pt-6 pb-12"}`}>
        <Link to="/" className="inline-block">
          <img src="/logo.webp" alt="BuscoUnDoctor" className="h-8 w-auto brightness-0 invert" />
        </Link>
        {step === 1 && (
          <div className="max-w-xl mx-auto mt-6">
            <h1 className="font-heading font-bold text-3xl sm:text-4xl leading-tight">
              ¿Tu doctor es excelente?{" "}
              <span className="text-emerald-300">Recomiéndalo</span>
            </h1>
            <p className="mt-3 text-white/75 text-sm sm:text-base">
              Ayuda a otros pacientes a encontrar buen trato. Toma un minuto. Tu apellido y tu correo nunca se muestran.
            </p>
          </div>
        )}
        {step === 2 && target && (
          <div className="max-w-xl mx-auto mt-5">
            <p className="font-heading font-bold text-xl">{targetName}</p>
            <p className="text-white/75 text-sm mt-0.5">{[specialtyLabel(target.specialty), target.zone].filter(Boolean).join(" · ")}</p>
          </div>
        )}
        {step === 3 && (
          <div className="max-w-xl mx-auto mt-5">
            <p className="font-heading font-bold text-xl">Último paso</p>
            <p className="text-white/75 text-sm mt-0.5">Confirma que eres tú</p>
          </div>
        )}
      </header>

      <main className="max-w-lg mx-auto px-4 -mt-8 pb-16">
        <div className="bg-card rounded-3xl border border-border/50 shadow-lg p-5 sm:p-7">
          {(step === 2 || step === 3 || (step === 1 && adding && !target)) && (
            <button type="button"
              onClick={() => { if (step === 1) setAdding(false); else setStep(step - 1); setError(""); }}
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
              <h2 className="font-heading font-semibold text-lg text-foreground mb-3">¿A qué doctor quieres recomendar?</h2>

              {target ? (
                <div className="rounded-2xl border border-brand-augusta bg-brand-augustaLight p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-brand-augustaDark">{target.full_name}</p>
                    <p className="text-sm text-brand-augustaDark/80">{[specialtyLabel(target.specialty), target.zone].filter(Boolean).join(" · ")}</p>
                    {target.mode === "new" && <p className="text-xs text-brand-augustaDark/70 mt-1">Doctor nuevo: lo revisamos antes de mostrarlo.</p>}
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
                      {(() => {
                        const noMatch = !!results && results.length === 0 && !searching;
                        return (
                          <div className={`mt-4 rounded-2xl p-4 ${noMatch ? "border-2 border-brand-augusta bg-brand-augustaLight" : "border-2 border-dashed border-brand-augusta/50 bg-brand-augustaLight/40"}`}>
                            <p className={`text-sm ${noMatch ? "font-semibold text-brand-augustaDark" : "text-foreground/80"}`}>
                              {noMatch ? "No lo tenemos todavía. ¡Sé el primero en recomendarlo!" : "¿No encuentras a tu doctor? Aún estamos creciendo: agrégalo tú."}
                            </p>
                            <button type="button" onClick={() => { setAdding(true); setNewDoc((d) => { const t = splitTitle(query); return { ...d, title: d.title || t.title, full_name: d.full_name || t.name }; }); }}
                              className="mt-3 w-full h-12 rounded-xl bg-brand-augusta hover:bg-brand-augustaDark text-white font-semibold flex items-center justify-center gap-2 transition-colors">
                              <UserPlus className="w-5 h-5" /> Agregar a mi doctor
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
                                    {x.display_name || x.name}
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
                                  {others.map((x) => <option key={x.id} value={x.name}>{x.display_name || x.name}</option>)}
                                </select>
                              )}
                            </>
                          );
                        })()}
                      </div>
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
                            <p className="text-xs font-medium text-brand-augustaDark px-2 pt-1 pb-1.5">¿Es alguno de estos? Elígelo para no duplicarlo.</p>
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
                          <label className="text-sm font-medium text-foreground mb-1 block">Zona <span className="text-muted-foreground font-normal">(opcional)</span></label>
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
                      <div className="flex items-center gap-3 pt-1">
                        <Button type="button" onClick={confirmNew} disabled={!newDocValid} className="rounded-xl bg-brand-augusta hover:bg-brand-augusta/90 text-white">Usar este doctor</Button>
                        <button type="button" onClick={() => setAdding(false)} className="text-sm text-muted-foreground hover:underline">Volver a buscar</button>
                      </div>
                    </div>
                  )}
                </>
              )}

              <Button type="button" onClick={() => setStep(2)} disabled={!target}
                className="w-full mt-6 h-12 rounded-xl bg-brand-augusta hover:bg-brand-augusta/90 text-white font-semibold">
                Siguiente
              </Button>
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

              <p className="text-sm font-medium text-foreground mt-5 mb-1.5">Tu primer nombre <span className="text-muted-foreground font-normal">(opcional)</span></p>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value.slice(0, 25))} placeholder="Ej. María" className="h-12 rounded-xl" autoComplete="given-name" />
              <p className={`text-xs mt-1.5 ${nameProblem ? "text-red-600" : "text-muted-foreground"}`}>
                {nameProblem || "Si lo escribes, aparece junto a tu recomendación. Solo tu primer nombre: nunca tu apellido ni tu correo."}
              </p>

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
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="h-12 rounded-xl px-4"><ArrowLeft className="w-4 h-4" /></Button>
                <Button type="button" onClick={() => setStep(3)} disabled={!!commentProblem || !!nameProblem} className="flex-1 h-12 rounded-xl bg-brand-augusta hover:bg-brand-augusta/90 text-white font-semibold">Siguiente</Button>
              </div>
            </div>
          )}

          {/* ---------- PASO 3: verificar y enviar ---------- */}
          {step === 3 && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Tu correo electrónico</label>
              <div className="flex gap-2">
                <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (codeSent) { setCodeSent(false); setCode(""); } }}
                  placeholder="tucorreo@ejemplo.com" className="h-12 rounded-xl flex-1" autoComplete="email" />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Solo lo usamos para confirmar que eres una persona real. No se muestra.</p>

              {!codeSent ? (
                <Button type="button" onClick={requestCode} disabled={!emailValid || busy}
                  className="w-full mt-4 h-12 rounded-xl bg-brand-augusta hover:bg-brand-augusta/90 text-white font-semibold">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviarme el código"}
                </Button>
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

                  <Button type="button" onClick={submit} disabled={code.length !== 6 || !consent || busy}
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

        <p className="text-center text-xs text-muted-foreground mt-5 px-4">
          Las recomendaciones son opiniones de usuarios, no de BuscoUnDoctor. ¿Algún problema?{" "}
          <Link to="/contacto" className="underline">Escríbenos</Link>
        </p>
      </main>
    </div>
  );
}
