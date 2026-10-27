import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Heart, Quote, ShieldQuestion, Share2 } from "lucide-react";
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
const SHOW_COUNTER_FROM = 10; // "Ya van N recomendaciones": solo cuando el número ya dice algo (y siempre es el real)
const SHOW_FILTER_FROM = 3; // los botones de especialidad solo salen con 3+ doctores (con menos se ven vacíos)

const FAQ = [
  { q: "¿Quién ve mi nombre?", a: "Solo el primer nombre, y solo si decides escribirlo. Aparece junto a tu recomendación. Nunca mostramos tu apellido ni tu correo." },
  { q: "¿El doctor se entera de que fui yo?", a: "El doctor puede ver lo que dejaste (las etiquetas, el comentario y el mensaje privado), pero no tu correo ni tu apellido. Si escribes tu primer nombre, aparece junto a tu recomendación." },
  { q: "¿Por qué piden mi correo?", a: "Para confirmar que eres una persona real y evitar recomendaciones repetidas o falsas. No se muestra públicamente." },
  { q: "¿Puedo recomendar a más de un doctor?", a: "Sí. Puedes recomendar a todos los doctores que quieras, una vez por cada uno." },
  { q: "¿Por qué mi recomendación no aparece de inmediato?", a: "Porque el equipo de BuscoUnDoctor revisa cada recomendación y cada comentario antes de publicarlos." },
  { q: "¿Qué significa \"Sin verificar\"?", a: "Que ese doctor todavía no ha reclamado su perfil en BuscoUnDoctor. Los datos vienen de lo que escribieron los pacientes y, cuando se indica, de la consulta de su cédula en el registro público de la SEP." },
  { q: "¿Una recomendación es una opinión médica?", a: "No. Es la opinión de un paciente sobre el trato y la atención que recibió. No sustituye una valoración médica." },
];

export default function RecommendationsLanding({ onRecommend }) {
  const [data, setData] = useState(null); // null = cargando | { total, doctors, comments } | false = falló
  const [specialty, setSpecialty] = useState("");
  const [report, setReport] = useState(null); // { id, slug, kind, what }

  useEffect(() => {
    let active = true;
    base44.functions.invoke("listRecommendationsLanding")
      .then(({ data: d }) => { if (active) setData(d && Array.isArray(d.doctors) ? d : false); })
      .catch(() => { if (active) setData(false); });
    return () => { active = false; };
  }, []);

  const doctors = data ? data.doctors : [];
  const comments = data ? data.comments || [] : [];
  const specialties = useMemo(() => [...new Set(doctors.map((d) => d.specialty).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")), [doctors]);
  const showFilter = doctors.length >= SHOW_FILTER_FROM && specialties.length > 1;
  const shown = showFilter && specialty ? doctors.filter((d) => d.specialty === specialty) : doctors;
  // Impresión: estos doctores aparecieron en la lista (la base cuenta una por visitante por día).
  useEffect(() => { recordRecommendedViews(shown.map((d) => d.slug), "impression"); }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps

  const shareHref = `https://wa.me/?text=${encodeURIComponent(`¿Tu doctor es excelente? Recomiéndalo en BuscoUnDoctor, toma un minuto: ${PAGE_URL}`)}`;

  return (
    <div>
      {/* Doctores recomendados */}
      <section className="bg-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-brand-navy text-center">Doctores recomendados</h2>
          <p className="text-sm text-muted-foreground text-center mt-2 max-w-xl mx-auto">
            Aún no tienen perfil verificado en BuscoUnDoctor: la información viene de recomendaciones de pacientes, que revisamos antes de publicar.
            {data && data.total >= SHOW_COUNTER_FROM ? <> Ya van <strong className="text-foreground">{data.total}</strong> recomendaciones.</> : null}
          </p>

          {showFilter && (
            <div className="flex flex-wrap justify-center gap-2 mt-5" role="group" aria-label="Filtrar por especialidad">
              {["", ...specialties].map((s) => (
                <button key={s || "todas"} type="button" onClick={() => setSpecialty(s)} aria-pressed={specialty === s}
                  className={`px-3.5 h-9 rounded-full border text-sm font-medium transition-colors ${specialty === s ? "border-brand-augusta bg-brand-augustaLight text-brand-augustaDark" : "border-input bg-background text-foreground hover:border-brand-augusta/50"}`}>
                  {s || "Todas"}
                </button>
              ))}
            </div>
          )}

          {data === null ? (
            <p className="text-center text-sm text-muted-foreground mt-8">Cargando…</p>
          ) : shown.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-brand-augusta/40 bg-brand-augustaLight/40 p-8 text-center">
              <Heart className="w-8 h-8 text-brand-augusta mx-auto mb-2" aria-hidden="true" />
              <p className="font-heading font-semibold text-foreground">Aquí aparecerán los doctores recomendados</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Sé el primero: recomienda a tu doctor arriba, en menos de un minuto.</p>
              <a href="#top" className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-brand-augusta hover:underline">Recomendar a mi doctor <ArrowRight className="w-4 h-4" /></a>
            </div>
          ) : (
            <div className={`mt-7 grid gap-3 ${shown.length === 1 ? "grid-cols-1 max-w-md mx-auto" : "grid-cols-1 sm:grid-cols-2"}`}>
              {shown.map((d) => (
                <div key={d.slug} className="rounded-2xl border border-border/60 bg-card px-4 py-4 hover:border-brand-augusta/50 hover:shadow-md transition-all flex flex-col">
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
                          <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" aria-hidden="true" /> Recomendado por {d.count} {d.count === 1 ? "paciente" : "pacientes"}
                        </span>
                      </div>
                      {(d.top_tags || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {d.top_tags.map((t) => <span key={t.tag} className="text-xs bg-brand-bluePale text-brand-navy px-2.5 py-1 rounded-full">{recommendationTagLabel(t.tag)}{t.n > 1 ? ` · ${t.n}` : ""}</span>)}
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-border/50">
                    <Link to={`/recomendado/${d.slug}`} className="text-sm font-medium text-brand-augusta hover:underline inline-flex items-center gap-1">Ver recomendaciones <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" /></Link>
                    {onRecommend && (
                      <button type="button" onClick={() => onRecommend(d.slug)}
                        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-brand-augusta hover:bg-brand-augustaDark text-white text-sm font-semibold transition-colors">
                        <Heart className="w-3.5 h-3.5 fill-current" aria-hidden="true" /> Yo también lo recomiendo
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-center mt-6 text-sm">
            <Link to="/recomendados" className="font-medium text-brand-augusta hover:underline">Ver todos los doctores recomendados por especialidad →</Link>
          </p>
        </div>
      </section>

      {/* Lo que dicen los pacientes: solo si hay comentarios aprobados y el equipo los hizo visibles */}
      {comments.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
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
