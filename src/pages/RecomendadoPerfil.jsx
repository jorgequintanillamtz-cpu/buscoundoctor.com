import { useState, useEffect, useCallback } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Heart, Info, ShieldQuestion, Stethoscope, MapPin, Building2, Share2, PenLine, Phone, Clock, Lock, Eye, Bell, Check, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import LoadingLogo from "@/components/LoadingLogo";
import LoadError from "@/components/LoadError";
import ReportRecommendationDialog from "@/components/ReportRecommendationDialog";
import RecommendedAvatar from "@/components/RecommendedAvatar";
import RecommendationCards, { ReportMenu } from "@/components/RecommendationCards";
import { recommendationTagLabel } from "@/lib/recommendationTags";
import { recordRecommendedViews } from "@/lib/recommendedViews";
import { formErrorMessage } from "@/lib/formErrors";
import { setCanonical, setOpenGraph, buildAbsoluteUrl } from "@/lib/seoMeta";

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

const BARS_FROM = 3; // las etiquetas se dibujan como barras desde 3 recomendaciones (con menos, etiquetas sueltas)
const INTEREST_BANNER_FROM = 3; // "N pacientes pidieron que les avisen" solo desde 3 (con menos no dice nada)

// /recomendado/:slug -- página pública de un doctor que los pacientes recomendaron y que todavía no
// reclama su perfil (CLAUDE.md §8r). A propósito NO se parece a un perfil verificado: etiqueta gris
// "Perfil sin verificar", sin sello azul, sin estrellas ni "opiniones" (solo "Recomendado por N
// pacientes" y etiquetas con conteos). Nunca muestra el mensaje privado de los pacientes. Se indexa
// en Google solo con >= 3 recomendaciones aprobadas y la cédula comprobada por el equipo; antes, solo
// se llega con el enlace. Paso 32: el objetivo de la página es que el doctor se registre, por eso
// el llamado para él va justo después de "Agendar cita" (que es lo que le falta).
export default function RecomendadoPerfil() {
  const { slug } = useParams();
  const [doc, setDoc] = useState(null);
  const [state, setState] = useState("loading"); // loading | ok | notfound | error
  const [report, setReport] = useState(null); // { id, kind, what } cuando se abre la ventana de reportar
  const [related, setRelated] = useState([]); // otros doctores de la misma especialidad
  const [showFab, setShowFab] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const { data } = await base44.functions.invoke("getRecommendedDoctor", { slug });
      if (!data?.ok) { setState("notfound"); return; }
      setDoc(data);
      setState("ok");
    } catch {
      setState("error");
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  // Cuenta esta vista (el número que se ve es el de antes de esta visita).
  useEffect(() => {
    if (state === "ok" && doc && !doc.redirect) recordRecommendedViews([doc.slug], "view");
  }, [state, doc]);

  // Doctores parecidos (columna de la derecha en escritorio): SOLO de la misma especialidad (pedido de Jorge), los más
  // recomendados primero. De la misma lista pública; si falla o no hay otros, simplemente no se muestran.
  useEffect(() => {
    if (state !== "ok" || !doc || doc.redirect || !doc.specialty) { setRelated([]); return undefined; }
    let active = true;
    base44.functions.invoke("listRecommendedDoctors")
      .then(({ data }) => {
        if (!active || !Array.isArray(data)) return;
        const byRank = (a, b) => b.count - a.count || a.full_name.localeCompare(b.full_name, "es");
        const list = data.filter((d) => d.slug !== doc.slug && d.specialty === doc.specialty).sort(byRank).slice(0, 5);
        setRelated(list);
        recordRecommendedViews(list.map((d) => d.slug), "impression");
      })
      .catch(() => {});
    return () => { active = false; };
  }, [state, doc]);

  // Botón fijo del celular: aparece al bajar.
  useEffect(() => {
    const onScroll = () => setShowFab(window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (state === "notfound" || state === "error") { setMeta("robots", "noindex, nofollow"); return; }
    if (state !== "ok" || !doc || doc.redirect) return;
    const where = [doc.specialty, doc.zone].filter(Boolean).join(" en ");
    const title = `${doc.full_name}${where ? ` — ${where}` : ""} | BuscoUnDoctor`;
    const description = `${doc.count} ${doc.count === 1 ? "paciente recomienda" : "pacientes recomiendan"} a ${doc.full_name}. Perfil sin verificar: el doctor aún no ha reclamado su página en BuscoUnDoctor.`;
    document.title = title;
    setMeta("description", description);
    setMeta("robots", doc.indexable ? "index, follow" : "noindex, nofollow");
    setCanonical(`/recomendado/${doc.slug}`);
    setOpenGraph({ title, description, url: buildAbsoluteUrl(`/recomendado/${doc.slug}`) });
  }, [state, doc]);

  if (state === "loading") return <div className="min-h-[60vh] flex items-center justify-center"><LoadingLogo /></div>;
  if (state === "error") return <LoadError onRetry={load} />;
  if (state === "notfound") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <h1 className="font-heading font-bold text-xl text-foreground">No encontramos esta página</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">Puede que el enlace esté incompleto o que la página ya no esté disponible.</p>
        <Button asChild className="mt-6 rounded-xl"><Link to="/especialistas">Buscar un especialista</Link></Button>
      </div>
    );
  }
  if (doc.redirect) return <Navigate to={doc.redirect} replace />;

  const n = doc.count;
  const url = buildAbsoluteUrl(`/recomendado/${doc.slug}`);
  const shareText = `${doc.full_name} está recomendado por ${n} ${n === 1 ? "paciente" : "pacientes"} en BuscoUnDoctor: ${url}`;
  const showBars = n >= BARS_FROM && doc.tags.length > 0;
  const interest = Number(doc.interest_count) || 0;
  const relatedCard = related.length > 0 ? (
    <div className="bg-card rounded-3xl border border-brand-canvasBorder p-5 sm:p-6">
      <h2 className="font-heading font-semibold text-foreground">Otros doctores de {doc.specialty} recomendados</h2>
      <div className="mt-3 grid grid-cols-1 gap-2.5">
        {related.map((d) => (
          <Link key={d.slug} to={`/recomendado/${d.slug}`} className="flex items-center gap-3 rounded-xl border border-border/60 px-3.5 py-3 hover:border-brand-augusta/50 transition-colors">
            <RecommendedAvatar photo={d.photo} name={d.full_name} className="w-11 h-11" />
            <div className="min-w-0 flex-1">
              <p className="font-heading font-semibold text-foreground break-words leading-snug">{d.full_name}</p>
              <p className="text-xs text-muted-foreground break-words">{[d.subspecialty, d.zone, `${d.count} ${d.count === 1 ? "recomendación" : "recomendaciones"}`].filter(Boolean).join(" · ")}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
          </Link>
        ))}
      </div>
      <p className="text-center mt-3 text-sm"><Link to="/recomendados" className="font-medium text-brand-augusta hover:underline">Ver todos los doctores recomendados →</Link></p>
    </div>
  ) : null;

  return (
    <div className="bg-brand-canvas min-h-[70vh] py-8 sm:py-12 pb-24 sm:pb-12">
      <div className={`mx-auto px-4 sm:px-6 ${related.length > 0 ? "max-w-2xl lg:max-w-6xl" : "max-w-2xl"}`}>
      <div className={related.length > 0 ? "lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 lg:items-start" : ""}>
      <div className="space-y-4 min-w-0">
        {/* Encabezado */}
        <div className="bg-card rounded-3xl border border-brand-canvasBorder shadow-card p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <RecommendedAvatar photo={doc.photo} name={doc.full_name} className="w-16 h-16 sm:w-20 sm:h-20" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  <ShieldQuestion className="w-4 h-4" aria-hidden="true" /> Perfil sin verificar
                </span>
                {/* Con menos de 10 vistas no se muestra: un número chico se ve mal. */}
                {Number(doc.views) >= 10 && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue px-1 py-1">
                    <Eye className="w-4 h-4" aria-hidden="true" /> Visto {Number(doc.views).toLocaleString("es-MX")} veces
                  </span>
                )}
              </div>
              <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground leading-tight mt-2">{doc.full_name}</h1>
              {doc.specialty && <p className="text-muted-foreground mt-1 flex items-center gap-1.5"><Stethoscope className="w-4 h-4 flex-shrink-0" aria-hidden="true" />{[doc.specialty, doc.subspecialty].filter(Boolean).join(" · ")}</p>}
            </div>
          </div>

          <div className="mt-5 space-y-2 text-sm text-foreground">
            {doc.zone && <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />{doc.zone}</p>}
            {doc.hospital && <p className="flex items-center gap-2"><Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />{doc.hospital}</p>}
            <p className="text-muted-foreground">
              {doc.license
                ? <>Cédula profesional: <span className="font-medium text-foreground">{doc.license}</span> · consultada en el Registro Nacional de Profesionistas (SEP)</>
                : doc.license_checked
                  ? "Cédula profesional consultada en el Registro Nacional de Profesionistas (SEP)"
                  : "Cédula profesional: aún sin comprobar"}
            </p>
          </div>

          <div className="mt-6 rounded-2xl bg-brand-bluePale p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="flex items-center gap-2 font-heading font-bold text-lg text-brand-navy">
                <Heart className="w-5 h-5 text-red-500 fill-red-500 flex-shrink-0" aria-hidden="true" />
                {n > 0 ? `Recomendado por ${n} ${n === 1 ? "paciente" : "pacientes"}` : "Aún no hay recomendaciones publicadas"}
              </p>
              <ReportMenu items={[{ label: "Reportar recomendaciones", onSelect: () => setReport({ id: null, kind: null, what: "las recomendaciones" }) }]} />
            </div>
            {doc.tags.length > 0 && (showBars ? (
              // Con 3+ recomendaciones: lo que más destacan, como barras ordenadas.
              <div className="mt-3 space-y-2" aria-label="Lo que más destacan los pacientes">
                <p className="text-xs font-medium text-brand-navy/70">Lo que más destacan</p>
                {doc.tags.slice(0, 5).map((t) => (
                  <div key={t.tag} className="flex items-center gap-3 text-sm text-brand-navy">
                    <span className="w-44 sm:w-52 flex-shrink-0 truncate">{recommendationTagLabel(t.tag)}</span>
                    <span className="flex-1 h-2.5 rounded-full bg-white/80 overflow-hidden" aria-hidden="true">
                      <span className="block h-full rounded-full bg-brand-augusta" style={{ width: `${Math.max(8, Math.round((t.n / n) * 100))}%` }} />
                    </span>
                    <span className="w-12 text-right text-xs font-medium flex-shrink-0">{t.n} de {n}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mt-3">
                {doc.tags.map((t) => (
                  <span key={t.tag} className="text-sm bg-white text-brand-navy px-3 py-1 rounded-full border border-brand-canvasBorder">
                    {recommendationTagLabel(t.tag)} · {t.n}
                  </span>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
            <Button asChild className="rounded-xl min-h-[44px] gap-2 bg-brand-augusta hover:bg-brand-augusta/90 text-white">
              <Link to={`/recomendaciones?doctor=${doc.slug}`}><PenLine className="w-4 h-4" /> Yo también lo recomiendo</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl min-h-[44px] gap-2">
              <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"><Share2 className="w-4 h-4" /> Compartir</a>
            </Button>
          </div>
        </div>

        {/* Recomendaciones primero: son lo que convence */}
        {(doc.recommendations || []).length > 0 && (
          <div className="bg-card rounded-3xl border border-brand-canvasBorder p-5 sm:p-6">
            <h2 className="font-heading font-semibold text-foreground">Recomendaciones de pacientes ({doc.recommendations.length})</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Cada una se muestra sin apellido ni correo, después de que la revisamos. Solo mostramos recomendaciones positivas.</p>
            <div className="mt-3">
              <RecommendationCards slug={doc.slug} recommendations={doc.recommendations} />
            </div>
          </div>
        )}

        <AgendarCita doc={doc} />

        {/* Llamado para el DOCTOR: el objetivo de esta página es que se registre. Un solo botón principal. */}
        <div className="rounded-3xl bg-brand-navy text-white p-5 sm:p-6">
          <p className="flex items-center gap-2 text-emerald-300 text-sm font-semibold"><Sparkles className="w-4 h-4" aria-hidden="true" /> ¿Eres {doc.full_name}?</p>
          <p className="font-heading font-bold text-lg sm:text-xl mt-1.5">
            {n > 0 ? `${n} ${n === 1 ? "paciente te recomienda" : "pacientes te recomiendan"}.` : "Tu página ya está lista."} Reclama tu perfil gratis.
          </p>
          <p className="text-white/75 text-sm mt-1.5">
            Agrega tu foto y tus datos, y que los pacientes puedan agendar contigo.
            {interest >= INTEREST_BANNER_FROM ? <> <strong className="text-white">{interest} pacientes</strong> ya pidieron que les avisemos cuando puedas recibir citas.</> : null}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4">
            <Button asChild className="rounded-xl min-h-[44px] gap-2 bg-brand-augusta hover:bg-brand-augustaDark text-white">
              <Link to="/registro-medico">Registrarme gratis <ArrowRight className="w-4 h-4" aria-hidden="true" /></Link>
            </Button>
            <Link to="/contacto" className="text-sm text-white/80 underline hover:text-white">Ya tengo perfil o quiero corregir o retirar esta página</Link>
          </div>
        </div>

        {/* Parecidos: en celular y tableta van aquí; en escritorio, en la columna de la derecha */}
        {relatedCard && <div className="lg:hidden">{relatedCard}</div>}

        {/* Aviso corto; el detalle queda plegado */}
        <div className="px-1 text-xs text-muted-foreground">
          <p className="flex items-start gap-2"><Info className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" /> Perfil sin verificar: los datos los dieron pacientes. Son opiniones, no una valoración médica.</p>
          <details className="mt-1.5 ml-6">
            <summary className="cursor-pointer text-brand-blue hover:underline">¿Qué significa "sin verificar"?</summary>
            <div className="mt-2 space-y-2">
              <p>
                <span className="text-foreground font-medium">{doc.full_name} aún no ha reclamado su perfil</span> ni ha sido verificado por BuscoUnDoctor: los datos de arriba los dieron los pacientes y se contrastaron con el registro público de cédulas cuando se indica.
              </p>
              <p>Las recomendaciones se revisan antes de publicarse. Es una opinión de pacientes, no una valoración médica ni una garantía.</p>
            </div>
          </details>
        </div>
      </div>
      {relatedCard && <aside className="hidden lg:block lg:sticky lg:top-28">{relatedCard}</aside>}
      </div>
      </div>

      {/* Botón fijo del celular: baja con la persona */}
      {showFab && (
        <div className="sm:hidden fixed bottom-4 inset-x-4 z-40">
          <Link to={`/recomendaciones?doctor=${doc.slug}`}
            className="w-full h-12 rounded-full bg-brand-augusta hover:bg-brand-augustaDark text-white font-semibold shadow-lg flex items-center justify-center gap-2 transition-colors">
            <Heart className="w-4 h-4 fill-current" aria-hidden="true" /> Yo también lo recomiendo
          </Link>
        </div>
      )}

      <ReportRecommendationDialog open={!!report} onOpenChange={(o) => { if (!o) setReport(null); }} slug={doc.slug} commentId={report?.id || null} kind={report?.kind || null} what={report?.what || "la recomendación"} />
    </div>
  );
}

// Agendar cita: borroso a propósito hasta que el doctor se registre y complete su perfil (CLAUDE.md §8r).
// Los números de abajo son de relleno: el teléfono real que dio algún paciente NUNCA llega al navegador.
// Debajo, "Avísame cuando pueda agendar": el paciente deja su WhatsApp o correo (con su aceptación) y el equipo
// le avisa cuando el doctor se registre.
function AgendarCita({ doc }) {
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (busy || !consent || contact.trim().length < 5) return;
    setBusy(true); setError("");
    try {
      const { data } = await base44.functions.invoke("submitDoctorInterest", { slug: doc.slug, contact: contact.trim(), consent: true });
      if (data?.ok) setDone(true);
      else setError("Esta página ya no está disponible.");
    } catch (e) {
      setError(formErrorMessage(e, "No pudimos guardar tu aviso. Intenta de nuevo."));
    }
    setBusy(false);
  };

  return (
    <div className="bg-card rounded-3xl border border-brand-canvasBorder overflow-hidden">
      <div className="relative p-5 sm:p-6" style={{ minHeight: 190 }}>
        <h2 className="font-heading font-semibold text-foreground">Agendar cita</h2>
        <div aria-hidden="true" className="mt-3 space-y-2.5 text-sm text-foreground blur-[6px] select-none pointer-events-none">
          <p className="flex items-center gap-2"><Phone className="w-4 h-4" /> Teléfono: 81 1234 5678</p>
          <p className="flex items-center gap-2"><Share2 className="w-4 h-4" /> WhatsApp: 81 8765 4321</p>
          <p className="flex items-center gap-2"><Clock className="w-4 h-4" /> Lunes a viernes, 9:00 – 18:00</p>
        </div>
        <div className="absolute inset-0 bg-white/55 flex flex-col items-center justify-center text-center px-5 gap-2">
          <span className="w-10 h-10 rounded-full bg-brand-navy text-white flex items-center justify-center"><Lock className="w-4 h-4" aria-hidden="true" /></span>
          <p className="text-sm font-medium text-foreground max-w-xs">El contacto para citas se activa cuando {doc.full_name} se registre y complete su perfil.</p>
        </div>
      </div>

      <div className="border-t border-border/60 bg-muted/40 px-5 sm:px-6 py-4">
        {done ? (
          <p className="flex items-start gap-2 text-sm text-foreground"><Check className="w-4 h-4 text-brand-augusta flex-shrink-0 mt-0.5" aria-hidden="true" /> ¡Listo! Te avisaremos cuando {doc.full_name} pueda recibir citas.</p>
        ) : !open ? (
          <Button type="button" variant="outline" onClick={() => setOpen(true)} className="w-full rounded-xl min-h-[44px] gap-2">
            <Bell className="w-4 h-4" aria-hidden="true" /> Avísame cuando pueda agendar
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">¿A dónde te avisamos?</p>
            <Input value={contact} onChange={(e) => setContact(e.target.value.slice(0, 120))} placeholder="Tu WhatsApp (10 números) o tu correo" autoComplete="off" className="h-11 rounded-xl bg-background" />
            <label className="flex items-start gap-2.5 cursor-pointer">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
              <span className="text-xs text-muted-foreground leading-relaxed">
                Acepto que BuscoUnDoctor guarde mi contacto solo para avisarme cuando este doctor pueda recibir citas.{" "}
                <Link to="/aviso-de-privacidad" target="_blank" className="underline">Aviso de privacidad</Link>
              </span>
            </label>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="button" onClick={submit} disabled={busy || !consent || contact.trim().length < 5} className="w-full rounded-xl min-h-[44px] bg-brand-augusta hover:bg-brand-augustaDark text-white">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Avisarme"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
