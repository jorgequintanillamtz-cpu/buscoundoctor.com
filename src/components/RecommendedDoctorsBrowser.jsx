import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ChevronDown, Search, X } from "lucide-react";
import RecommendedAvatar from "@/components/RecommendedAvatar";
import { recommendationTagLabel } from "@/lib/recommendationTags";
import { utmQuery, withUtm } from "@/lib/utm";
import { recordRecommendedViews } from "@/lib/recommendedViews";

// VISTA DE PRUEBA (CLAUDE.md §8r, Paso 60; solo con ?vista=lista, no es lo publicado): un solo bloque "Doctores recomendados" en lugar de
// los carruseles apilados. Arriba: un buscador por nombre y dos menús (especialidad y ciudad). Debajo, una lista ordenada de más a
// menos recomendaciones, con filas del mismo alto (avatar chico, nombre, ❤ (N recomendaciones), especialidad · zona y una etiqueta) y "Ver más".
// "Sin verificar" va UNA vez en la línea de arriba, no en cada fila. No se muestra "Nuevo". Si la búsqueda no encuentra a nadie, invita a recomendarlo.
const PAGE_SIZE = 8;
const norm = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
// Especialidades con página propia (/dentista, /pediatra…): mismas raíces que usa HomeCategorySlider.
const LANDING_MATCH = {
  "medico-general": /medic(o|ina) general/, ginecologo: /ginecolog/, pediatra: /^pediatr/, dentista: /dentist|odont/,
  dermatologo: /dermatolog/, cardiologo: /cardiolog/, psicologo: /psicolog/, nutriologo: /nutri/, endocrinologo: /endocrin/,
  gastroenterologo: /gastro/,
};
const landingKeyFor = (specialtyKey) => Object.keys(LANDING_MATCH).find((k) => LANDING_MATCH[k].test(specialtyKey)) || null;
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

export default function RecommendedDoctorsBrowser({ data, onRecommend }) {
  const doctors = useMemo(() => (data && Array.isArray(data.doctors) ? data.doctors : []), [data]);
  const [q, setQ] = useState("");
  const [specialty, setSpecialty] = useState("todas");
  const [city, setCity] = useState("todas");
  const [sub, setSub] = useState("todas");
  const [shown, setShown] = useState(PAGE_SIZE);
  // Al cambiar de especialidad se limpia la subespecialidad (cada especialidad tiene las suyas).
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
    doctors.filter((d) => (norm(d.specialty) || "otra") === specialty && d.subspecialty).forEach((d) => {
      const key = norm(d.subspecialty);
      map.set(key, { key, label: d.subspecialty, n: (map.get(key)?.n || 0) + 1 });
    });
    return [...map.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, "es"));
  }, [doctors, specialty]);
  // Enlace a la página propia de la especialidad (/dentista…), si la tiene; conserva los utm_*.
  const landingKey = specialty === "todas" ? null : landingKeyFor(specialty);
  const landingTitle = landingKey ? specialties.find((x) => x.key === specialty)?.label : null;

  const list = useMemo(() => {
    return doctors
      .filter((d) => specialty === "todas" || (norm(d.specialty) || "otra") === specialty)
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
  const selectCls = "h-11 rounded-xl border border-white bg-white/80 px-3 text-sm text-brand-navy font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/40 w-full";

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
            {/* Buscador por nombre + menús de especialidad y ciudad. */}
            <div className="mt-4 grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_14rem_11rem]">
              <div className="relative">
                <Search className="w-4 h-4 text-brand-navy/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                <input type="search" value={q} onChange={(e) => { setQ(e.target.value.slice(0, 60)); setShown(PAGE_SIZE); }} placeholder="Buscar por nombre" aria-label="Buscar doctor por nombre"
                  className="h-11 w-full rounded-xl border border-white bg-white/80 pl-10 pr-9 text-sm text-brand-navy placeholder:text-brand-navy/50 focus:outline-none focus:ring-2 focus:ring-brand-blue/40" />
                {q && <button type="button" onClick={() => { setQ(""); setShown(PAGE_SIZE); }} aria-label="Borrar búsqueda" className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-brand-navy/60 hover:bg-brand-navy/10 flex items-center justify-center"><X className="w-4 h-4" /></button>}
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:contents">
                <select value={specialty} onChange={(e) => pickSpecialty(e.target.value)} aria-label="Especialidad" className={selectCls}>
                  <option value="todas">Todas las especialidades</option>
                  {specialties.map((s) => <option key={s.key} value={s.key}>{s.label} ({s.n})</option>)}
                </select>
                <select value={city} onChange={(e) => { setCity(e.target.value); setShown(PAGE_SIZE); }} aria-label="Ciudad" className={selectCls}>
                  <option value="todas">Todas las ciudades</option>
                  {cities.map((c) => <option key={c.key} value={c.key}>{c.label} ({c.n})</option>)}
                </select>
              </div>
            </div>
            {/* Subespecialidad: solo si la especialidad elegida tiene doctores con subespecialidad. */}
            {subs.length > 0 && (
              <select value={sub} onChange={(e) => { setSub(e.target.value); setShown(PAGE_SIZE); }} aria-label="Subespecialidad" className={`${selectCls} mt-2.5 sm:w-72`}>
                <option value="todas">Todas las subespecialidades</option>
                {subs.map((x) => <option key={x.key} value={x.key}>{x.label} ({x.n})</option>)}
              </select>
            )}
            <p className="mt-2.5 text-sm text-brand-navy/70" aria-live="polite">
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
    </section>
  );
}
