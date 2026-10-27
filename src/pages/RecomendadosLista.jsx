import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Heart, ShieldQuestion, Search, PenLine, ChevronRight, ChevronDown, ArrowLeft, ArrowRight, Share2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingLogo from "@/components/LoadingLogo";
import LoadError from "@/components/LoadError";
import RecommendedAvatar from "@/components/RecommendedAvatar";
import { recommendationTagLabel } from "@/lib/recommendationTags";
import { recordRecommendedViews } from "@/lib/recommendedViews";
import { TOP_SPECIALTY_SLUGS } from "@/lib/topSpecialties";

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const OTHER = "Otras especialidades";
const SHOW_COUNTER_FROM = 10; // "N doctores · M recomendaciones": solo cuando el número ya dice algo (siempre es el real)
const FEATURED_FROM = 4; // la franja "Los más recomendados" solo sale con 4+ doctores (con menos repite la lista)
const FOLD_FROM = 10; // las especialidades fuera del top 10 se pliegan solo si hay más de 10 en total
const PAGE_URL = "https://buscoundoctor.com/recomendados";

const SORTS = [
  { v: "mas", label: "Más recomendados" },
  { v: "zona", label: "Por zona" },
  { v: "nombre", label: "Nombre (A–Z)" },
];

const pacientes = (n) => `Recomendado por ${n} ${n === 1 ? "paciente" : "pacientes"}`;

