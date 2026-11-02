import { useCallback, useEffect, useId, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, ChevronDown, Info } from "lucide-react";
import { base44 } from "@/api/base44Client";
import LoadingLogo from "@/components/LoadingLogo";
import LoadError from "@/components/LoadError";
import FlowNav from "@/components/FlowNav";
import CardSlider from "@/components/CardSlider";
import RecommendedDoctorCard from "@/components/RecommendedDoctorCard";
import RecommendationCounter from "@/components/RecommendationCounter";
import { recordRecommendedViews } from "@/lib/recommendedViews";
import { setCanonical } from "@/lib/seoMeta";
import { findSpecialtyLanding } from "@/lib/specialtyLandings";
import { utmQuery } from "@/lib/utm";

// /<especialidad> (antes /recomendados/:especialidad) -- landing por especialidad para mandar gente a recomendar a un doctor de ESA
// especialidad (2026-11-01, pedido de David). Plantilla de las 10 especialidades en src/lib/specialtyLandings.js.
// Datos: una sola llamada a get_specialty_recommendations_landing (base de datos), que ya cuenta solo a los doctores
// visibles, ordena por redes distintas y excluye los servicios con seo_restricted.
// Reglas: "Recomendado por N personas para…", nunca "mejor", "ofrece" ni "#1"; los servicios solo como conteos, nunca
// junto al nombre de quien recomienda; contador SIEMPRE, también en 0 (antes desde 3; con 1 o 2 decía "Sé el primero…"
// aunque ya hubiera doctores; pedido de David 2026-11-02); aviso de que son opiniones de pacientes.
// Sin enlaces desde el resto del sitio por ahora (bloque 5, pendiente de aprobar).

// Indexación: por decisión de David (2026-11-01) la página va SIEMPRE con noindex, nofollow, aunque la base diga
// `indexable` (3+ doctores y 5+ recomendaciones). Para dejar que Google indexe las que cumplan, cámbialo a true.
const ALLOW_INDEXING = false;

const HERO_BG = "bg-[linear-gradient(to_bottom,theme(colors.brand.flowHeroTop)_0%,theme(colors.brand.flowHeroTop)_12%,theme(colors.brand.flowHeroMid)_45%,theme(colors.brand.flowHeroLow)_75%,theme(colors.brand.flowMist)_100%)]";

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}
const people = (n) => `${n} ${n === 1 ? "persona" : "personas"}`;
// "Limpieza dental" -> "limpieza dental" dentro de una frase (sin tocar siglas como "VPH").
const lowerFirst = (s) => (s && s.length > 1 && s[1] === s[1].toLowerCase() ? s[0].toLowerCase() + s.slice(1) : s || "");

