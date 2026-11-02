import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Info } from "lucide-react";
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

// /<especialidad> (antes /recomendados/:especialidad) -- landing por especialidad para mandar gente a recomendar a un doctor de ESA
// especialidad (2026-11-01, pedido de David). Plantilla de las 10 especialidades en src/lib/specialtyLandings.js.
// Datos: una sola llamada a get_specialty_recommendations_landing (base de datos), que ya cuenta solo a los doctores
// visibles, ordena por redes distintas y excluye los servicios con seo_restricted.
// Reglas: "Recomendado por N personas para…", nunca "mejor", "ofrece" ni "#1"; los servicios solo como conteos, nunca
// junto al nombre de quien recomienda; contador desde 3 recomendaciones; aviso de que son opiniones de pacientes.
// Sin enlaces desde el resto del sitio por ahora (bloque 5, pendiente de aprobar).

// Indexación: por decisión de David (2026-11-01) la página va SIEMPRE con noindex, nofollow, aunque la base diga
// `indexable` (3+ doctores y 5+ recomendaciones). Para dejar que Google indexe las que cumplan, cámbialo a true.
const ALLOW_INDEXING = false;
const COUNTER_FROM = 3; // con menos recomendaciones, en lugar del contador: "Sé el primero en recomendar a tu …"

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
  const utm = new URLSearchParams([...new URLSearchParams(search)].filter(([k]) => k.toLowerCase().startsWith("utm_"))).toString();
  const navigate = useNavigate();
  const tpl = findSpecialtyLanding(especialidad);
  const isCanonical = !!tpl && especialidad === tpl.key; // con specialty.slug (cardiologia) se redirige a la llave
  const [state, setState] = useState(tpl ? "loading" : "notfound"); // loading | ok | notfound | error
  const [data, setData] = useState(null);

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

      {/* 1. Portada: título, contador de recomendaciones de la especialidad (desde 3) y botón para recomendar. */}
      <section className={`${HERO_BG} pt-24 sm:pt-28 pb-14 text-center text-white`}>
        <div className="max-w-3xl mx-auto px-4">
          <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.18em] sm:tracking-[0.3em] text-white/75">Monterrey · San Pedro Garza García</p>
          <h1 className="mt-4 font-heading font-medium tracking-tight text-[clamp(1.85rem,9vw,2.6rem)] sm:text-[3.4rem] leading-[1.05]">
            {tpl.plural} <span className="text-emerald-200">recomendados</span>
          </h1>
          {total >= COUNTER_FROM ? (
            <>
              <RecommendationCounter total={total} srLabel={`recomendaciones de ${tpl.lower}`} />
              <p className="mt-2 text-sm text-white/85" aria-hidden="true">recomendaciones de {tpl.lower}</p>
            </>
          ) : (
            <p className="mt-5 text-lg text-white/90">Sé el primero en recomendar a {tpl.your}</p>
          )}
          <Link to={recommendTo}
            className="mt-7 inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-full bg-white text-brand-navy font-semibold shadow-lg shadow-black/10 hover:bg-white/90 transition-colors">
            Recomendar a {tpl.my} <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* 2. Los más recomendados de la especialidad (orden de la base: redes distintas, total, la más reciente). */}
      {doctors.length > 0 && (
        <section aria-labelledby="esp-mas-recomendados" className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-2 pb-10">
          <h2 id="esp-mas-recomendados" className="font-heading font-medium tracking-tight text-2xl sm:text-3xl text-brand-navy text-center">
            {tpl.plural} con más recomendaciones
          </h2>
          <CardSlider resetKey={doctors.map((d) => d.slug).join(",")} onSeen={onSeen} label={`${tpl.plural} con más recomendaciones`}
            prevLabel="Ver doctores anteriores" nextLabel="Ver más doctores" dots={false} bleed>
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

      {/* 4. Servicios sin doctores todavía: un botón para recomendar con ese servicio ya elegido. */}
      {withoutDoctors.length > 0 && (
        <section aria-labelledby="esp-recomienda-para" className="max-w-3xl mx-auto px-4 pb-12 text-center">
          <h2 id="esp-recomienda-para" className="font-heading font-medium tracking-tight text-xl sm:text-2xl text-brand-navy">
            {withDoctors.length > 0 ? `¿Recomiendas a ${tpl.your} para algo más?` : `¿Para qué recomiendas a ${tpl.your}?`}
          </h2>
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {withoutDoctors.map((s) => (
              <Link key={s.slug} to={`/?especialidad=${tpl.key}&servicio=${encodeURIComponent(s.slug)}${utm ? `&${utm}` : ""}`}
                className="inline-flex items-center min-h-11 px-4 py-2 rounded-full border border-white/80 bg-white/60 backdrop-blur-sm text-sm font-medium text-brand-navy hover:bg-white transition-colors">
                Recomienda para {lowerFirst(s.name)}
              </Link>
            ))}
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