// /recomendados -- doctores recomendados por pacientes, por especialidad (CLAUDE.md §8r, pasos 8 y 31).
// Primero se ven las especialidades (las 10 más comunes primero; el resto plegado si son muchas) y al elegir una
// (?especialidad=…, así el botón "atrás" del navegador funciona) salen sus doctores, con filtro por zona y orden.
// Solo aparecen los que tienen al menos 1 recomendación aprobada y la cédula comprobada por el equipo (lo filtra
// la base de datos). Son doctores SIN perfil verificado: por eso la etiqueta gris y el aviso arriba. Durante el
// piloto no lleva enlaces desde el sitio y es `noindex`.
export default function RecomendadosLista() {
  const [list, setList] = useState([]);
  const [state, setState] = useState("loading"); // loading | ok | error
  const [q, setQ] = useState("");
  const [zone, setZone] = useState("");
  const [sort, setSort] = useState("mas");
  const [showRest, setShowRest] = useState(false);
  const [topNames, setTopNames] = useState([]); // nombres (en el orden del top 10) de las especialidades más comunes
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("especialidad") || "";

  const load = useCallback(async () => {
    setState("loading");
    try {
      const { data } = await base44.functions.invoke("listRecommendedDoctors");
      setList(Array.isArray(data) ? data : []);
      setState("ok");
    } catch {
      setState("error");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Para saber cuáles especialidades de la lista son de las 10 más comunes (si falla, todo va en orden alfabético).
  useEffect(() => {
    base44.entities.Specialty.filter({ active: true })
      .then((l) => setTopNames(TOP_SPECIALTY_SLUGS.map((slug) => l.find((x) => x.slug === slug)?.name).filter(Boolean)))
      .catch(() => setTopNames([]));
  }, []);

  useEffect(() => {
    document.title = "Doctores recomendados por pacientes | BuscoUnDoctor";
    setMeta("description", "Doctores en Monterrey recomendados por pacientes, por especialidad. Perfiles sin verificar.");
    setMeta("robots", "noindex, nofollow");
  }, []);

  const groups = useMemo(() => {
    const k = norm(q.trim());
    const filtered = k.length >= 2 ? list.filter((d) => norm(d.full_name).includes(k) || norm(d.specialty).includes(k)) : list;
    const map = new Map();
    filtered.forEach((d) => {
      const key = d.specialty || OTHER;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(d);
    });
    return [...map.entries()]
      .sort((a, b) => (a[0] === OTHER) - (b[0] === OTHER) || a[0].localeCompare(b[0], "es"))
      .map(([specialty, doctors]) => ({ specialty, doctors, id: "esp-" + norm(specialty).replace(/[^a-z0-9]+/g, "-") }));
  }, [list, q]);

  // Las especialidades más comunes primero (en el orden del top 10); el resto, alfabético.
  const { primary, rest } = useMemo(() => {
    const inTop = (g) => topNames.indexOf(g.specialty);
    const p = groups.filter((g) => inTop(g) >= 0).sort((a, b) => inTop(a) - inTop(b));
    const r = groups.filter((g) => inTop(g) < 0);
    return { primary: p, rest: r };
  }, [groups, topNames]);
  const fold = !q.trim() && groups.length > FOLD_FROM && primary.length > 0 && rest.length > 0;
  const visibleGroups = fold && !showRest ? primary : [...primary, ...rest];

  const selected = useMemo(() => groups.find((g) => g.id === selectedId) || null, [groups, selectedId]);
  const zones = useMemo(() => (selected ? [...new Set(selected.doctors.map((d) => d.zone).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")) : []), [selected]);

  // Doctores de la especialidad abierta, filtrados por zona y ordenados.
  const shown = useMemo(() => {
    if (!selected) return [];
    const base = zone ? selected.doctors.filter((d) => d.zone === zone) : selected.doctors;
    const byName = (a, b) => a.full_name.localeCompare(b.full_name, "es");
    const byCount = (a, b) => b.count - a.count || byName(a, b);
    return [...base].sort(
      sort === "nombre" ? byName
        : sort === "zona" ? (a, b) => String(a.zone || "zzz").localeCompare(String(b.zone || "zzz"), "es") || byCount(a, b)
          : byCount
    );
  }, [selected, zone, sort]);

  // Los más recomendados de todas las especialidades (franja de arriba).
  const featured = useMemo(
    () => [...list].sort((a, b) => b.count - a.count || a.full_name.localeCompare(b.full_name, "es")).slice(0, 3),
    [list]
  );
  const showFeatured = !selected && !q.trim() && list.length >= FEATURED_FROM;

  const totalRecs = list.reduce((n, d) => n + (d.count || 0), 0);

  useEffect(() => { window.scrollTo(0, 0); setZone(""); setSort("mas"); }, [selectedId]);
  // Impresión: los doctores que se ven en la lista (especialidad abierta, o la franja de los más recomendados).
  useEffect(() => { if (selected) recordRecommendedViews(shown.map((d) => d.slug), "impression"); }, [selected, shown]);
  useEffect(() => { if (showFeatured) recordRecommendedViews(featured.map((d) => d.slug), "impression"); }, [showFeatured, featured]);

  if (state === "loading") return <div className="min-h-[60vh] flex items-center justify-center"><LoadingLogo /></div>;
  if (state === "error") return <LoadError onRetry={load} />;

  const shareUrl = selected ? `${PAGE_URL}?especialidad=${selected.id}` : PAGE_URL;
  const shareHref = `https://wa.me/?text=${encodeURIComponent(`Mira los doctores que otros pacientes recomiendan en BuscoUnDoctor: ${shareUrl}`)}`;

  const DoctorCard = ({ d }) => (
    <div className="rounded-2xl border border-border/60 bg-card px-4 py-4 hover:border-brand-augusta/50 hover:shadow-md transition-all flex flex-col">
      <Link to={`/recomendado/${d.slug}`} className="flex items-start gap-3 flex-1">
        <RecommendedAvatar photo={d.photo} name={d.full_name} className="w-14 h-14" />
        <div className="min-w-0 flex-1">
          <p className="font-heading font-semibold text-foreground break-words leading-snug">{d.full_name}</p>
          <p className="text-sm text-muted-foreground break-words">{[d.specialty, d.zone].filter(Boolean).join(" · ")}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              <ShieldQuestion className="w-3 h-3" aria-hidden="true" /> Sin verificar
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-foreground">
              <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" aria-hidden="true" /> {pacientes(d.count)}
            </span>
          </div>
          {(d.top_tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {d.top_tags.map((t) => <span key={t.tag} className="text-xs bg-brand-bluePale text-brand-navy px-2.5 py-1 rounded-full">{recommendationTagLabel(t.tag)}{t.n > 1 ? ` · ${t.n}` : ""}</span>)}
            </div>
          )}
        </div>
      </Link>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mt-3 pt-3 border-t border-border/50">
        <Link to={`/recomendado/${d.slug}`} className="text-sm font-medium text-brand-augusta hover:underline inline-flex items-center gap-1">Ver recomendaciones <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" /></Link>
        <Link to={`/recomendaciones?doctor=${d.slug}`}
          className="inline-flex items-center justify-center gap-1.5 h-10 sm:h-9 px-3.5 rounded-full bg-brand-augusta hover:bg-brand-augustaDark text-white text-sm font-semibold transition-colors w-full sm:w-auto">
          <Heart className="w-3.5 h-3.5 fill-current" aria-hidden="true" /> Yo también lo recomiendo
        </Link>
      </div>
    </div>
  );

  return (
    <div className="bg-brand-canvas min-h-[70vh] py-8 sm:py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-5">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-500 fill-red-500" aria-hidden="true" /> Doctores recomendados por pacientes
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Perfiles sin verificar. Son opiniones de pacientes, no una valoración médica.
            {totalRecs >= SHOW_COUNTER_FROM ? <> <strong className="text-foreground">{list.length} {list.length === 1 ? "doctor" : "doctores"}</strong> y <strong className="text-foreground">{totalRecs} recomendaciones</strong> hasta ahora.</> : null}
          </p>
          <div className="flex flex-wrap gap-2.5 mt-4">
            <Button asChild className="rounded-xl min-h-[44px] gap-2 bg-brand-augusta hover:bg-brand-augustaDark text-white">
              <Link to="/recomendaciones"><PenLine className="w-4 h-4" /> Recomendar a un doctor</Link>
            </Button>
            {list.length > 0 && (
              <Button asChild variant="outline" className="rounded-xl min-h-[44px] gap-2">
                <a href={shareHref} target="_blank" rel="noopener noreferrer"><Share2 className="w-4 h-4" /> Compartir esta lista</a>
              </Button>
            )}
          </div>
        </div>

        {list.length === 0 ? (
          <div className="bg-card rounded-3xl border border-brand-canvasBorder p-8 text-center">
            <Heart className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" aria-hidden="true" />
            <p className="font-medium text-foreground">Aún no hay doctores en esta lista.</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Aparecen aquí cuando reciben una recomendación de un paciente y revisamos su cédula. Sé el primero: recomienda a tu doctor.</p>
          </div>
        ) : (
          <>
            {!selected && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o especialidad..." className="pl-9 h-11 rounded-xl text-sm bg-card" />
              </div>
            )}

            {showFeatured && (
              <section>
                <h2 className="font-heading font-semibold text-foreground mb-3">Los más recomendados</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {featured.map((d) => (
                    <Link key={d.slug} to={`/recomendado/${d.slug}`} className="flex flex-col items-center text-center gap-1.5 bg-card rounded-2xl border border-brand-canvasBorder px-3 py-4 hover:border-brand-augusta/50 hover:shadow-card transition-all">
                      <RecommendedAvatar photo={d.photo} name={d.full_name} className="w-14 h-14" />
                      <p className="font-heading font-semibold text-foreground break-words leading-snug">{d.full_name}</p>
                      <p className="text-xs text-muted-foreground break-words">{[d.specialty, d.zone].filter(Boolean).join(" · ")}</p>
                      <span className="inline-flex items-center gap-1 text-xs text-foreground"><Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" aria-hidden="true" /> {pacientes(d.count)}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {selected ? (
              <section className="bg-card rounded-3xl border border-brand-canvasBorder shadow-card p-5 sm:p-6">
                <button type="button" onClick={() => setParams({})} className="text-sm text-brand-blue hover:underline inline-flex items-center gap-1">
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Todas las especialidades
                </button>
                <h2 className="font-heading font-bold text-xl text-foreground mt-3">{selected.specialty}</h2>
                <p className="text-xs text-muted-foreground">{selected.doctors.length} {selected.doctors.length === 1 ? "doctor recomendado" : "doctores recomendados"}</p>

                {(zones.length > 1 || selected.doctors.length > 1) && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    {zones.length > 1 ? (
                      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por zona">
                        {["", ...zones].map((z) => (
                          <button key={z || "todas"} type="button" onClick={() => setZone(z)} aria-pressed={zone === z}
                            className={`px-3.5 h-9 rounded-full border text-sm font-medium transition-colors ${zone === z ? "border-brand-augusta bg-brand-augustaLight text-brand-augustaDark" : "border-input bg-background text-foreground hover:border-brand-augusta/50"}`}>
                            {z || "Todas las zonas"}
                          </button>
                        ))}
                      </div>
                    ) : <span />}
                    {selected.doctors.length > 1 && (
                      <label className="text-xs text-muted-foreground flex items-center gap-2">
                        Ordenar
                        <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 px-2.5 rounded-lg border border-input bg-background text-sm text-foreground">
                          {SORTS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                        </select>
                      </label>
                    )}
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  {shown.map((d) => <DoctorCard key={d.slug} d={d} />)}
                  {shown.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No hay doctores en esa zona todavía.</p>}
                </div>

                {/* Invitación a recomendar a otro: se ve más grande mientras hay pocos doctores */}
                <div className={`mt-4 rounded-2xl border border-dashed border-brand-augusta/40 bg-brand-augustaLight/40 text-center ${selected.doctors.length < 3 ? "p-6" : "p-4"}`}>
                  <p className="font-heading font-semibold text-foreground">¿Conoces a otro doctor de {selected.specialty}?</p>
                  <p className="text-sm text-muted-foreground mt-1">Sé el primero en recomendarlo: toma menos de un minuto.</p>
                  <Button asChild className="mt-3 rounded-xl min-h-[44px] gap-2 bg-brand-augusta hover:bg-brand-augustaDark text-white">
                    <Link to="/recomendaciones"><PenLine className="w-4 h-4" /> Recomendar a un doctor</Link>
                  </Button>
                </div>
              </section>
            ) : groups.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No encontramos doctores ni especialidades con ese nombre.</p>
            ) : (
              <div>
                <h2 className="font-heading font-semibold text-foreground mb-3">Elige una especialidad</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {visibleGroups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setParams({ especialidad: g.id })}
                      className="flex items-center justify-between gap-3 text-left bg-card rounded-2xl border border-brand-canvasBorder px-4 py-4 hover:border-primary/40 hover:shadow-card transition-all min-h-[64px]"
                    >
                      <span className="min-w-0">
                        <span className="block font-heading font-semibold text-foreground break-words">{g.specialty}</span>
                        <span className="block text-sm text-muted-foreground">{g.doctors.length} {g.doctors.length === 1 ? "doctor" : "doctores"}</span>
                      </span>
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                    </button>
                  ))}
                </div>
                {fold && (
                  <button type="button" onClick={() => setShowRest((v) => !v)} aria-expanded={showRest}
                    className="mt-3 w-full h-11 rounded-xl border border-input bg-card text-sm font-medium text-foreground hover:border-brand-augusta/50 inline-flex items-center justify-center gap-2">
                    {showRest ? "Ver menos especialidades" : `Ver otras especialidades (${rest.length})`}
                    <ChevronDown className={`w-4 h-4 transition-transform ${showRest ? "rotate-180" : ""}`} aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