// `especialidad` llega como dato desde las 10 rutas fijas /<llave> (App.jsx); si no, de /recomendados/:especialidad.
export default function RecomendadosEspecialidad({ especialidad: fixed }) {
  const { especialidad: fromUrl } = useParams();
  const especialidad = fixed || fromUrl;
  // Los utm_* con que llegan (p. ej. desde TikTok) viajan en "Recomendar a mi …" y "Recomienda para X" hacia el
  // formulario del inicio, para que la medición siga viendo de dónde vino la recomendación (2026-11-02).
  const { search } = useLocation();
  const utm = utmQuery(search);
  const navigate = useNavigate();
  const tpl = findSpecialtyLanding(especialidad);
  const isCanonical = !!tpl && especialidad === tpl.key; // con specialty.slug (cardiologia) se redirige a la llave
  const [state, setState] = useState(tpl ? "loading" : "notfound"); // loading | ok | notfound | error
  const [data, setData] = useState(null);
  const [servicio, setServicio] = useState("");
  const servicioId = useId();

  const load = useCallback(async () => {
    if (!tpl) { setState("notfound"); return; }
    setState("loading");
    try {
      const { data: d } = await base44.functions.invoke("getSpecialtyRecommendationsLanding", { especialidad: tpl.key });
      if (!d?.ok) { setState("notfound"); return; }
      setData(d);
      setState("ok");
    } catch {
      setState("error");
    }
  }, [tpl]);
  useEffect(() => { if (isCanonical) load(); }, [isCanonical, load]);

  useEffect(() => {
    setMeta("robots", ALLOW_INDEXING && state === "ok" && data?.indexable ? "index, follow" : "noindex, nofollow");
    if (!tpl || state === "notfound") { document.title = "Especialidad no encontrada | BuscoUnDoctor"; return; }
    document.title = `${tpl.plural} recomendados por pacientes en Monterrey | BuscoUnDoctor`;
    setMeta("description", `${tpl.plural} de Monterrey y San Pedro Garza García recomendados por sus pacientes. Recomienda a ${tpl.your} en un minuto.`);
    setCanonical(`/${tpl.key}`);
  }, [tpl, state, data]);

  if (tpl && !isCanonical) return <Navigate to={`/${tpl.key}`} replace />;
  if (state === "loading") return <div className="min-h-screen bg-brand-flowMist flex items-center justify-center"><LoadingLogo /></div>;
  if (state === "error") return <LoadError onRetry={load} />;
  if (state === "notfound") {
    return (
      <div className={`min-h-screen ${HERO_BG} flex flex-col items-center justify-center px-6 text-center`}>
        <FlowNav base="/" />
        <h1 className="font-heading font-medium tracking-tight text-3xl text-white">No encontramos esta especialidad</h1>
        <p className="text-white/80 mt-2 max-w-sm">Puede que el enlace esté incompleto o que la página ya no esté disponible.</p>
        <Link to="/" className="mt-6 inline-flex items-center h-12 px-6 rounded-full bg-white text-brand-navy font-semibold">Recomendar a un doctor</Link>
      </div>
    );
  }

  const total = Number(data.total_recs) || 0;
  const doctors = (data.doctors || []).map((d) => ({ ...d, specialty: data.specialty?.name }));
  const services = data.services || [];
  const withDoctors = services.filter((s) => (s.doctors || []).length > 0);
  const withoutDoctors = services.filter((s) => (s.doctors || []).length === 0);
  const recommendTo = `/?especialidad=${tpl.key}${utm ? `&${utm}` : ""}`;
  const recommend = (slug, servicio) => navigate(`/?doctor=${encodeURIComponent(slug)}${servicio ? `&servicio=${encodeURIComponent(servicio)}` : ""}`);
  // Vistas solo de doctores recomendados (las de perfiles registrados se cuentan en su propia página).
  const suggestionSlugs = new Set(doctors.filter((d) => d.kind === "suggestion").map((d) => d.slug));
  const onSeen = (slug) => { if (suggestionSlugs.has(slug)) recordRecommendedViews([slug], "impression"); };

  return (
    <div className="min-h-screen bg-brand-flowMist" style={{ "--ring": "220 26% 39%" }}>
      <FlowNav base="/" ctaTo={recommendTo} />

      {/* 1. Portada: título (la palabra "recomendados" en el color de la tarjeta de su especialidad, `tpl.from`, 2026-11-02),
          contador de recomendaciones (también en 0, sin el texto "recomendaciones de …" debajo; lo lee el lector de pantalla)
          y botón para recomendar. */}
      {/* Arriba, el mismo aire que el inicio entre el menú y "Monterrey · San Pedro…" (2026-11-02, pedido de David): ahí
          el texto queda a 119 px del borde en celular y 134 px desde tableta (pt-28/pt-32 más ~7 px de su renglón). */}
      <section className={`${HERO_BG} pt-[119px] sm:pt-[134px] pb-14 text-center text-white`}>
        <div className="max-w-3xl mx-auto px-4">
          <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.18em] sm:tracking-[0.3em] text-white/75">Monterrey · San Pedro Garza García</p>
          <h1 className="mt-4 font-heading font-medium tracking-tight text-[clamp(1.85rem,9vw,2.6rem)] sm:text-[3.4rem] leading-[1.05]">
            {tpl.plural} <span style={{ color: tpl.from }}>recomendados</span>
          </h1>
          <RecommendationCounter total={total} srLabel={`recomendaciones de ${tpl.lower}`} />
          <Link to={recommendTo}
            className="mt-7 inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-full bg-white text-brand-navy font-semibold shadow-lg shadow-black/10 hover:bg-white/90 transition-colors">
            Recomendar a {tpl.my} <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* 2. Los más recomendados de la especialidad (orden de la base: redes distintas, total, la más reciente). */}
      {doctors.length > 0 && (
        <section aria-labelledby="esp-mas-recomendados" className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-2 pb-10">
          {/* Mismo estilo y lugar que "Dentistas con más recomendaciones" del inicio (2026-11-02, pedido de David): a la
              izquierda, 18/20 px, la especialidad en seminegritas, y 14 px hasta el carrusel. */}
          <h2 id="esp-mas-recomendados" className="font-heading text-lg sm:text-xl text-brand-navy">
            <span className="font-semibold">{tpl.plural}</span> <span className="font-normal">con más recomendaciones</span>
          </h2>
          <CardSlider resetKey={doctors.map((d) => d.slug).join(",")} onSeen={onSeen} label={`${tpl.plural} con más recomendaciones`}
            prevLabel="Ver doctores anteriores" nextLabel="Ver más doctores" dots={false} bleed className="mt-3.5">
            {doctors.map((d) => (
              <RecommendedDoctorCard key={d.slug} d={d} count={doctors.length} href={d.href} unverified={d.kind !== "specialist"}
                onRecommend={(slug) => recommend(slug)} />
            ))}
          </CardSlider>
        </section>
      )}

      {/* 3. Un carrusel por servicio que ya tiene doctores (solo conteos; nunca quién recomendó). */}
      {withDoctors.map((s) => {
        // La lista por servicio no trae `kind`: se toma de la lista principal (si no está ahí, se asume recomendado).
        const kindOf = Object.fromEntries(doctors.map((d) => [d.slug, d.kind]));
        const docs = s.doctors.map((d) => ({ ...d, kind: d.kind || kindOf[d.slug] || (d.href?.startsWith("/especialista/") ? "specialist" : "suggestion"), specialty: data.specialty?.name }));
        const id = `esp-servicio-${s.slug}`;
        return (
          <section key={s.slug} aria-labelledby={id} className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pb-10">
            <h2 id={id} className="font-heading font-medium tracking-tight text-xl sm:text-2xl text-brand-navy">
              Recomendados para {lowerFirst(s.name)}
            </h2>
            <CardSlider resetKey={docs.map((d) => d.slug).join(",")} onSeen={onSeen} label={`Recomendados para ${lowerFirst(s.name)}`}
              prevLabel="Ver doctores anteriores" nextLabel="Ver más doctores" dots={false} bleed className="mt-4">
              {docs.map((d) => (
                <RecommendedDoctorCard key={d.slug} d={d} count={docs.length} href={d.href} unverified={d.kind !== "specialist"}
                  note={`Recomendado por ${people(d.count)} para ${lowerFirst(s.name)}`}
                  onRecommend={(slug) => recommend(slug, s.slug)} />
              ))}
            </CardSlider>
          </section>
        );
      })}

      {/* 4. Servicios sin doctores todavía: una lista desplegable para elegir el servicio y un botón que lleva al formulario
          con ese servicio ya elegido (antes un botón por servicio; pedido de David 2026-11-02: que no ocupe tanto). */}
      {withoutDoctors.length > 0 && (
        <section aria-labelledby="esp-recomienda-para" className="max-w-xl mx-auto px-4 pb-12 text-center">
          <h2 id="esp-recomienda-para" className="font-heading font-medium tracking-tight text-xl sm:text-2xl text-brand-navy">
            {withDoctors.length > 0 ? `¿Recomiendas a ${tpl.your} para algo más?` : `¿Para qué recomiendas a ${tpl.your}?`}
          </h2>
          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <label htmlFor={servicioId} className="sr-only">Elige para qué lo recomiendas</label>
            {/* Misma altura (h-12) y mismo texto (14 px, seminegritas) que el botón "Recomendar"; appearance-none con su propia
                flecha para que Safari del iPhone no la dibuje más baja o más alta que el botón. */}
            <div className="relative flex-1">
              <select id={servicioId} value={servicio} onChange={(e) => setServicio(e.target.value)}
                className="appearance-none w-full h-12 pl-5 pr-11 rounded-full border border-white/80 bg-white/80 text-sm font-semibold text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy">
                <option value="">Elige para qué…</option>
                {withoutDoctors.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-navy" aria-hidden="true" />
            </div>
            {servicio ? (
              <Link to={`/?especialidad=${tpl.key}&servicio=${encodeURIComponent(servicio)}${utm ? `&${utm}` : ""}`}
                className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-brand-navy text-white text-sm font-semibold hover:bg-brand-navy/90 transition-colors">
                Recomendar <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            ) : (
              <button type="button" disabled aria-disabled="true"
                className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-brand-navy/40 text-white text-sm font-semibold cursor-not-allowed">
                Recomendar <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </section>
      )}

      {/* 5. Aviso */}
      <footer className="max-w-2xl mx-auto px-4 pb-16">
        <p className="flex items-start gap-2 rounded-2xl border border-white/80 bg-white/60 backdrop-blur-sm px-4 py-3 text-sm text-brand-navy/80">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>Son opiniones de pacientes, no una valoración médica. Los perfiles no están verificados y cada recomendación se revisa antes de publicarse.</span>
        </p>
      </footer>
    </div>
  );
}
