import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Loader2, ArrowLeft, CheckCircle2, MapPin, Share2, X } from "lucide-react";
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

export default function Recomendaciones() {
  const [step, setStep] = useState(1); // 1 doctor | 2 recomendación | 3 verificar | 4 gracias
  const [target, setTarget] = useState(null); // { mode: "existing", kind, id, full_name, specialty, zone } | { mode: "new", ... }
  const [tags, setTags] = useState([]);
  const [message, setMessage] = useState("");
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
  const [newDoc, setNewDoc] = useState({ full_name: "", specialty: "", zone: "", hospital: "", license_number: "" });
  const [specialties, setSpecialties] = useState([]);
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
      .then(({ data }) => {
        if (active && data?.ok && data.id) {
          setTarget({ mode: "existing", kind: "suggestion", id: data.id, full_name: data.full_name, specialty: data.specialty, zone: data.zone });
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

  const targetName = target?.full_name || "";
  const she = isFemale(targetName);
  const newDocValid = newDoc.full_name.trim().length >= 5 && !!newDoc.specialty;
  const emailValid = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(email.trim());

  const pickExisting = (r) => {
    setTarget({ mode: "existing", kind: r.kind, id: r.id, full_name: r.full_name, specialty: r.specialty, zone: r.zone });
    setAdding(false);
    setError("");
  };
  const confirmNew = () => {
    if (!newDocValid) return;
    setTarget({ mode: "new", ...newDoc, full_name: newDoc.full_name.trim() });
    setError("");
  };
  const specialtyLabel = (name) => specialties.find((s) => s.name === name)?.display_name || name;

  const commentClean = comment.replace(/\s+/g, " ").trim();
  const commentProblem = !commentClean ? ""
    : commentClean.length < 20 ? "Escribe al menos 20 letras, o deja el comentario vacío."
    : /(https?:|www\.|@|\.com|\.mx|\.net|\.org)/i.test(commentClean) || commentClean.replace(/\D/g, "").length >= 7 ? "Sin enlaces, correos ni teléfonos, por favor."
    : "";

  // "¿Qué destacas?": MAX_TAGS selectores que se despliegan; en cada uno se puede escoger cualquier opción de
// cualquier sección (agrupadas dentro del selector). Una opción ya elegida no se repite en los demás.
  const setSlot = (i, v) => setTags((cur) => {
    const slots = Array.from({ length: MAX_TAGS }, (_, k) => cur[k] || "");
    slots[i] = v;
    return slots.filter(Boolean);
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
        email: email.trim(), code, target: dest, tags, message: message.trim() || null, comment: commentClean || null,
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
    setStep(1); setTarget(null); setTags([]); setMessage(""); setComment(""); setShowPrivate(false); setCode(""); setCodeSent(false);
    setConsent(false); setMarketing(false); setQuery(""); setResults(null); setAdding(false);
    setNewDoc({ full_name: "", specialty: "", zone: "", hospital: "", license_number: "" }); setError("");
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
              Ayuda a otros pacientes a encontrar buen trato. Toma un minuto y tu nombre nunca se muestra.
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
                      {results && results.length === 0 && !searching && (
                        <p className="text-sm text-muted-foreground mt-3">No lo tenemos todavía.</p>
                      )}
                      <button type="button" onClick={() => { setAdding(true); setNewDoc((d) => ({ ...d, full_name: d.full_name || query.trim() })); }}
                        className="mt-4 text-sm font-medium text-brand-augusta hover:underline">
                        ¿No aparece? Agrégalo
                      </button>
                    </>
                  )}

                  {adding && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">Nombre completo del doctor</label>
                        <Input value={newDoc.full_name} onChange={(e) => setNewDoc({ ...newDoc, full_name: e.target.value })} placeholder="Ej. Dra. Ana Pérez López" className="h-11 rounded-xl" maxLength={120} />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">Especialidad</label>
                        <select value={newDoc.specialty} onChange={(e) => setNewDoc({ ...newDoc, specialty: e.target.value })} className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm">
                          <option value="">Elige una especialidad</option>
                          {specialties.map((s) => <option key={s.id} value={s.name}>{s.display_name || s.name}</option>)}
                        </select>
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
                          <label className="text-sm font-medium text-foreground mb-1 block">Hospital <span className="text-muted-foreground font-normal">(opcional)</span></label>
                          <Input value={newDoc.hospital} onChange={(e) => setNewDoc({ ...newDoc, hospital: e.target.value })} placeholder="Ej. Hospital Zambrano" className="h-11 rounded-xl" maxLength={120} />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">Cédula profesional <span className="text-muted-foreground font-normal">(opcional)</span></label>
                        <Input value={newDoc.license_number} onChange={(e) => setNewDoc({ ...newDoc, license_number: e.target.value })} placeholder="Si la sabes, nos ayuda a verificarlo" className="h-11 rounded-xl" maxLength={20} />
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
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">Elige hasta {MAX_TAGS} cosas: lo que más destaca {she ? "de ella" : "de él"}.</p>
              <div className="space-y-2">
                {Array.from({ length: MAX_TAGS }, (_, i) => (
                  <select
                    key={i}
                    value={tags[i] || ""}
                    onChange={(e) => setSlot(i, e.target.value)}
                    aria-label={`Qué destaca, opción ${i + 1}`}
                    className={`w-full h-12 px-3.5 rounded-xl border text-sm bg-background ${tags[i] ? "border-brand-augusta bg-brand-augustaLight text-brand-augustaDark font-medium" : "border-input text-muted-foreground"}`}
                  >
                    <option value="">{`Opción ${i + 1}: elige una`}</option>
                    {RECOMMENDATION_SECTIONS.map((sec) => (
                      <optgroup key={sec.key} label={sec.label}>
                        {sec.tags.map((t) => (
                          <option key={t.v} value={t.v} disabled={tags.includes(t.v) && tags[i] !== t.v}>{t.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                ))}
              </div>

              <p className="text-sm font-medium text-foreground mt-6 mb-1.5">Cuéntanos qué hace {she ? "a esta doctora" : "a este doctor"} excelente <span className="text-muted-foreground font-normal">(opcional)</span></p>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value.slice(0, 160))} rows={3} placeholder="Ej. Me explicó todo con calma y siempre contestó mis dudas."
                className="rounded-xl resize-none" />
              <div className="flex items-start justify-between gap-3 mt-1.5">
                <p className={`text-xs ${commentProblem ? "text-red-600" : "text-muted-foreground"}`}>
                  {commentProblem || "Habla de su trato, cómo explica, el consultorio o la atención. Sin tu enfermedad ni nombres de otras personas. Se publica sin tu nombre, después de que lo revisemos."}
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
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="h-12 rounded-xl px-4"><ArrowLeft className="w-4 h-4" /></Button>
                <Button type="button" onClick={() => setStep(3)} disabled={!!commentProblem} className="flex-1 h-12 rounded-xl bg-brand-augusta hover:bg-brand-augusta/90 text-white font-semibold">Siguiente</Button>
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
              <p className="text-sm text-muted-foreground mt-2">Tu recomendación quedó en revisión. Tu nombre nunca se muestra.</p>
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
