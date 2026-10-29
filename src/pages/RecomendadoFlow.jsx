import { useState, useEffect, useCallback } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Heart, ShieldQuestion, MapPin, Building2, Share2, Phone, Clock, Lock, Eye, Bell, Check, Loader2, ArrowRight, Sparkles, BadgeCheck, Info, Navigation, Quote, CalendarClock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import LoadingLogo from "@/components/LoadingLogo";
import LoadError from "@/components/LoadError";
import FlowNav from "@/components/FlowNav";
import ReportRecommendationDialog from "@/components/ReportRecommendationDialog";
import RecommendedAvatar from "@/components/RecommendedAvatar";
import { ReportMenu, commentMonth } from "@/components/RecommendationCards";
import CardSlider from "@/components/CardSlider";
import { RecommendationMedal } from "@/components/RecommendationsLandingFlow";
import { recommendationTagLabel } from "@/lib/recommendationTags";
import { recordRecommendedViews } from "@/lib/recommendedViews";
import { formErrorMessage } from "@/lib/formErrors";
import { setCanonical, buildAbsoluteUrl } from "@/lib/seoMeta";

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

// "Última recomendación": solo se guarda el mes (privacidad de quien recomienda), así que se dice en meses.
function lastRecommendationLabel(recs) {
  const months = recs.map((r) => r.month).filter(Boolean).sort();
  const last = months[months.length - 1];
  if (!last) return null;
  const [y, m] = last.split("-").map(Number);
  const now = new Date();
  const diff = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  if (diff <= 0) return "este mes";
  if (diff === 1) return "el mes pasado";
  return `hace ${diff} meses`;
}

// "Cómo llegar": búsqueda en Google Maps con el hospital (si lo dieron) y la zona. No hay dirección exacta.
const mapsUrl = (doc) => {
  const q = [doc.hospital, doc.zone, "Nuevo León"].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
};

const BARS_FROM = 3; // las etiquetas se dibujan como barras desde 3 recomendaciones (con menos, etiquetas sueltas)
const INTEREST_BANNER_FROM = 3; // "N pacientes pidieron que les avisen" solo desde 3
const LANDING = "/recomendaciones-flow";

