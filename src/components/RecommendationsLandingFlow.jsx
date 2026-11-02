// Parte de abajo de /recomendaciones-flow (ver RecomendacionesFlow.jsx), copiada de RecommendationsLandingNueva.jsx.
// Degradado continuo: doctores (flowMist → flowSky), especialidades (flowSky → flowDeep), invitar y preguntas
// (flowDeep), cierre y pie (flowDeep → flowBright). Cada sección empieza donde terminó la anterior.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Heart, Share2,
  Stethoscope, Flower2, HeartPulse, Brain, Sparkles, Apple, Eye, Bone, Ear, Wind, Pill, Droplet, Activity,
  Scissors, Leaf, Ribbon, Hand, Dumbbell, Syringe, ShieldPlus,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import CardSlider from "@/components/CardSlider";
import DoctorCard from "@/components/RecommendedDoctorCard";
import RecommendationMedal from "@/components/RecommendationMedal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { recordRecommendedViews } from "@/lib/recommendedViews";
import { supportWhatsAppLink } from "@/components/DoctorSupportWhatsApp";

// Secciones de la landing de recomendaciones (CLAUDE.md §8r, pasos 26 y 28): van debajo del formulario de
// /recomendaciones. Orden: doctores recomendados, lo que dicen los pacientes, invitar a un amigo,
// preguntas frecuentes y pie.
// Los datos salen de una sola consulta (`list_recommendations_landing`); si falla, solo se ocultan las partes
// con datos. Reglas: nada de estrellas ni "mejores"; los doctores van como "Sin verificar"; nunca el correo (el apellido, solo si quien recomienda no lo ocultó).

const PAGE_URL = "https://buscoundoctor.com/"; // el inicio (antes /recomendaciones, que ahora redirige aquí)
// Categorías de doctores (mismo orden que las 10 más comunes de topSpecialties.js). Hoy solo alimentan los carruseles
// fijos de abajo (FIXED_CATEGORIES): las burbujas para elegir categoría se quitaron el 2026-11-02 (pedido de David)
// porque repetían el carrusel "Recomendados por especialidad" de arriba (HomeCategorySlider.jsx).
// `match` compara contra la especialidad sin acentos ni mayúsculas; un doctor entra en la PRIMERA que coincida.
const CATEGORIES = [
  { key: "medicina-general", title: "Médicos generales", one: "un buen médico general", match: (sp) => /medic(o|ina) general/.test(sp) },
  { key: "ginecologos", title: "Ginecólogos", one: "un buen ginecólogo", match: (sp) => /ginecolog/.test(sp) },
  { key: "pediatras", title: "Pediatras", one: "un buen pediatra", landing: "pediatra", match: (sp) => /^pediatr/.test(sp) },
  { key: "dentistas", title: "Dentistas", one: "un buen dentista", landing: "dentista", match: (sp) => /dentist|odont/.test(sp) },
  { key: "dermatologos", title: "Dermatólogos", one: "un buen dermatólogo", landing: "dermatologo", match: (sp) => /dermatolog/.test(sp) },
  { key: "cardiologos", title: "Cardiólogos", one: "un buen cardiólogo", match: (sp) => /cardiolog/.test(sp) },
  { key: "ortopedistas", title: "Ortopedistas", one: "un buen ortopedista", match: (sp) => /ortoped|traumatolog/.test(sp) },
  { key: "oftalmologos", title: "Oftalmólogos", one: "un buen oftalmólogo", match: (sp) => /oftalmolog/.test(sp) },
  { key: "psicologos", title: "Psicólogos", one: "un buen psicólogo", match: (sp) => /psicolog/.test(sp) },
  { key: "nutriologos", title: "Nutriólogos", one: "un buen nutriólogo", match: (sp) => /nutri/.test(sp) },
];
// Carruseles fijos que van ARRIBA del de todos los doctores, en este orden (claves de CATEGORIES).
const FIXED_CATEGORIES = ["dentistas", "pediatras", "dermatologos"];
const NEW_DAYS = 7; // "Nuevo": recomendado en los últimos 7 días
const DAY_MS = 86400000;

const norm = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const isNew = (d) => !!d.last_at && Date.now() - new Date(d.last_at).getTime() <= NEW_DAYS * DAY_MS;

// Una sola consulta para toda la página (la usan las secciones de abajo y la columna de la derecha en escritorio).
// null = cargando | { total, doctors, comments } | false = falló
export function useLandingData() {
  const [data, setData] = useState(null);
  useEffect(() => {
    let active = true;
    base44.functions.invoke("listRecommendationsLanding")
      .then(({ data: d }) => { if (active) setData(d && Array.isArray(d.doctors) ? d : false); })
      .catch(() => { if (active) setData(false); });
    return () => { active = false; };
  }, []);
  return data;
}

