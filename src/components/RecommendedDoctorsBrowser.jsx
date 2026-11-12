import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ChevronDown, Search, Stethoscope, Flower2, Baby, Sparkles, HeartPulse, Brain, Apple, Droplet, Pill, MoreHorizontal } from "lucide-react";
import ToothIcon from "@/components/icons/ToothIcon";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SPECIALTY_LANDINGS } from "@/lib/specialtyLandings";
import RecommendedAvatar from "@/components/RecommendedAvatar";
import { recommendationTagLabel } from "@/lib/recommendationTags";
import { utmQuery, withUtm } from "@/lib/utm";
import { recordRecommendedViews } from "@/lib/recommendedViews";

// Bloque "Doctores recomendados" del inicio (CLAUDE.md §8r, Paso 60; búsqueda estilo Airbnb, Paso 62): debajo de la caja de recomendar,
// una barra en píldora con tres campos (Doctor, Especialidad, Ciudad) y un botón de buscar; en celular es un solo renglón que abre
// una pantalla con los campos. Debajo, pestañas con ícono por especialidad (las 10 principales + "Otras"), una fila de botones de
// subespecialidad cuando la especialidad tiene y la lista ordenada de más a menos recomendaciones (filas del mismo alto y "Ver más").
// Todo filtra al momento. "Sin verificar" va UNA vez arriba, no en cada fila. Si no encuentra a nadie, invita a recomendarlo.
const PAGE_SIZE = 8;
const norm = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
// Especialidades con página propia (/dentista, /pediatra…): mismas raíces que usa HomeCategorySlider.
const LANDING_MATCH = {
  "medico-general": /medic(o|ina) general/, ginecologo: /ginecolog/, pediatra: /^pediatr/, dentista: /dentist|odont/,
  dermatologo: /dermatolog/, cardiologo: /cardiolog/, psicologo: /psicolog/, nutriologo: /nutri/, endocrinologo: /endocrin/,
  gastroenterologo: /gastro/,
};
const landingKeyFor = (specialtyKey) => Object.keys(LANDING_MATCH).find((k) => LANDING_MATCH[k].test(specialtyKey)) || null;
// Las 10 pestañas (orden de src/lib/topSpecialties.js) y su ícono (los mismos del carrusel de especialidades).
const TAB_ICONS = {
  "medico-general": Stethoscope, ginecologo: Flower2, pediatra: Baby, dentista: ToothIcon, dermatologo: Sparkles,
  cardiologo: HeartPulse, psicologo: Brain, nutriologo: Apple, endocrinologo: Droplet, gastroenterologo: Pill,
};
const TAB_KEYS = Object.keys(TAB_ICONS);
const groupOf = (d) => landingKeyFor(norm(d.specialty));
const specMatches = (d, spec) => {
  if (spec === "todas") return true;
  if (spec === "otras") return !groupOf(d);
  if (spec.startsWith("g:")) return groupOf(d) === spec.slice(2);
  return (norm(d.specialty) || "otra") === spec;
};
const zoneLabel = (z) => String(z || "").replace(/San Pedro Garza Garc[ií]a/i, "San Pedro");

