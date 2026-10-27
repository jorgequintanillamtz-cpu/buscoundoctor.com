import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Heart, Quote, Search, ShieldQuestion, Share2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import RecommendedAvatar from "@/components/RecommendedAvatar";
import ReportRecommendationDialog from "@/components/ReportRecommendationDialog";
import { ReportMenu, commentMonth } from "@/components/RecommendationCards";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { recommendationTagLabel } from "@/lib/recommendationTags";
import { recordRecommendedViews } from "@/lib/recommendedViews";
import { supportWhatsAppLink } from "@/components/DoctorSupportWhatsApp";

// Secciones de la landing de recomendaciones (CLAUDE.md §8r, pasos 26 y 28): van debajo del formulario de
// /recomendaciones. Orden: doctores recomendados, lo que dicen los pacientes, invitar a un amigo,
// preguntas frecuentes y pie.
// Los datos salen de una sola consulta (`list_recommendations_landing`); si falla, solo se ocultan las partes
// con datos. Reglas: nada de estrellas ni "mejores"; los doctores van como "Sin verificar"; nunca apellido ni correo.

const PAGE_URL = "https://buscoundoctor.com/recomendaciones";
const SHOW_FILTER_FROM = 3; // los botones de especialidad solo salen con 3+ doctores (con menos se ven vacíos)
const SHOW_SEARCH_FROM = 5; // el buscador por nombre solo sale con 5+ doctores (con menos estorba)
const FIRST_BATCH = 6; // doctores que se ven al inicio; el resto, con "Ver más doctores"
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