export { RecommendationMedal }; // RecomendadoFlow.jsx lo importa desde aquí

// También se publica como datos estructurados (FAQPage) en el inicio: RecomendacionesFlow.jsx.
export const FAQ = [
  { q: "¿Quién ve mi nombre?", a: "Tu nombre y apellido aparecen junto a tu recomendación, para dar confianza. Si prefieres, marca \"No mostrar mi apellido\" y solo se verá tu nombre. Tu correo nunca se muestra." },
  { q: "¿El doctor se entera de que fui yo?", a: "El doctor ve tu recomendación con el mismo nombre que ven todos (sin apellido si así lo elegiste), y también tu mensaje privado si le dejaste uno. Nunca ve tu correo." },
  { q: "¿Por qué piden mi correo?", a: "Para confirmar que eres una persona real y evitar recomendaciones repetidas o falsas. No se muestra públicamente." },
  { q: "¿Puedo recomendar a más de un doctor?", a: "Sí. Puedes recomendar a todos los doctores que quieras, una vez por cada uno." },
  { q: "¿Por qué mi recomendación no aparece de inmediato?", a: "Porque el equipo de BuscoUnDoctor revisa cada recomendación y cada comentario antes de publicarlos." },
  { q: "¿Qué significa \"Sin verificar\"?", a: "Que ese doctor todavía no ha reclamado su perfil en BuscoUnDoctor. Los datos vienen de lo que escribieron los pacientes y, cuando se indica, de la consulta de su cédula en el registro público de la SEP." },
  { q: "¿Una recomendación es una opinión médica?", a: "No. Es la opinión de un paciente sobre el trato y la atención que recibió. No sustituye una valoración médica." },
];

// Tarjetas de "Ver recomendaciones en estas especialidades": cada una con su color e ícono. `match` compara contra
// la especialidad del doctor sin acentos ni mayúsculas (para contar cuántos hay y armar el enlace a /recomendados,
// que usa el id "esp-<especialidad>"). Dentistas, pediatras y dermatólogos no van aquí: ya tienen carrusel fijo.
// `landing`: las que tienen página propia /<landing> (CLAUDE.md pasos 45-47); su tarjeta lleva ahí.
// Para agregar o quitar una, edita esta lista.
const SPECIALTY_CARDS = [
  { name: "Medicina general", landing: "medico-general", icon: Stethoscope, tone: "bg-sky-50 border-sky-100 text-sky-700", iconBg: "bg-sky-100", match: /medic(o|ina) general/ },
  { name: "Ginecología", landing: "ginecologo", icon: Flower2, tone: "bg-pink-50 border-pink-100 text-pink-700", iconBg: "bg-pink-100", match: /ginecolog/ },
  { name: "Cardiología", landing: "cardiologo", icon: HeartPulse, tone: "bg-red-50 border-red-100 text-red-700", iconBg: "bg-red-100", match: /cardiolog/ },
  { name: "Psicología", landing: "psicologo", icon: Brain, tone: "bg-violet-50 border-violet-100 text-violet-700", iconBg: "bg-violet-100", match: /psicolog/ },
  { name: "Psiquiatría", icon: Sparkles, tone: "bg-indigo-50 border-indigo-100 text-indigo-700", iconBg: "bg-indigo-100", match: /psiquiatr/ },
  { name: "Nutrición", landing: "nutriologo", icon: Apple, tone: "bg-lime-50 border-lime-100 text-lime-700", iconBg: "bg-lime-100", match: /nutri/ },
  { name: "Oftalmología", icon: Eye, tone: "bg-cyan-50 border-cyan-100 text-cyan-700", iconBg: "bg-cyan-100", match: /oftalmolog/ },
  { name: "Ortopedia", icon: Bone, tone: "bg-amber-50 border-amber-100 text-amber-700", iconBg: "bg-amber-100", match: /ortoped|traumatolog/ },
  { name: "Otorrinolaringología", icon: Ear, tone: "bg-orange-50 border-orange-100 text-orange-700", iconBg: "bg-orange-100", match: /otorrino/ },
  { name: "Neumología", icon: Wind, tone: "bg-blue-50 border-blue-100 text-blue-700", iconBg: "bg-blue-100", match: /neumolog/ },
  { name: "Gastroenterología", landing: "gastroenterologo", icon: Pill, tone: "bg-yellow-50 border-yellow-100 text-yellow-700", iconBg: "bg-yellow-100", match: /gastro/ },
  { name: "Endocrinología", landing: "endocrinologo", icon: Droplet, tone: "bg-teal-50 border-teal-100 text-teal-700", iconBg: "bg-teal-100", match: /endocrin/ },
  { name: "Neurología", icon: Activity, tone: "bg-purple-50 border-purple-100 text-purple-700", iconBg: "bg-purple-100", match: /neurolog/ },
  { name: "Urología", icon: ShieldPlus, tone: "bg-slate-50 border-slate-200 text-slate-700", iconBg: "bg-slate-100", match: /urolog/ },
  { name: "Cirugía plástica", icon: Scissors, tone: "bg-rose-50 border-rose-100 text-rose-700", iconBg: "bg-rose-100", match: /cirugia plastica/ },
  { name: "Alergología", icon: Leaf, tone: "bg-green-50 border-green-100 text-green-700", iconBg: "bg-green-100", match: /alergolog/ },
  { name: "Oncología", icon: Ribbon, tone: "bg-fuchsia-50 border-fuchsia-100 text-fuchsia-700", iconBg: "bg-fuchsia-100", match: /oncolog/ },
  { name: "Reumatología", icon: Hand, tone: "bg-stone-50 border-stone-200 text-stone-700", iconBg: "bg-stone-100", match: /reumatolog/ },
  { name: "Medicina del deporte", icon: Dumbbell, tone: "bg-emerald-50 border-emerald-100 text-emerald-700", iconBg: "bg-emerald-100", match: /deporte/ },
  { name: "Medicina interna", icon: Syringe, tone: "bg-zinc-50 border-zinc-200 text-zinc-700", iconBg: "bg-zinc-100", match: /medicina interna|internist/ },
];