// Distancia de edición (para tolerar una letra mal escrita en palabras de 4 letras o más).
function lev(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
// Cada palabra escrita debe empezar igual que alguna palabra del nombre (sin "Dr./Dra."), o diferir en una letra.
function nameMatches(fullName, query) {
  const words = norm(fullName).replace(/\b(dr|dra|doctor|doctora)\b\.?/g, " ").split(/\s+/).filter(Boolean);
  const qs = norm(query).replace(/\b(dr|dra|doctor|doctora)\b\.?/g, " ").split(/\s+/).filter(Boolean);
  if (qs.length === 0) return true;
  return qs.every((q) => words.some((w) => w.startsWith(q) || (q.length >= 4 && lev(q, w.slice(0, q.length)) <= 1)));
}

function Tab({ icon: Icon, label, on, onClick }) {
  return (
    <button type="button" role="tab" aria-selected={on} onClick={onClick}
      className={`flex-none flex flex-col items-center gap-1 pb-2 pt-1 border-b-2 text-[13px] whitespace-nowrap transition-colors ${on ? "border-brand-navy text-brand-navy font-semibold" : "border-transparent text-brand-navy/60 hover:text-brand-navy"}`}>
      <Icon className="w-6 h-6" aria-hidden="true" />
      {label}
    </button>
  );
}

export default function RecommendedDoctorsBrowser({ data, onRecommend }) {
  const doctors = useMemo(() => (data && Array.isArray(data.doctors) ? data.doctors : []), [data]);
  const [q, setQ] = useState("");
  const [specialty, setSpecialty] = useState("todas");
  const [city, setCity] = useState("todas");
  const [sub, setSub] = useState("todas");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Al cambiar de especialidad se limpia la subespecialidad (cada especialidad tiene las suyas).
  // `specialty` es "todas", "g:<llave>" (una de las 10 con pestaña, junta Dentista + Odontopediatría, etc.), "otras" o la clave de una especialidad suelta.
  const pickSpecialty = (value) => { setSpecialty(value); setSub("todas"); setShown(PAGE_SIZE); };

  // Especialidades y ciudades que tienen doctores (especialidades de más recomendaciones a menos).
  const specialties = useMemo(() => {
    const map = new Map();
    doctors.forEach((d) => {
      const key = norm(d.specialty) || "otra";
      const cur = map.get(key) || { key, label: d.specialty || "Otra especialidad", recs: 0, n: 0 };
      cur.recs += Number(d.count) || 0; cur.n += 1; map.set(key, cur);
    });
    return [...map.values()].sort((a, b) => b.recs - a.recs || a.label.localeCompare(b.label, "es"));
  }, [doctors]);
  const cities = useMemo(() => {
    const map = new Map();
    doctors.forEach((d) => { const label = zoneLabel(d.zone); if (label) map.set(norm(label), { key: norm(label), label, n: (map.get(norm(label))?.n || 0) + 1 }); });
    return [...map.values()].sort((a, b) => b.n - a.n);
  }, [doctors]);

  // Subespecialidades de la especialidad elegida que sí tienen doctores (el menú solo sale si hay alguna).
  const subs = useMemo(() => {
    if (specialty === "todas") return [];
    const map = new Map();
    doctors.filter((d) => specMatches(d, specialty) && d.subspecialty).forEach((d) => {
      const key = norm(d.subspecialty);
      map.set(key, { key, label: d.subspecialty, n: (map.get(key)?.n || 0) + 1 });
    });
    return [...map.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, "es"));
  }, [doctors, specialty]);
  // Pestañas y opciones del menú: las 10 principales con doctores (con su número), "Otras" y las especialidades sueltas.
  const groups = useMemo(() => TAB_KEYS.map((k) => ({ key: k, title: SPECIALTY_LANDINGS[k]?.title || k, n: doctors.filter((d) => groupOf(d) === k).length })).filter((g) => g.n > 0), [doctors]);
  const others = useMemo(() => specialties.filter((x) => !landingKeyFor(x.key)), [specialties]);
  const othersCount = useMemo(() => doctors.filter((d) => !groupOf(d)).length, [doctors]);
  // Enlace a la página propia de la especialidad (/dentista…), si la tiene; conserva los utm_*.
  const landingKey = specialty.startsWith("g:") ? specialty.slice(2) : null;
  const landingTitle = landingKey ? SPECIALTY_LANDINGS[landingKey]?.title : null;
  const specialtyLabel = specialty === "todas" ? "Todas" : specialty === "otras" ? "Otras especialidades" : specialty.startsWith("g:") ? (SPECIALTY_LANDINGS[specialty.slice(2)]?.title || "") : (specialties.find((x) => x.key === specialty)?.label || "");
  const cityLabel = city === "todas" ? "Todas" : (cities.find((x) => x.key === city)?.label || "");
  const subLabel = sub === "todas" ? "" : (subs.find((x) => x.key === sub)?.label || "");

  const list = useMemo(() => {
    return doctors
      .filter((d) => specMatches(d, specialty))
      .filter((d) => sub === "todas" || norm(d.subspecialty) === sub)
      .filter((d) => city === "todas" || norm(zoneLabel(d.zone)) === city)
      .filter((d) => nameMatches(d.full_name, q))
      .sort((a, b) => (Number(b.count) || 0) - (Number(a.count) || 0) || String(a.full_name).localeCompare(String(b.full_name), "es"));
  }, [doctors, specialty, sub, city, q]);
  const visible = list.slice(0, shown);
  // Impresiones (CLAUDE.md §8r, paso 30): cuando el bloque está en pantalla, cuenta a los doctores que se ven en la lista
  // (la base cuenta una por visitante por doctor por día).
  const sectionRef = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [doctors.length]);
  const visibleKey = visible.map((d) => d.slug).join(",");
  useEffect(() => { if (inView && visibleKey) recordRecommendedViews(visibleKey.split(","), "impression"); }, [inView, visibleKey]);
  const filtering = q.trim() !== "" || specialty !== "todas" || city !== "todas";
  const reset = () => { setQ(""); setSpecialty("todas"); setSub("todas"); setCity("todas"); setShown(PAGE_SIZE); };

  const goToList = () => document.getElementById("doctores-lista")?.scrollIntoView({ behavior: "smooth", block: "start" });
  // Opciones del menú de especialidad: las 10 principales (con su número), "Otras" y después cada especialidad suelta.
  const specialtyOptions = (
    <>
      <option value="todas">Todas las especialidades</option>
      {groups.map((g) => <option key={g.key} value={`g:${g.key}`}>{g.title} ({g.n})</option>)}
      {othersCount > 0 && <option value="otras">Otras especialidades ({othersCount})</option>}
      {others.map((x) => <option key={x.key} value={x.key}>{x.label} ({x.n})</option>)}
    </>
  );
  // Resumen de lo elegido (para el renglón del celular).
  const summary = [q.trim(), specialty !== "todas" ? specialtyLabel : "", subLabel, city !== "todas" ? cityLabel : ""].filter(Boolean);
  return (
    <section id="doctores" ref={sectionRef} className="bg-gradient-to-b from-brand-flowMist to-brand-flowSky pt-8 pb-12 sm:py-14 scroll-mt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <h2 className="font-heading text-xl sm:text-2xl text-brand-navy"><span className="font-semibold">Doctores</span> <span className="font-normal">recomendados</span></h2>
        <p className="mt-1 text-sm text-brand-navy/70">Perfiles sin verificar: son opiniones de pacientes, no una valoración médica.</p>

        {data === null ? (
          <p className="text-center text-sm text-muted-foreground mt-8">Cargando…</p>
        ) : doctors.length === 0 ? (
          <p className="mt-6 text-sm text-brand-navy/80">Aquí aparecerán los doctores recomendados. Sé el primero: recomienda a tu doctor arriba.</p>
        ) : (
          <>
            {/* Barra en píldora (computadora): tres campos y botón de buscar. Cada campo es un área completa en la que se puede tocar. */}
            <div className="hidden sm:flex items-stretch max-w-3xl mx-auto mt-6 bg-white rounded-full shadow-md border border-brand-navy/10 p-1.5">
              <label className="relative flex-[1.2] min-w-0 px-5 py-1.5 rounded-full hover:bg-brand-flowMist/70 cursor-text">
                <span className="block text-[11px] font-semibold text-brand-navy">Doctor</span>
                <input type="search" value={q} onChange={(e) => { setQ(e.target.value.slice(0, 60)); setShown(PAGE_SIZE); }} placeholder="Buscar por nombre" autoComplete="off"
                  className="w-full bg-transparent text-sm text-brand-navy placeholder:text-brand-navy/50 outline-none truncate" />
              </label>
              <span className="w-px my-2 bg-brand-navy/10" aria-hidden="true" />
              <div className="relative flex-1 min-w-0 px-5 py-1.5 rounded-full hover:bg-brand-flowMist/70 cursor-pointer">
                <span className="block text-[11px] font-semibold text-brand-navy">Especialidad</span>
                <span className="block text-sm text-brand-navy truncate">{specialtyLabel}</span>
                <select value={specialty} onChange={(e) => pickSpecialty(e.target.value)} aria-label="Especialidad" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                  {specialtyOptions}
                </select>
              </div>
              <span className="w-px my-2 bg-brand-navy/10" aria-hidden="true" />
              <div className="relative flex-1 min-w-0 px-5 py-1.5 rounded-full hover:bg-brand-flowMist/70 cursor-pointer">
                <span className="block text-[11px] font-semibold text-brand-navy">Ciudad</span>
                <span className="block text-sm text-brand-navy truncate">{cityLabel}</span>
                <select value={city} onChange={(e) => { setCity(e.target.value); setShown(PAGE_SIZE); }} aria-label="Ciudad" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                  <option value="todas">Todas las ciudades</option>
                  {cities.map((c) => <option key={c.key} value={c.key}>{c.label} ({c.n})</option>)}
                </select>
              </div>
              <button type="button" onClick={goToList} aria-label="Ver resultados" className="w-12 h-12 flex-none rounded-full bg-brand-blue hover:bg-brand-blue/90 text-white flex items-center justify-center transition-colors">
                <Search className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Celular: un solo renglón que abre la pantalla de búsqueda. */}
            <button type="button" onClick={() => setSheetOpen(true)} aria-haspopup="dialog"
              className="sm:hidden mt-4 w-full flex items-center gap-3 bg-white rounded-full shadow-md border border-brand-navy/10 px-4 py-2.5 text-left">
              <Search className="w-5 h-5 flex-none text-brand-navy" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-brand-navy truncate">{summary.length ? summary.join(" · ") : "Buscar doctor"}</span>
                <span className="block text-xs text-brand-navy/60 truncate">{summary.length ? `${list.length} ${list.length === 1 ? "doctor" : "doctores"}` : "Nombre, especialidad o ciudad"}</span>
              </span>
            </button>

            {/* Pestañas con ícono por especialidad (las 10 principales con doctores y "Otras"). */}
            <div className="mt-5 overflow-x-auto border-b border-brand-navy/15 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div role="tablist" aria-label="Especialidad" className="flex w-max min-w-full sm:justify-center gap-5 sm:gap-7 px-0.5">
                <Tab icon={Heart} label="Todos" on={specialty === "todas"} onClick={() => pickSpecialty("todas")} />
                {groups.map((g) => <Tab key={g.key} icon={TAB_ICONS[g.key]} label={g.title} on={specialty === `g:${g.key}`} onClick={() => pickSpecialty(`g:${g.key}`)} />)}
                {othersCount > 0 && <Tab icon={MoreHorizontal} label="Otras" on={specialty === "otras"} onClick={() => pickSpecialty("otras")} />}
              </div>
            </div>
            {/* Subespecialidad: solo si la especialidad elegida tiene doctores con subespecialidad. */}
            {subs.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Subespecialidad">
                {[{ key: "todas", label: "Todas" }, ...subs].map((x) => (
                  <button key={x.key} type="button" aria-pressed={sub === x.key} onClick={() => { setSub(x.key); setShown(PAGE_SIZE); }}
                    className={`h-8 px-3.5 rounded-full text-sm font-medium transition-colors ${sub === x.key ? "bg-brand-navy text-white" : "bg-white/80 text-brand-navy hover:bg-white"}`}>
                    {x.label}
                  </button>
                ))}
              </div>
            )}
            <p id="doctores-lista" className="mt-3 text-sm text-brand-navy/70 scroll-mt-24" aria-live="polite">
              {list.length} {list.length === 1 ? "doctor" : "doctores"}
              {filtering && <> · <button type="button" onClick={reset} className="underline hover:text-brand-navy">Quitar filtros</button></>}
              {landingKey && <> · <Link to={withUtm(`/${landingKey}`, utmQuery(window.location.search))} className="underline hover:text-brand-navy">Ver página de {landingTitle}</Link></>}
            </p>

            {list.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-brand-navy/25 bg-white/50 px-5 py-8 text-center">
                <Heart className="w-8 h-8 text-brand-blue mx-auto mb-2" aria-hidden="true" />
                <p className="font-heading font-semibold text-foreground">No lo vemos todavía</p>
                <p className="text-sm text-muted-foreground mt-1">Sé el primero en recomendarlo: toma un minuto.</p>
                <button type="button" onClick={() => onRecommend?.(q.trim())} className="inline-flex items-center justify-center mt-4 h-10 px-5 rounded-full bg-brand-blue hover:bg-brand-blue/90 text-white text-sm font-semibold transition-colors">
                  Recomendar a mi doctor
                </button>
              </div>
            ) : (
              <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {visible.map((d) => {
                  const recs = Number(d.count) || 0;
                  const tag = (d.top_tags || [])[0];
                  return (
                    <li key={d.slug}>
                      <Link to={`/recomendado-flow/${d.slug}`} className="flex items-center gap-3 h-[88px] rounded-2xl border border-white/80 bg-white/70 hover:bg-white backdrop-blur-sm px-3.5 transition-colors">
                        <RecommendedAvatar photo={d.photo} name={d.full_name} className="w-12 h-12" />
                        <div className="min-w-0 flex-1">
                          <p className="font-heading font-semibold text-foreground truncate">{d.full_name}</p>
                          <p className="text-sm text-muted-foreground truncate">{[d.subspecialty || d.specialty, zoneLabel(d.zone)].filter(Boolean).join(" · ")}</p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] whitespace-nowrap">
                            <Heart className="w-4 h-4 flex-shrink-0 fill-red-500 text-red-500" aria-hidden="true" />
                            <span className="text-brand-blue font-medium">({recs} {recs === 1 ? "recomendación" : "recomendaciones"})</span>
                            {tag && <span className="hidden sm:inline-block ml-1 truncate max-w-[9rem] text-xs bg-brand-bluePale text-brand-navy px-2 py-0.5 rounded-full">{recommendationTagLabel(tag.tag)}</span>}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            {list.length > shown && (
              <div className="mt-4 text-center">
                <button type="button" onClick={() => setShown((n) => n + PAGE_SIZE)} className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full border border-white bg-white/70 hover:bg-white text-sm font-semibold text-brand-navy transition-colors">
                  Ver más ({list.length - shown}) <ChevronDown className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pantalla de búsqueda del celular: los mismos filtros, un campo por renglón y a todo lo ancho (sin menús cortados). */}
      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent aria-describedby={undefined} className="w-[calc(100vw-1.5rem)] max-w-md rounded-2xl p-5 gap-3 max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading text-lg text-brand-navy">Buscar doctor</DialogTitle></DialogHeader>
          <label className="block">
            <span className="block text-sm font-semibold text-brand-navy mb-1">Doctor</span>
            <input type="search" value={q} onChange={(e) => { setQ(e.target.value.slice(0, 60)); setShown(PAGE_SIZE); }} placeholder="Nombre y apellido" autoComplete="off"
              className="h-12 w-full rounded-xl border border-border px-3 text-base text-brand-navy placeholder:text-brand-navy/50 focus:outline-none focus:ring-2 focus:ring-brand-blue/40" />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-brand-navy mb-1">Especialidad</span>
            <select value={specialty} onChange={(e) => pickSpecialty(e.target.value)} className="h-12 w-full rounded-xl border border-border bg-white px-3 text-base text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-blue/40">{specialtyOptions}</select>
          </label>
          {subs.length > 0 && (
            <label className="block">
              <span className="block text-sm font-semibold text-brand-navy mb-1">Subespecialidad</span>
              <select value={sub} onChange={(e) => { setSub(e.target.value); setShown(PAGE_SIZE); }} className="h-12 w-full rounded-xl border border-border bg-white px-3 text-base text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-blue/40">
                <option value="todas">Todas</option>
                {subs.map((x) => <option key={x.key} value={x.key}>{x.label} ({x.n})</option>)}
              </select>
            </label>
          )}
          <label className="block">
            <span className="block text-sm font-semibold text-brand-navy mb-1">Ciudad</span>
            <select value={city} onChange={(e) => { setCity(e.target.value); setShown(PAGE_SIZE); }} className="h-12 w-full rounded-xl border border-border bg-white px-3 text-base text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-blue/40">
              <option value="todas">Todas las ciudades</option>
              {cities.map((c) => <option key={c.key} value={c.key}>{c.label} ({c.n})</option>)}
            </select>
          </label>
          <div className="flex items-center justify-between gap-3 pt-2">
            <button type="button" onClick={reset} className="text-sm font-medium text-brand-navy underline">Borrar todo</button>
            <button type="button" onClick={() => { setSheetOpen(false); window.setTimeout(goToList, 150); }} className="h-12 px-6 rounded-xl bg-brand-blue hover:bg-brand-blue/90 text-white text-sm font-semibold transition-colors">
              Ver {list.length} {list.length === 1 ? "doctor" : "doctores"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