// Columna de la derecha (solo escritorio, junto al formulario): los doctores recomendados más recientemente.
export function LatestRecommendations({ data }) {
  if (!data || !data.doctors.length) return null;
  const latest = data.doctors.filter((d) => d.last_at).sort((a, b) => new Date(b.last_at) - new Date(a.last_at)).slice(0, 5);
  const quote = (data.comments || [])[0];
  return (
    <aside className="hidden lg:block lg:sticky lg:top-6 xl:col-start-3 xl:row-start-1 bg-card rounded-3xl border border-border/50 shadow-lg p-6">
      <h2 className="font-heading font-semibold text-lg text-foreground">Últimas recomendaciones</h2>
      <ul className="mt-3 divide-y divide-border/50">
        {latest.map((d) => (
          <li key={d.slug}>
            <Link to={`/recomendado/${d.slug}`} className="flex items-center gap-3 py-3 group">
              <RecommendedAvatar photo={d.photo} name={d.full_name} className="w-11 h-11" />
              <div className="min-w-0 flex-1">
                <p className="font-heading font-semibold text-sm text-foreground break-words leading-snug group-hover:text-brand-augusta transition-colors">{d.full_name}</p>
                <p className="text-xs text-muted-foreground break-words">{[d.specialty, d.zone].filter(Boolean).join(" · ")}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {quote && (
        <div className="mt-2 rounded-2xl bg-muted/50 px-4 py-3">
          <p className="text-sm text-foreground flex gap-2"><Quote className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" /><span className="break-words">{quote.text}</span></p>
          <p className="text-xs text-muted-foreground mt-2">{quote.name ? <><span className="font-medium text-foreground">{quote.name}</span> · </> : null}<Link to={`/recomendado/${quote.doctor_slug}`} className="underline hover:text-foreground">{quote.doctor_name}</Link></p>
        </div>
      )}
      <a href="#doctores" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-augusta hover:underline">Ver todos los doctores <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" /></a>
    </aside>
  );
}

const FAQ = [
  { q: "¿Quién ve mi nombre?", a: "Solo el primer nombre, y solo si decides escribirlo. Aparece junto a tu recomendación. Nunca mostramos tu apellido ni tu correo." },
  { q: "¿El doctor se entera de que fui yo?", a: "El doctor puede ver lo que dejaste (las etiquetas, el comentario y el mensaje privado), pero no tu correo ni tu apellido. Si escribes tu primer nombre, aparece junto a tu recomendación." },
  { q: "¿Por qué piden mi correo?", a: "Para confirmar que eres una persona real y evitar recomendaciones repetidas o falsas. No se muestra públicamente." },
  { q: "¿Puedo recomendar a más de un doctor?", a: "Sí. Puedes recomendar a todos los doctores que quieras, una vez por cada uno." },
  { q: "¿Por qué mi recomendación no aparece de inmediato?", a: "Porque el equipo de BuscoUnDoctor revisa cada recomendación y cada comentario antes de publicarlos." },
  { q: "¿Qué significa \"Sin verificar\"?", a: "Que ese doctor todavía no ha reclamado su perfil en BuscoUnDoctor. Los datos vienen de lo que escribieron los pacientes y, cuando se indica, de la consulta de su cédula en el registro público de la SEP." },
  { q: "¿Una recomendación es una opinión médica?", a: "No. Es la opinión de un paciente sobre el trato y la atención que recibió. No sustituye una valoración médica." },
];

export default function RecommendationsLanding({ data, onRecommend }) {
  const [specialty, setSpecialty] = useState("");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [report, setReport] = useState(null); // { id, slug, kind, what }

  const doctors = useMemo(() => (data ? data.doctors : []), [data]);
  const comments = data ? data.comments || [] : [];
  const specialties = useMemo(() => [...new Set(doctors.map((d) => d.specialty).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")), [doctors]);
  const showFilter = doctors.length >= SHOW_FILTER_FROM && specialties.length > 1;
  const showSearch = doctors.length >= SHOW_SEARCH_FROM;
  const q = norm(query.trim());
  const matches = doctors.filter((d) =>
    (!showFilter || !specialty || d.specialty === specialty) &&
    (!q || norm([d.full_name, d.specialty, d.subspecialty].join(" ")).includes(q)));
  // Con una búsqueda o un filtro activos se ven todos los resultados; si no, los primeros y "Ver más".
  const filtering = !!q || (showFilter && !!specialty);
  const shown = expanded || filtering ? matches : matches.slice(0, FIRST_BATCH);
  const hidden = matches.length - shown.length;
  // "Nuevo" solo dice algo si no todos lo son (al arrancar, todos los doctores son recientes).
  const showNew = doctors.some(isNew) && !doctors.every(isNew);
  const totalRecs = doctors.reduce((n, d) => n + (Number(d.count) || 0), 0);
  // Impresión: estos doctores aparecieron en la lista (la base cuenta una por visitante por día).
  const shownKey = shown.map((d) => d.slug).join(",");
  useEffect(() => { if (shownKey) recordRecommendedViews(shownKey.split(","), "impression"); }, [shownKey]);

  const shareHref = `https://wa.me/?text=${encodeURIComponent(`¿Tu doctor es excelente? Recomiéndalo en BuscoUnDoctor, toma un minuto: ${PAGE_URL}`)}`;

  return (
    <div>
      {/* Doctores recomendados */}
      <section id="doctores" className="bg-white py-10 sm:py-12 scroll-mt-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-brand-navy text-center">Doctores recomendados</h2>
          <p className="hidden sm:block text-sm text-muted-foreground text-center mt-2 max-w-xl mx-auto">
            Aún no tienen perfil verificado en BuscoUnDoctor: la información viene de recomendaciones de pacientes, que revisamos antes de publicar.
          </p>
          {doctors.length > 0 && (
            <p className="text-center mt-3">
              <span className="inline-flex items-center gap-1.5 text-sm text-foreground bg-brand-augustaLight/70 px-3.5 py-1.5 rounded-full">
                <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" aria-hidden="true" />
                <span><strong>{doctors.length}</strong> {doctors.length === 1 ? "doctor" : "doctores"} y <strong>{totalRecs}</strong> {totalRecs === 1 ? "recomendación" : "recomendaciones"} hasta ahora</span>
              </span>
            </p>
          )}

          {showSearch && (
            <div className="relative max-w-md mx-auto mt-5">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o especialidad" aria-label="Buscar doctor por nombre o especialidad"
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-augusta/40" />
            </div>
          )}

          {showFilter && (
            <div className="flex flex-wrap justify-center gap-2 mt-4" role="group" aria-label="Filtrar por especialidad">
              {["", ...specialties].map((sp) => (
                <button key={sp || "todas"} type="button" onClick={() => setSpecialty(sp)} aria-pressed={specialty === sp}
                  className={`px-3.5 h-9 rounded-full border text-sm font-medium transition-colors ${specialty === sp ? "border-brand-augusta bg-brand-augustaLight text-brand-augustaDark" : "border-input bg-background text-foreground hover:border-brand-augusta/50"}`}>
                  {sp || "Todas"}
                </button>
              ))}
            </div>
          )}

          {data === null ? (
            <p className="text-center text-sm text-muted-foreground mt-8">Cargando…</p>
          ) : doctors.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-brand-augusta/40 bg-brand-augustaLight/40 p-8 text-center">
              <Heart className="w-8 h-8 text-brand-augusta mx-auto mb-2" aria-hidden="true" />
              <p className="font-heading font-semibold text-foreground">Aquí aparecerán los doctores recomendados</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Sé el primero: recomienda a tu doctor arriba, en menos de un minuto.</p>
              <a href="#top" className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-brand-augusta hover:underline">Recomendar a mi doctor <ArrowRight className="w-4 h-4" /></a>
            </div>
          ) : matches.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-border p-8 text-center">
              <p className="font-heading font-semibold text-foreground">No encontramos a ese doctor</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Si es tu doctor, sé el primero en recomendarlo: toma un minuto.</p>
              <a href="#top" className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-brand-augusta hover:underline">Recomendar a mi doctor <ArrowRight className="w-4 h-4" /></a>
            </div>
          ) : (
            <>
              <div className={`mt-6 grid gap-3 ${shown.length === 1 ? "grid-cols-1 max-w-md mx-auto" : "grid-cols-1 sm:grid-cols-2"}`}>
                {shown.map((d) => (
                  <div key={d.slug} className="rounded-2xl border border-border/60 bg-card px-4 py-3.5 sm:py-4 hover:border-brand-augusta/50 hover:shadow-md transition-all flex flex-col">
                    <Link to={`/recomendado/${d.slug}`} className="flex items-start gap-3 flex-1">
                      <RecommendedAvatar photo={d.photo} name={d.full_name} className="w-12 h-12 sm:w-14 sm:h-14" />
                      <div className="min-w-0 flex-1">
                        <p className="font-heading font-semibold text-foreground break-words leading-snug">{d.full_name}</p>
                        <p className="text-sm text-muted-foreground break-words">{[d.specialty, d.subspecialty, d.zone].filter(Boolean).join(" · ")}</p>
                        <div className="flex items-center gap-x-2 gap-y-1 mt-1.5 flex-wrap">
                          {showNew && isNew(d) && (
                            <span className="inline-flex items-center text-[11px] font-semibold text-brand-augustaDark bg-brand-augustaLight px-2 py-0.5 rounded-full">Nuevo</span>
                          )}
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            <ShieldQuestion className="w-3 h-3" aria-hidden="true" /> Sin verificar
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-foreground">
                            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" aria-hidden="true" /> Recomendado por {d.count} {d.count === 1 ? "paciente" : "pacientes"}
                          </span>
                        </div>
                        {(d.top_tags || []).length > 0 && (
                          // En celular, una sola línea (lo que no cabe se oculta); desde tableta salen todas.
                          <div className="flex flex-wrap gap-1.5 mt-2 max-h-6 overflow-hidden sm:max-h-none">
                            {d.top_tags.map((t) => <span key={t.tag} className="text-xs leading-4 bg-brand-bluePale text-brand-navy px-2.5 py-1 rounded-full whitespace-nowrap">{recommendationTagLabel(t.tag)}{t.n > 1 ? ` · ${t.n}` : ""}</span>)}
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                      <Link to={`/recomendado/${d.slug}`}
                        className="inline-flex items-center justify-center gap-1.5 h-10 lg:h-9 px-3 lg:px-4 rounded-full bg-brand-augusta hover:bg-brand-augustaDark text-white text-[13px] lg:text-sm font-semibold whitespace-nowrap transition-colors flex-1">
                        Ver recomendaciones <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </Link>
                      {onRecommend && (
                        <button type="button" onClick={() => onRecommend(d.slug)} aria-label={`Yo también lo recomiendo: ${d.full_name}`}
                          className="inline-flex items-center justify-center gap-1.5 h-10 lg:h-9 px-3 lg:px-4 rounded-full border border-brand-augusta bg-white text-brand-augusta hover:bg-brand-augustaLight text-[13px] lg:text-sm font-semibold whitespace-nowrap transition-colors lg:flex-1">
                          {/* Celular y tableta: etiqueta corta para que los dos botones quepan en una fila */}
                          <Heart className="w-3.5 h-3.5" aria-hidden="true" /> <span className="lg:hidden">Yo también</span><span className="hidden lg:inline">Yo también lo recomiendo</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {hidden > 0 && (
                <div className="text-center mt-5">
                  <button type="button" onClick={() => setExpanded(true)}
                    className="inline-flex items-center gap-2 h-11 px-6 rounded-full border border-brand-augusta text-brand-augusta bg-white font-semibold text-sm hover:bg-brand-augustaLight transition-colors">
                    Ver más doctores ({hidden} más)
                  </button>
                </div>
              )}
            </>
          )}

          <p className="text-center mt-6 text-sm">
            <Link to="/recomendados" className="font-medium text-brand-augusta hover:underline">Ver todos los doctores recomendados por especialidad →</Link>
          </p>
        </div>
      </section>

      {/* Lo que dicen los pacientes: solo si hay comentarios aprobados y el equipo los hizo visibles */}
      {comments.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-brand-navy text-center">Lo que dicen los pacientes</h2>
          <div className={`grid gap-3 mt-6 ${comments.length === 1 ? "grid-cols-1 max-w-md mx-auto" : "grid-cols-1 sm:grid-cols-2"}`}>
            {comments.map((c) => (
              <div key={c.id} className="rounded-2xl bg-card border border-border/50 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-foreground flex gap-2"><Quote className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" /><span className="break-words">{c.text}</span></p>
                  <ReportMenu ariaLabel="Reportar" items={[
                    { label: "Reportar recomendación", onSelect: () => setReport({ id: c.id, slug: c.doctor_slug, kind: "recommendation", what: "la recomendación" }) },
                    { label: "Reportar comentario", onSelect: () => setReport({ id: c.id, slug: c.doctor_slug, kind: "comment", what: "el comentario" }) },
                  ]} />
                </div>
                {(c.tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {c.tags.map((t) => <span key={t} className="text-xs bg-muted text-brand-navy px-2.5 py-1 rounded-full">{recommendationTagLabel(t)}</span>)}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2.5 flex items-center gap-1.5 flex-wrap">
                  <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" aria-hidden="true" />
                  {c.name ? <><span className="font-medium text-foreground">{c.name}</span> · </> : null}{commentMonth(c.month)} ·{" "}
                  <Link to={`/recomendado/${c.doctor_slug}`} className="underline hover:text-foreground">{c.doctor_name}</Link>
                </p>
              </div>
            ))}
          </div>
          <ReportRecommendationDialog open={!!report} onOpenChange={(o) => { if (!o) setReport(null); }} slug={report?.slug} commentId={report?.id || null} kind={report?.kind || null} what={report?.what || "la recomendación"} />
        </section>
      )}

      {/* Invitar a un amigo (queda suelto: era parte de la sección de confianza que se quitó) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10 text-center">
        <a href={shareHref} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 h-12 px-6 rounded-xl border border-brand-augusta text-brand-augusta bg-white font-semibold hover:bg-brand-augustaLight transition-colors">
          <Share2 className="w-4 h-4" aria-hidden="true" /> Invita a un amigo a recomendar a su doctor
        </a>
      </section>

      {/* Preguntas frecuentes */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 pb-12">
        <h2 className="font-heading font-bold text-xl sm:text-2xl text-brand-navy text-center mb-4">Preguntas frecuentes</h2>
        <Accordion type="single" collapsible className="bg-card rounded-3xl border border-border/50 px-5">
          {FAQ.map((f, i) => (
            <AccordionItem key={f.q} value={`f${i}`} className={i === FAQ.length - 1 ? "border-b-0" : ""}>
              <AccordionTrigger>{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Pie (con aire abajo para que el botón flotante del celular no tape el texto) */}
      <footer className="border-t border-border/60 bg-white pt-8 pb-24 sm:pb-8 px-4 text-center text-sm text-muted-foreground">
        <p>
          <Link to="/aviso-de-privacidad" className="underline hover:text-foreground">Aviso de privacidad</Link>
          {" · "}
          <Link to="/terminos-y-condiciones" className="underline hover:text-foreground">Términos y condiciones</Link>
          {" · "}
          <Link to="/contacto" className="underline hover:text-foreground">Contacto</Link>
        </p>
        <p className="mt-2">
          ¿Dudas?{" "}
          <a href={supportWhatsAppLink("Hola, tengo una duda sobre las recomendaciones de BuscoUnDoctor")} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Escríbenos por WhatsApp</a>
        </p>
        <p className="mt-2 text-xs">Las recomendaciones son opiniones de usuarios, no de BuscoUnDoctor. © BuscoUnDoctor.com</p>
      </footer>
    </div>
  );
}