const PHONE_VISIBLE = 6; // en celular se ven 6 tarjetas y el resto tras "Ver más especialidades" (desde tableta, todas)

function SpecialtyCards({ doctors }) {
  const [showAll, setShowAll] = useState(false);
  const cards = SPECIALTY_CARDS.map((c) => {
    const mine = doctors.filter((d) => c.match.test(norm(d.specialty)));
    const sp = mine[0]?.specialty;
    // Con página propia (/<especialidad>) va ahí, aunque no tenga doctores (la página dice "Sé el primero…"); sin
    // página propia pero con doctores, al carrusel de doctores de esta misma página (la lista /recomendados ya no
    // existe desde 2026-11-02); sin doctores, al formulario.
    const href = c.landing ? `/${c.landing}` : sp ? "#doctores" : null;
    return { ...c, count: mine.length, href };
  });
  return (
    <section id="especialidades" className="bg-gradient-to-b from-brand-flowSky to-brand-flowDeep py-16 scroll-mt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <h2 className="font-heading font-medium tracking-tight text-2xl sm:text-3xl text-white text-center">Ver recomendaciones en estas especialidades</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-6">
          {cards.map((c, i) => {
            const Icon = c.icon;
            const body = (
              <>
                <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.iconBg} ${c.tone.split(" ").find((k) => k.startsWith("text-"))}`}><Icon className="w-6 h-6" aria-hidden="true" /></span>
                <span className="mt-3 block font-heading font-medium text-white text-sm sm:text-base leading-snug break-words">{c.name}</span>
                <span className="mt-1 block text-xs text-white/70">
                  {c.count > 0 ? `${c.count} ${c.count === 1 ? "doctor recomendado" : "doctores recomendados"}` : "Sé el primero en recomendar"}
                </span>
              </>
            );
            const phoneHidden = !showAll && i >= PHONE_VISIBLE ? "hidden sm:block" : "block";
            // Vidrio: blanco translúcido con borde tenue; el color de cada especialidad queda solo en su ícono.
            const cls = `${phoneHidden} rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-4 text-left transition-all hover:bg-white/15 hover:-translate-y-0.5`;
            return c.href && !c.href.startsWith("#")
              ? <Link key={c.name} to={c.href} className={cls}>{body}</Link>
              : <a key={c.name} href={c.href || "#formulario"} className={cls}>{body}</a>;
          })}
        </div>
        {cards.length > PHONE_VISIBLE && (
          <div className="sm:hidden text-center mt-4">
            <button type="button" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}
              className="inline-flex items-center justify-center h-11 px-5 rounded-full border border-white/40 bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-colors">
              {showAll ? "Ver menos" : `Ver más especialidades (${cards.length - PHONE_VISIBLE})`}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default function RecommendationsLanding({ data }) {
  const doctors = useMemo(() => (data ? data.doctors : []), [data]);
  // Doctores de cada categoría (aunque esté vacía), para los carruseles fijos.
  const groups = useMemo(() => {
    const catOf = (d) => CATEGORIES.find((c) => c.match(norm(d.specialty)));
    return CATEGORIES.map((c) => ({ ...c, items: doctors.filter((d) => catOf(d) === c) }));
  }, [doctors]);
  // "Nuevo" solo dice algo si no todos lo son (al arrancar, todos los doctores son recientes).
  const showNew = doctors.some(isNew) && !doctors.every(isNew);

  const renderSlider = (items, label) => (
    <CardSlider resetKey={items.map((d) => d.slug).join(",")} onSeen={(slug) => recordRecommendedViews([slug], "impression")} label={label} prevLabel="Ver doctores anteriores" nextLabel="Ver más doctores" dots={false} bleed>
      {items.map((d) => <DoctorCard key={d.slug} d={d} count={items.length} showNew={showNew} actions={false} />)}
    </CardSlider>
  );

  // Categoría sin doctores: una tarjeta (del mismo tamaño que las de los doctores) para recomendar al primero.
  const renderEmpty = (g) => (
    <div className="flex justify-center">
      <div className="w-full sm:w-[calc(50%-0.375rem)] lg:w-[calc((100%_-_1.5rem)/3)] rounded-2xl border-2 border-dashed border-white/80 bg-white/50 backdrop-blur-sm px-5 py-8 text-center">
        <Heart className="w-8 h-8 text-brand-blue mx-auto mb-2" aria-hidden="true" />
        <p className="font-heading font-semibold text-foreground">¿Conoces a {g.one}?</p>
        <p className="text-sm text-muted-foreground mt-1">Todavía nadie lo ha recomendado. Sé el primero: toma un minuto.</p>
        <a href="#formulario" className="inline-flex items-center justify-center gap-1.5 mt-4 h-10 px-5 rounded-full bg-brand-blue hover:bg-brand-blue/90 text-white text-sm font-semibold transition-colors">
          Recomendar a mi doctor <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
  const fixedGroups = FIXED_CATEGORIES.map((k) => groups.find((g) => g.key === k)).filter(Boolean);

  const shareHref = `https://wa.me/?text=${encodeURIComponent(`¿Tu doctor es excelente? Recomiéndalo en BuscoUnDoctor, toma un minuto: ${PAGE_URL}`)}`;

  return (
    <div>
      {/* Doctores recomendados */}
      <section id="doctores" className="bg-gradient-to-b from-brand-flowMist to-brand-flowSky pt-8 pb-12 sm:py-16 scroll-mt-20">
        {/* Más ancha que el resto (1400 px) para que los carruseles lleguen más lejos en computadora. */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
          {/* Primero los carruseles por especialidad y al final el de todos los doctores (2026-11-02, pedido de David).
              Sin título grande de sección: cada carrusel lleva el suyo, con el mismo tamaño y lugar. */}
          {data && doctors.length > 0 && fixedGroups.map((g, i) => (
            <div key={g.key} className={`${i ? "mt-12" : ""} relative`}>
              {/* "Dentistas con más recomendaciones": la especialidad en negritas y el complemento en normal
                  (si todavía no hay doctores, "recomendados por pacientes", para no contradecir la tarjeta vacía).
                  "Ver todos →" lleva a /<especialidad>, en la misma fila que el título; en celular no se muestra
                  (pedido de David, 2026-11-02: las tarjetas de especialidad de arriba ya llevan ahí). */}
              <div className="sm:flex sm:items-baseline sm:justify-between sm:gap-4">
                <h2 className="font-heading text-lg sm:text-xl text-brand-navy">
                  <span className="font-semibold">{g.title}</span>{" "}
                  <span className="font-normal">{g.items.length > 0 ? "con más recomendaciones" : "recomendados por pacientes"}</span>
                </h2>
                {g.landing && (
                  <Link to={`/${g.landing}`} aria-label={`Ver todos los ${g.title.toLowerCase()} recomendados`}
                    className="hidden sm:inline sm:shrink-0 text-sm font-medium text-brand-navy/80 hover:text-brand-navy hover:underline whitespace-nowrap">
                    Ver todos →
                  </Link>
                )}
              </div>
              <div className="mt-3">{g.items.length > 0 ? renderSlider(g.items, g.title) : renderEmpty(g)}</div>
            </div>
          ))}

          {/* Todos los doctores, al final, con título del mismo estilo que los de arriba. */}
          <div className={data && doctors.length > 0 && fixedGroups.length > 0 ? "mt-12" : ""}>
            <h2 className="font-heading text-lg sm:text-xl text-brand-navy">
              <span className="font-semibold">Doctores</span> <span className="font-normal">recomendados</span>
            </h2>
            {data === null ? (
              <p className="text-center text-sm text-muted-foreground mt-6">Cargando…</p>
            ) : doctors.length === 0 ? (
              <div className="mt-3 rounded-3xl border border-dashed border-brand-flowSlate/40 bg-brand-flowMist/40 p-8 text-center">
                <Heart className="w-8 h-8 text-brand-flowSlate mx-auto mb-2" aria-hidden="true" />
                <p className="font-heading font-semibold text-foreground">Aquí aparecerán los doctores recomendados</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Sé el primero: recomienda a tu doctor arriba, en menos de un minuto.</p>
                <a href="#formulario" className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-brand-flowSlate hover:underline">Recomendar a mi doctor <ArrowRight className="w-4 h-4" /></a>
              </div>
            ) : (
              <div className="mt-3">{renderSlider(doctors, "Doctores recomendados")}</div>
            )}
          </div>

          <p className="text-center mt-6 text-sm">
            {/* Baja a "Ver recomendaciones en estas especialidades" (la lista /recomendados ya no existe). */}
            <a href="#especialidades" className="font-medium text-brand-navy hover:underline">Ver todos los doctores recomendados por especialidad →</a>
          </p>
        </div>
      </section>

      {/* Más especialidades: tarjetas de color, cada una con su ícono. Las que tienen página propia llevan a
          /<especialidad>; las demás, con doctores, al carrusel de doctores; sin doctores, al formulario. */}
      <SpecialtyCards doctors={doctors} />

      {/* Invitar a un amigo y preguntas frecuentes: azul profundo, acordeones de vidrio. */}
      <section id="preguntas" className="bg-brand-flowDeep px-4 sm:px-6 pt-6 pb-16 scroll-mt-20">
        <div className="text-center">
          <a href={shareHref} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-12 px-6 rounded-full border border-white/30 bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors">
            <Share2 className="w-4 h-4" aria-hidden="true" /> Invita a un amigo a recomendar a su doctor
          </a>
        </div>
        <h2 className="mt-14 font-heading font-medium tracking-tight text-2xl sm:text-3xl text-white text-center">Preguntas frecuentes</h2>
        <Accordion type="single" collapsible className="max-w-2xl mx-auto mt-6 space-y-3">
          {FAQ.map((f, i) => (
            <AccordionItem key={f.q} value={`f${i}`} className="rounded-2xl border border-white/15 bg-white/[0.07] backdrop-blur-sm px-5 text-white">
              <AccordionTrigger className="text-left hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="text-white/75">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Cierre y pie: del azul profundo vuelve a un azul brillante. */}
      <section className="bg-gradient-to-b from-brand-flowDeep to-brand-flowBright px-4 sm:px-6 pt-10 pb-24 sm:pb-12 text-center text-white">
        <h2 className="font-heading font-medium tracking-tight text-3xl sm:text-5xl leading-tight">¿Tu doctor es excelente?<br />Recomiéndalo.</h2>
        <p className="mt-4 text-white/75 max-w-md mx-auto">Toma un minuto y ayuda a otros pacientes en Monterrey a encontrar buen trato.</p>
        <a href="#formulario" className="inline-flex items-center justify-center mt-7 h-12 px-7 rounded-full bg-white text-brand-navy font-semibold shadow-lg shadow-black/10 hover:bg-white/90 transition-colors">
          Recomendar a mi doctor
        </a>
        <footer className="mt-20 text-sm text-white/75">
          <p>
            <Link to="/aviso-de-privacidad" className="underline hover:text-white">Aviso de privacidad</Link>
            {" · "}
            <Link to="/terminos-y-condiciones" className="underline hover:text-white">Términos y condiciones</Link>
            {" · "}
            <Link to="/contacto" className="underline hover:text-white">Contacto</Link>
          </p>
          <p className="mt-2">
            ¿Dudas?{" "}
            <a href={supportWhatsAppLink("Hola, tengo una duda sobre las recomendaciones de BuscoUnDoctor")} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Escríbenos por WhatsApp</a>
          </p>
          <p className="mt-2 text-xs">Las recomendaciones son opiniones de usuarios, no de BuscoUnDoctor. © BuscoUnDoctor.com</p>
        </footer>
      </section>
    </div>
  );
}