// /recomendado-flow/:slug -- la página de un doctor recomendado (la misma información que /recomendado/:slug,
// RecomendadoPerfil.jsx) con el estilo "flow" de /recomendaciones-flow: un solo degradado continuo, menú píldora
// de vidrio y tarjetas translúcidas. Solo la enlazan las tarjetas de /recomendaciones-flow. Copia de prueba: siempre
// noindex y canonical a la página original. Reglas que se conservan (CLAUDE.md §8r): "Perfil sin verificar" visible,
// sin estrellas ni "opiniones", nunca el mensaje privado ni el contacto real del doctor.
export default function RecomendadoFlow() {
  const { slug } = useParams();
  const [doc, setDoc] = useState(null);
  const [state, setState] = useState("loading"); // loading | ok | notfound | error
  const [report, setReport] = useState(null);
  const [related, setRelated] = useState([]);
  const [showFab, setShowFab] = useState(false);
  const [interestOpen, setInterestOpen] = useState(false); // "Avísame" abierto (también desde la barra del celular)

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

  useEffect(() => {
    if (state === "ok" && doc && !doc.redirect) recordRecommendedViews([doc.slug], "view");
  }, [state, doc]);

  // Otros doctores de la misma especialidad (los más recomendados primero).
  useEffect(() => {
    if (state !== "ok" || !doc || doc.redirect || !doc.specialty) { setRelated([]); return undefined; }
    let active = true;
    base44.functions.invoke("listRecommendedDoctors")
      .then(({ data }) => {
        if (!active || !Array.isArray(data)) return;
        const byRank = (a, b) => b.count - a.count || a.full_name.localeCompare(b.full_name, "es");
        const list = data.filter((d) => d.slug !== doc.slug && d.specialty === doc.specialty).sort(byRank).slice(0, 6);
        setRelated(list);
        recordRecommendedViews(list.map((d) => d.slug), "impression");
      })
      .catch(() => {});
    return () => { active = false; };
  }, [state, doc]);

  useEffect(() => {
    const onScroll = () => setShowFab(window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Copia de prueba: nunca se indexa; el canonical apunta a la página original del doctor.
  useEffect(() => {
    setMeta("robots", "noindex, nofollow");
    if (state !== "ok" || !doc || doc.redirect) return;
    document.title = `${doc.full_name} | BuscoUnDoctor`;
    setCanonical(`/recomendado/${doc.slug}`);
  }, [state, doc]);

  if (state === "loading") return <div className="min-h-screen bg-brand-flowMist flex items-center justify-center"><LoadingLogo /></div>;
  if (state === "error") return <LoadError onRetry={load} />;
  if (state === "notfound") {
    return (
      <div className="min-h-screen bg-[linear-gradient(to_bottom,theme(colors.brand.flowHeroTop),theme(colors.brand.flowMist))] flex flex-col items-center justify-center px-6 text-center">
        <FlowNav base={LANDING} />
        <h1 className="font-heading font-medium tracking-tight text-3xl text-white">No encontramos esta página</h1>
        <p className="text-white/80 mt-2 max-w-sm">Puede que el enlace esté incompleto o que la página ya no esté disponible.</p>
        <Link to={LANDING} className="mt-6 inline-flex items-center h-12 px-6 rounded-full bg-white text-brand-navy font-semibold">Ver doctores recomendados</Link>
      </div>
    );
  }
  if (doc.redirect) return <Navigate to={doc.redirect} replace />;

  const n = doc.count;
  const url = buildAbsoluteUrl(`/recomendado/${doc.slug}`);
  const shareText = `${doc.full_name} está recomendado por ${n} ${n === 1 ? "paciente" : "pacientes"} en BuscoUnDoctor: ${url}`;
  const recommendTo = `${LANDING}?doctor=${doc.slug}`;
  const showBars = n >= BARS_FROM && doc.tags.length > 0;
  const top = doc.tags[0];
  const interest = Number(doc.interest_count) || 0;
  const recs = doc.recommendations || [];
  const lastRec = lastRecommendationLabel(recs);
  const openInterest = () => {
    setInterestOpen(true);
    requestAnimationFrame(() => document.getElementById("agendar")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };
  const license = doc.license
    ? `Cédula ${doc.license} · consultada en la SEP`
    : doc.license_checked ? "Cédula consultada en la SEP" : "Cédula aún sin comprobar";

  return (
    <div className="min-h-screen bg-brand-flowMist" style={{ "--ring": "220 26% 39%" }}>
      <FlowNav base={LANDING} ctaTo={recommendTo} />

      {/* 1. Portada: foto grande, nombre, sello con el número y lo más destacado. Del azul pizarra al casi blanco. */}
      <section className="bg-[linear-gradient(to_bottom,theme(colors.brand.flowHeroTop)_0%,theme(colors.brand.flowHeroTop)_12%,theme(colors.brand.flowHeroMid)_45%,theme(colors.brand.flowHeroLow)_75%,theme(colors.brand.flowMist)_100%)] pt-24 sm:pt-28 pb-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8">
          {/* Foto grande con "Perfil sin verificar" encima, abajo */}
          <div className="relative flex-shrink-0 w-40 h-52 sm:w-48 sm:h-60 rounded-3xl overflow-hidden border border-white/40 shadow-2xl shadow-brand-navy/30 bg-white/30">
            <RecommendedAvatar photo={doc.photo} name={doc.full_name} className="absolute inset-0 w-full h-full" shape="rounded-none" />
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-white/90 shadow-sm px-2 py-0.5 rounded-full whitespace-nowrap">
              <ShieldQuestion className="w-3.5 h-3.5" aria-hidden="true" /> Perfil sin verificar
            </span>
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left text-white">
            <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.18em] sm:tracking-[0.3em] text-white/75">
              {[doc.specialty, doc.zone].filter(Boolean).join(" · ")}
            </p>
            <h1 className="mt-3 font-heading font-medium tracking-tight text-[2.1rem] sm:text-5xl leading-[1.05] break-words">{doc.full_name}</h1>
            {doc.subspecialty && <p className="mt-2 text-white/80">{doc.subspecialty}</p>}

            {/* Resumen: sello + cuántos lo recomiendan + lo que más destacan (lo primero que alguien quiere saber) */}
            <div className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-white/25 bg-white/10 backdrop-blur-sm px-4 py-3 text-left">
              <RecommendationMedal count={n} size="w-14 h-14" className="relative flex-shrink-0" />
              <div>
                <p className="font-heading font-medium text-lg leading-tight">
                  {n > 0 ? `Recomendado por ${n} ${n === 1 ? "paciente" : "pacientes"}` : "Aún sin recomendaciones publicadas"}
                </p>
                {top && <p className="text-sm text-white/80 mt-0.5">Lo que más destacan: <span className="text-emerald-200 font-medium">{recommendationTagLabel(top.tag)}</span></p>}
                {lastRec && <p className="text-xs text-white/70 mt-1 flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" aria-hidden="true" /> Última recomendación: {lastRec}</p>}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-center sm:justify-start gap-3">
              <Link to={recommendTo} className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-white text-brand-navy font-semibold shadow-lg shadow-black/10 hover:bg-white/90 transition-colors">
                <Heart className="w-4 h-4" aria-hidden="true" /> Yo también lo recomiendo
              </Link>
              <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full border border-white/40 bg-white/10 backdrop-blur-sm text-white font-semibold hover:bg-white/20 transition-colors">
                <Share2 className="w-4 h-4" aria-hidden="true" /> Compartir
              </a>
            </div>
          </div>
        </div>

        {/* Datos clave en pastillas de vidrio (zona, hospital, cédula, vistas) */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8 flex flex-wrap justify-center sm:justify-start gap-2">
          {doc.zone && <Fact icon={MapPin}>{doc.zone}</Fact>}
          {doc.hospital && <Fact icon={Building2}>{doc.hospital}</Fact>}
          {(doc.hospital || doc.zone) && (
            <a href={mapsUrl(doc)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white text-brand-navy text-sm font-semibold hover:bg-white/90 transition-colors">
              <Navigation className="w-4 h-4" aria-hidden="true" /> Cómo llegar
            </a>
          )}
          <Fact icon={doc.license_checked ? BadgeCheck : ShieldQuestion}>{license}</Fact>
          {Number(doc.views) >= 10 && <Fact icon={Eye}>Visto {Number(doc.views).toLocaleString("es-MX")} veces</Fact>}
        </div>
      </section>

      {/* 2. Lo que destacan y las recomendaciones: del casi blanco al azul cielo, en paneles de vidrio claro. */}
      <section className="bg-gradient-to-b from-brand-flowMist to-brand-flowSky pb-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 lg:items-start">
          {doc.tags.length > 0 && (
            <div className="rounded-3xl border border-white/80 bg-white/60 backdrop-blur-sm p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-heading font-medium tracking-tight text-xl text-brand-navy">Lo que más destacan</h2>
                <ReportMenu items={[{ label: "Reportar recomendaciones", onSelect: () => setReport({ id: null, kind: null, what: "las recomendaciones" }) }]} />
              </div>
              {showBars ? (
                <div className="mt-4 space-y-3">
                  {doc.tags.slice(0, 6).map((t) => (
                    <div key={t.tag}>
                      {/* Porcentaje grande ("75% destaca…") y el conteo chico al lado */}
                      <div className="flex items-baseline justify-between gap-3 text-brand-navy">
                        <span className="text-sm truncate">{recommendationTagLabel(t.tag)}</span>
                        <span className="flex-shrink-0">
                          <span className="font-heading font-medium text-xl tabular-nums">{Math.round((t.n / n) * 100)}%</span>
                          <span className="ml-1.5 text-xs text-brand-navy/60">{t.n} de {n}</span>
                        </span>
                      </div>
                      <span className="mt-1 block h-2 rounded-full bg-white/80 overflow-hidden" aria-hidden="true">
                        <span className="block h-full rounded-full bg-brand-navy" style={{ width: `${Math.max(8, Math.round((t.n / n) * 100))}%` }} />
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 mt-4">
                  {doc.tags.map((t) => (
                    <span key={t.tag} className="text-sm bg-white/80 text-brand-navy px-3 py-1 rounded-full border border-white">
                      {recommendationTagLabel(t.tag)}{t.n > 1 ? ` · ${t.n}` : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {recs.length > 0 && (
            <div className={`rounded-3xl border border-white/80 bg-white/60 backdrop-blur-sm p-5 sm:p-6 ${doc.tags.length === 0 ? "lg:col-span-2" : ""}`}>
              <h2 className="font-heading font-medium tracking-tight text-xl text-brand-navy">Recomendaciones de pacientes ({recs.length})</h2>
              <p className="text-xs text-brand-navy/60 mt-0.5">Sin apellido ni correo, y revisadas antes de publicarse. Solo mostramos recomendaciones positivas.</p>
              {/* Una cita grande por recomendación; con dos o más, en carrusel (desliza o usa las flechas). */}
              <CardSlider className="mt-4" dots={false} resetKey={recs.map((r) => r.id).join(",")} label="Recomendaciones de pacientes" prevLabel="Ver recomendaciones anteriores" nextLabel="Ver más recomendaciones">
                {recs.map((r) => (
                  <QuoteCard key={r.id} r={r} single={recs.length === 1}
                    onReport={(kind) => setReport({ id: r.id, kind, what: kind === "comment" ? "el comentario" : "la recomendación" })} />
                ))}
              </CardSlider>
            </div>
          )}
        </div>
      </section>

      {/* 3. Agendar (bloqueado) + avísame, y otros doctores: del azul cielo al profundo. */}
      <section className="bg-gradient-to-b from-brand-flowSky to-brand-flowDeep pb-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-4">
          <AgendarCita doc={doc} open={interestOpen} setOpen={setInterestOpen} />

          {related.length > 0 && (
            <div className="rounded-3xl border border-white/30 bg-white/10 backdrop-blur-sm p-5 sm:p-6">
              <h2 className="font-heading font-medium tracking-tight text-xl text-white">Otros doctores de {doc.specialty} recomendados</h2>
              <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {related.map((d) => (
                  <Link key={d.slug} to={`/recomendado-flow/${d.slug}`} className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/70 px-3 py-3 hover:bg-white/90 transition-colors">
                    <RecommendedAvatar photo={d.photo} name={d.full_name} className="w-12 h-14" shape="rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="font-heading font-semibold text-brand-navy break-words leading-snug">{d.full_name}</p>
                      <p className="text-xs text-brand-navy/70 break-words">{[d.subspecialty, d.zone].filter(Boolean).join(" · ")}</p>
                    </div>
                    <RecommendationMedal count={d.count} className="relative flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. Llamado para el DOCTOR (el objetivo de la página es que se registre): azul profundo. */}
      <section className="bg-brand-flowDeep px-4 sm:px-6 pb-16 text-center text-white">
        <p className="inline-flex items-center gap-2 text-emerald-200 text-sm font-medium"><Sparkles className="w-4 h-4" aria-hidden="true" /> ¿Eres {doc.full_name}?</p>
        <h2 className="mt-3 font-heading font-medium tracking-tight text-3xl sm:text-4xl leading-tight max-w-2xl mx-auto">
          {n > 0 ? `${n} ${n === 1 ? "paciente te recomienda" : "pacientes te recomiendan"}.` : "Tu página ya está lista."} Reclama tu perfil gratis.
        </h2>
        <p className="mt-3 text-white/75 max-w-lg mx-auto">
          Agrega tu foto y tus datos, y que los pacientes puedan agendar contigo.
          {interest >= INTEREST_BANNER_FROM ? <> <strong className="text-white">{interest} pacientes</strong> ya pidieron que les avisemos cuando puedas recibir citas.</> : null}
        </p>
        <Link to="/registro-medico" className="mt-7 inline-flex items-center justify-center gap-2 h-12 px-7 rounded-full bg-white text-brand-navy font-semibold shadow-lg shadow-black/10 hover:bg-white/90 transition-colors">
          Registrarme gratis <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
        <p className="mt-4"><Link to="/contacto" className="text-sm text-white/75 underline hover:text-white">Ya tengo perfil o quiero corregir o retirar esta página</Link></p>
      </section>

      {/* 5. Aviso y pie: del azul profundo al brillante. */}
      <footer className="bg-gradient-to-b from-brand-flowDeep to-brand-flowBright px-4 sm:px-6 pt-6 pb-24 sm:pb-12 text-sm text-white/80">
        <div className="max-w-2xl mx-auto">
          <p className="flex items-start gap-2"><Info className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" /> Perfil sin verificar: los datos los dieron pacientes. Son opiniones, no una valoración médica.</p>
          <details className="mt-2 ml-6">
            <summary className="cursor-pointer underline hover:text-white">¿Qué significa "sin verificar"?</summary>
            <div className="mt-2 space-y-2 text-white/75">
              <p><span className="text-white font-medium">{doc.full_name} aún no ha reclamado su perfil</span> ni ha sido verificado por BuscoUnDoctor: los datos los dieron los pacientes y se contrastaron con el registro público de cédulas cuando se indica.</p>
              <p>Las recomendaciones se revisan antes de publicarse. Es una opinión de pacientes, no una valoración médica ni una garantía.</p>
            </div>
          </details>
          <p className="mt-8 text-center">
            <Link to="/aviso-de-privacidad" className="underline hover:text-white">Aviso de privacidad</Link>{" · "}
            <Link to="/terminos-y-condiciones" className="underline hover:text-white">Términos y condiciones</Link>{" · "}
            <Link to="/contacto" className="underline hover:text-white">Contacto</Link>
          </p>
        </div>
      </footer>

      {/* Barra fija del celular (aparece al bajar): las dos acciones del paciente, recomendar y pedir aviso. */}
      {showFab && (
        <div className="sm:hidden fixed bottom-3 inset-x-3 z-40 flex gap-2 p-1.5 rounded-full bg-brand-navy/45 backdrop-blur-md border border-white/15 shadow-lg shadow-brand-navy/30">
          <Link to={recommendTo}
            className="flex-1 h-11 rounded-full bg-brand-blue hover:bg-brand-blue/90 text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors">
            <Heart className="w-4 h-4 fill-current" aria-hidden="true" /> Recomendar
          </Link>
          <button type="button" onClick={openInterest}
            className="flex-1 h-11 rounded-full bg-white text-brand-navy text-sm font-semibold flex items-center justify-center gap-1.5">
            <Bell className="w-4 h-4" aria-hidden="true" /> Avísame
          </button>
        </div>
      )}

      <ReportRecommendationDialog open={!!report} onOpenChange={(o) => { if (!o) setReport(null); }} slug={doc.slug} commentId={report?.id || null} kind={report?.kind || null} what={report?.what || "la recomendación"} />
    </div>
  );
}

// Una recomendación como cita grande: el comentario (si lo hay) en letra grande, sus etiquetas, y el primer nombre
// (si lo dejó) con el mes. Con varias, ocupan el ancho de un carrusel; se pueden reportar sin cuenta.
function QuoteCard({ r, single, onReport }) {
  const width = single ? "w-full" : "w-[calc(100%_-_2.5rem)] md:w-[calc((100%_-_3.75rem)/2)]";
  return (
    <div role="listitem" className={`snap-start shrink-0 flex flex-col rounded-2xl bg-white/80 border border-white px-5 py-5 ${width}`}>
      <div className="flex items-start justify-between gap-3">
        <Quote className="w-7 h-7 text-brand-navy/25 flex-shrink-0" aria-hidden="true" />
        <ReportMenu ariaLabel="Reportar" items={[
          { label: "Reportar recomendación", onSelect: () => onReport("recommendation") },
          ...(r.comment ? [{ label: "Reportar comentario", onSelect: () => onReport("comment") }] : []),
        ]} />
      </div>
      <p className="mt-2 font-heading font-medium tracking-tight text-lg sm:text-xl leading-snug text-brand-navy break-words">
        {r.comment || "Recomienda a este doctor."}
      </p>
      {(r.tags || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {r.tags.map((t) => <span key={t} className="text-xs bg-brand-flowMist text-brand-navy px-2.5 py-1 rounded-full">{recommendationTagLabel(t)}</span>)}
        </div>
      )}
      <p className="mt-auto pt-4 text-sm text-brand-navy/70 flex items-center gap-1.5">
        <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" aria-hidden="true" />
        {r.name ? <><span className="font-semibold text-brand-navy">{r.name}</span> · </> : null}{commentMonth(r.month)}
      </p>
    </div>
  );
}

// Pastilla de vidrio con un dato (zona, hospital, cédula…).
function Fact({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-white/30 bg-white/10 backdrop-blur-sm text-sm text-white">
      <Icon className="w-4 h-4 text-white/80 flex-shrink-0" aria-hidden="true" /> {children}
    </span>
  );
}

// Agendar cita: el contacto se activa cuando el doctor se registre (los números de la vista previa son de relleno:
// el teléfono real que dio algún paciente NUNCA llega al navegador). La acción útil para el paciente hoy es
// "Avísame cuando pueda agendar", así que va como botón principal del panel.
function AgendarCita({ doc, open, setOpen }) {
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
    <div id="agendar" className="rounded-3xl border border-white/80 bg-white/70 backdrop-blur-sm overflow-hidden grid sm:grid-cols-2 scroll-mt-24">
      {/* Vista previa bloqueada */}
      <div className="relative p-5 sm:p-6 min-h-[170px]">
        <h2 className="font-heading font-medium tracking-tight text-xl text-brand-navy">Agendar cita</h2>
        <div aria-hidden="true" className="mt-3 space-y-2.5 text-sm text-brand-navy blur-[6px] select-none pointer-events-none">
          <p className="flex items-center gap-2"><Phone className="w-4 h-4" /> Teléfono: 81 1234 5678</p>
          <p className="flex items-center gap-2"><Share2 className="w-4 h-4" /> WhatsApp: 81 8765 4321</p>
          <p className="flex items-center gap-2"><Clock className="w-4 h-4" /> Lunes a viernes, 9:00 – 18:00</p>
        </div>
        <div className="absolute inset-x-0 bottom-0 top-12 flex flex-col items-center justify-center text-center px-5 gap-2">
          <span className="w-10 h-10 rounded-full bg-brand-navy text-white flex items-center justify-center"><Lock className="w-4 h-4" aria-hidden="true" /></span>
          <p className="text-sm font-medium text-brand-navy max-w-xs">El contacto se activa cuando {doc.full_name} se registre.</p>
        </div>
      </div>

      {/* Avísame: la acción principal para el paciente */}
      <div className="border-t sm:border-t-0 sm:border-l border-white/80 bg-white/50 p-5 sm:p-6 flex flex-col justify-center">
        {done ? (
          <p className="flex items-start gap-2 text-sm text-brand-navy"><Check className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" /> ¡Listo! Te avisaremos cuando {doc.full_name} pueda recibir citas.</p>
        ) : !open ? (
          <>
            <p className="font-heading font-medium text-brand-navy">¿Quieres una cita con este doctor?</p>
            <p className="text-sm text-brand-navy/70 mt-1">Déjanos tu WhatsApp o correo y te avisamos en cuanto pueda recibir citas.</p>
            <button type="button" onClick={() => setOpen(true)}
              className="mt-4 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-brand-navy hover:bg-brand-navy/90 text-white text-sm font-semibold transition-colors self-start">
              <Bell className="w-4 h-4" aria-hidden="true" /> Avísame cuando pueda agendar
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-brand-navy">¿A dónde te avisamos?</p>
            <Input value={contact} onChange={(e) => setContact(e.target.value.slice(0, 120))} placeholder="Tu WhatsApp (10 números) o tu correo" autoComplete="off" className="h-11 rounded-xl bg-white" />
            <label className="flex items-start gap-2.5 cursor-pointer">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
              <span className="text-xs text-brand-navy/70 leading-relaxed">
                Acepto que BuscoUnDoctor guarde mi contacto solo para avisarme cuando este doctor pueda recibir citas.{" "}
                <Link to="/aviso-de-privacidad" target="_blank" className="underline">Aviso de privacidad</Link>
              </span>
            </label>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <button type="button" onClick={submit} disabled={busy || !consent || contact.trim().length < 5}
              className="w-full inline-flex items-center justify-center h-11 rounded-full bg-brand-navy hover:bg-brand-navy/90 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Avisarme"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
