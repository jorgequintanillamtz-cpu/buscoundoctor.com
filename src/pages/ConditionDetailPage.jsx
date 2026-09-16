import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Stethoscope, UserPlus, Star, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import BlogCard from "@/components/BlogCard";
import { trackDoctorClick } from "@/utils/trackDoctorClick";
import { slugify } from "@/lib/citySlug";
import CountdownBox from "@/components/CountdownBox";
import { LAUNCH_DATE, useCountdown } from "@/lib/launchCountdown";
import { useSpecialtyDisplay } from "@/hooks/useSpecialtyDisplay";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";

// Toma la primera oración de un texto largo (hasta ~110 caracteres) para
// usarla como meta description sin repetir el párrafo completo. Si no hay
// punto cerca, corta por palabra completa y agrega …
function firstSentence(text, maxLen = 110) {
  const clean = (text || "").split("\n")[0].trim();
  if (!clean) return "";
  const dot = clean.indexOf(". ");
  if (dot > 20 && dot < maxLen) return clean.slice(0, dot + 1);
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen).replace(/\s+\S*$/, "")}…`;
}

// Tarjeta compacta para la lista de especialistas de una enfermedad: solo lo
// esencial para comparar de un vistazo (igual que en el home), sin el detalle
// completo de reservar cita que sí tiene SpecialistCard en otras páginas.
function SpecialistMiniCard({ specialist }) {
  const specialtyDisplay = useSpecialtyDisplay(specialist.specialty);
  return (
    <Link
      to={`/especialista/${specialist.slug}`}
      onClick={() => trackDoctorClick(specialist, "condicion")}
      className="group flex flex-col items-center text-center bg-card border border-border/50 rounded-2xl p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
    >
      <div className="w-20 h-20 rounded-full bg-muted overflow-hidden flex-shrink-0">
        {specialist.profile_photo ? (
          <img src={specialist.profile_photo} alt={specialist.full_name} loading="lazy" className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full bg-brand-bluePale flex items-center justify-center">
            <span className="font-heading font-bold text-lg text-brand-blue/50">
              {specialist.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </span>
          </div>
        )}
      </div>
      <h3 className="font-heading font-semibold text-sm text-foreground mt-3 group-hover:text-brand-blue transition-colors line-clamp-1">
        {specialist.full_name}
      </h3>
      {specialist.rating != null && (
        <div className="flex items-center gap-0.5 mt-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className={`w-3.5 h-3.5 ${specialist.rating >= s ? "fill-amber-400 text-amber-400" : "text-border"}`} />
          ))}
        </div>
      )}
      <p className="text-brand-blue text-xs font-medium mt-1.5">{specialtyDisplay}</p>
      {(specialist.zone || specialist.location) && (
        <p className="text-muted-foreground text-xs mt-1 flex items-center gap-1">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="line-clamp-1">{specialist.zone || specialist.location}</span>
        </p>
      )}
    </Link>
  );
}

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

export default function ConditionDetailPage() {
  const { slug, citySlug } = useParams();
  const countdown = useCountdown(LAUNCH_DATE);
  const [condition, setCondition] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [cityRecord, setCityRecord] = useState(null);
  const [matchingSpecialists, setMatchingSpecialists] = useState([]);
  const [relatedConditions, setRelatedConditions] = useState([]);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [specialtySlug, setSpecialtySlug] = useState(null);
  const [specialtyDisplayName, setSpecialtyDisplayName] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const [conditionList, zoneList] = await Promise.all([
        base44.entities.Condition.filter({ slug }),
        base44.entities.Zone.filter({ active: true }),
      ]);
      const found = conditionList.find((c) => c.active !== false);
      const city = zoneList.find((z) => slugify(z.name) === citySlug);
      if (!active) return;
      if (!found || !city) { setNotFound(true); setLoading(false); return; }

      const [specialtyList, allPublishedSpecialists, allConditions] = await Promise.all([
        base44.entities.Specialty.filter({ name: found.specialty }),
        // Antes esto filtraba por "specialty: found.specialty", lo que solo
        // mostraba doctores cuya especialidad principal coincidiera con la
        // clasificación del catálogo (ej. Acupuntura para "Ansiedad y estrés"),
        // dejando fuera a psicólogos, psiquiatras o médicos generales que
        // también la tratan. Ahora se trae todo el directorio activo y se
        // filtra abajo por quién marcó esta condición en su perfil
        // (conditions_relation), sin importar su especialidad. Límite alto
        // explícito por el mismo bug del banco de +1000 registros.
        base44.entities.Specialist.filter({ active: true, publication_status: "published" }, "full_name", 2000),
        base44.entities.Condition.filter({ specialty: found.specialty, active: true }),
      ]);
      if (!active) return;

      const specialtyRecord = specialtyList[0];
      const [faqItems, blogPosts] = await Promise.all([
        specialtyRecord ? base44.entities.FaqItem.filter({ specialty_id: specialtyRecord.id, status: "publicado" }) : Promise.resolve([]),
        specialtyRecord ? base44.entities.BlogPost.filter({ specialty_id: specialtyRecord.id, published: true }) : Promise.resolve([]),
      ]);
      if (!active) return;

      setCondition(found);
      setCityRecord(city);
      setMatchingSpecialists(allPublishedSpecialists.filter((s) => (s.conditions_relation || []).includes(found.id)));
      setRelatedConditions(allConditions.filter((c) => c.slug !== found.slug).slice(0, 8));
      setRelatedPosts(blogPosts.slice(0, 3));
      setSpecialtySlug(specialtyRecord?.profession_slug || null);
      setSpecialtyDisplayName(specialtyRecord?.display_name || found.specialty);
      setFaqs(faqItems);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [slug, citySlug]);

  // A diferencia de las páginas de especialidad, aquí no se restringe por
  // ciudad exacta: la lista de doctores que marcaron esta condición
  // (conditions_relation) todavía es angosta (feature nueva), así que se
  // muestran los de cualquier ciudad activa -- Monterrey y San Pedro no
  // necesitan verse por separado en esta sección.
  const specialists = matchingSpecialists;

  useEffect(() => {
    if (!condition || !cityRecord) return;
    const title = condition.meta_title || `Doctores para ${condition.name} en ${cityRecord.name} | BuscoUnDoctor`;
    // El fallback genérico solo se usa si la condición no tiene texto propio
    // (no debería pasar hoy, pero cubre condiciones futuras sin contenido).
    // Si sí hay `description`, tomamos su primera oración para que cada una
    // de las 79 x N ciudades tenga una meta description única, en vez de
    // repetir el mismo texto genérico en todas.
    const description = condition.meta_description
      || (condition.description
        ? `${firstSentence(condition.description)} Especialistas verificados en ${cityRecord.name}.`
        : `Encuentra especialistas verificados para tratar ${condition.name} en ${cityRecord.name}. Perfiles con cédula profesional, reseñas y contacto directo por WhatsApp.`);
    document.title = title;
    setMeta("description", description);
    // Contenido sin revisión médica todavía: no lo indexamos hasta que pase a "revisado" o "publicado".
    // A diferencia de las páginas de especialidad, esta sí se indexa aunque
    // todavía no tenga doctores en esta ciudad -- el contenido informativo
    // (síntomas, tratamiento, etc.) tiene valor propio independiente de eso.
    setMeta("robots", condition.content_status === "borrador" ? "noindex,follow" : "index,follow");
  }, [condition, cityRecord]);

  // Si la URL no resuelve (enfermedad o ciudad inexistente/desactivada),
  // marcamos noindex explícito -- de lo contrario la etiqueta robots se
  // queda con lo que trajera la ruta anterior (la SPA no resetea <head> sola).
  useEffect(() => {
    if (notFound) setMeta("robots", "noindex,follow");
  }, [notFound]);

  useEffect(() => {
    if (!condition || !cityRecord) return;
    const scripts = [];
    // Síntomas/tratamiento/causas se escriben como listas de una línea por
    // punto, así que se parten por salto de línea simple (no por párrafo) para
    // declarar cada uno como su propia entidad en el schema — esto es lo que
    // le da a Google datos verificables en vez de un bloque de texto suelto.
    const toItems = (text) => (text ? text.split("\n").map((s) => s.trim()).filter(Boolean) : []);
    const symptomItems = toItems(condition.symptoms);
    const treatmentItems = toItems(condition.treatment);
    const riskFactorItems = toItems(condition.causes);

    const medicalLd = {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      "name": condition.name,
      "description": condition.description || condition.meta_description || `${condition.name} en ${cityRecord.name}.`,
      "contentLocation": { "@type": "City", "name": cityRecord.name },
      "about": {
        "@type": "MedicalCondition",
        "name": condition.name,
        ...(symptomItems.length > 0 && {
          "signOrSymptom": symptomItems.map((s) => ({ "@type": "MedicalSignOrSymptom", "name": s })),
        }),
        ...(treatmentItems.length > 0 && {
          "possibleTreatment": treatmentItems.map((t) => ({ "@type": "MedicalTherapy", "name": t })),
        }),
        ...(riskFactorItems.length > 0 && {
          "riskFactor": riskFactorItems.map((c) => ({ "@type": "MedicalRiskFactor", "name": c })),
        }),
      },
    };
    const medScript = document.createElement("script");
    medScript.type = "application/ld+json";
    medScript.id = "condition-jsonld";
    medScript.text = JSON.stringify(medicalLd);
    document.head.appendChild(medScript);
    scripts.push(medScript);

    if (faqs.length > 0) {
      const faqLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map((f) => ({
          "@type": "Question",
          "name": f.question,
          "acceptedAnswer": { "@type": "Answer", "text": f.answer },
        })),
      };
      const faqScript = document.createElement("script");
      faqScript.type = "application/ld+json";
      faqScript.id = "condition-jsonld-faq";
      faqScript.text = JSON.stringify(faqLd);
      document.head.appendChild(faqScript);
      scripts.push(faqScript);
    }
    return () => { scripts.forEach((s) => s.remove()); };
  }, [condition, cityRecord, faqs]);

  // Cada campo de contenido se parte en párrafos (separados por línea en
  // blanco) y se renderiza bajo su propio H2. Las condiciones que aún no se
  // migraron a los campos nuevos (symptoms/causes/...) simplemente no
  // muestran esas secciones — solo "¿Qué es?" con el description de siempre,
  // así que nada se rompe mientras se va reescribiendo el resto del catálogo.
  const splitParagraphs = (text) => (text ? text.split(/\n{2,}/).filter(Boolean) : []);

  // Síntomas, causas y prevención se escriben como listas (una idea por
  // línea) y se muestran con bullets; el resto es prosa normal separada por
  // párrafos. El mismo texto de listas es el que se parte por línea más
  // arriba para armar el JSON-LD, así que ambos usan la misma fuente.
  const splitLines = (text) => (text ? text.split("\n").map((s) => s.trim()).filter(Boolean) : []);

  const CONTENT_SECTIONS = [
    { key: "description", title: `¿Qué es ${condition?.name?.toLowerCase() || "esta condición"}?`, type: "prose" },
    { key: "symptoms", title: "Síntomas", type: "list" },
    { key: "causes", title: "Causas y factores de riesgo", type: "list" },
    { key: "when_to_consult", title: "¿Cuándo consultar a un especialista?", type: "prose" },
    { key: "treatment", title: "Tratamiento", type: "prose" },
    { key: "prevention", title: "Prevención", type: "list" },
  ];

  const contentSections = useMemo(() => {
    if (!condition) return [];
    return CONTENT_SECTIONS
      .map((s) => ({
        ...s,
        items: s.type === "list" ? splitLines(condition[s.key]) : splitParagraphs(condition[s.key]),
      }))
      .filter((s) => s.items.length > 0);
  }, [condition]);

  // min-h-[100dvh]: evita que el Footer se vea antes de tiempo y brinque al
  // cargar el contenido real (mismo arreglo que Home.jsx/SpecialtyPage.jsx).
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-4">
        <h1 className="font-heading font-bold text-2xl text-foreground">Enfermedad no encontrada</h1>
        <p className="text-sm text-muted-foreground mt-2">No encontramos esta enfermedad en nuestro catálogo.</p>
        <Button variant="outline" className="mt-5 rounded-xl" asChild>
          <Link to="/enfermedades">Ver todas las enfermedades</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/">Inicio</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/enfermedades">Enfermedades</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{condition.name} en {cityRecord.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground">
          Doctores para {condition.name.toLowerCase()} en {cityRecord.name}
        </h1>
        <Link
          to={specialtySlug ? `/${specialtySlug}/${citySlug}` : `/especialistas?specialty=${encodeURIComponent(condition.specialty)}`}
          className="inline-block mt-1.5 text-xs font-medium text-brand-blue hover:underline"
        >
          También puedes ver especialistas en: {specialtyDisplayName || condition.specialty}
        </Link>

        <section className="mt-4">
          <div className="bg-card border border-border/50 rounded-2xl p-6 sm:p-8">
            {contentSections.length > 0 ? (
              contentSections.map((s, i) => (
                <div key={s.key} className={i > 0 ? "mt-6 pt-6 border-t border-border/50" : ""}>
                  <h2 className="font-heading font-bold text-lg sm:text-xl text-foreground mb-3">{s.title}</h2>
                  {s.type === "list" ? (
                    <ul className="space-y-2 list-disc list-outside pl-5">
                      {s.items.map((item, j) => (
                        <li key={j} className="text-muted-foreground leading-relaxed text-sm sm:text-base">{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="space-y-3">
                      {s.items.map((para, j) => (
                        <p key={j} className="text-muted-foreground leading-relaxed text-sm sm:text-base">{para}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">Contenido en preparación.</p>
            )}
          </div>
        </section>
      </div>

      {/* Especialistas: lista real si ya hay, o "en construcción" con countdown si todavía no */}
      <section className="mb-10">
        {specialists.length > 0 ? (
          <>
            <h2 className="font-heading font-bold text-lg sm:text-xl text-foreground mb-4">
              Especialistas que atienden {condition.name.toLowerCase()}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {specialists.map((s) => (
                <SpecialistMiniCard key={s.id} specialist={s} />
              ))}
            </div>
          </>
        ) : (
          <div className="bg-card border border-border/50 rounded-2xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-brand-bluePale flex items-center justify-center flex-shrink-0">
                <Stethoscope className="w-5 h-5 text-brand-blue" />
              </div>
              <div>
                <h2 className="font-heading font-semibold text-base text-foreground">
                  Esta sección está en construcción
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Todavía ningún doctor ha marcado esta condición en su perfil. El directorio completo de BuscoUnDoctor sale el 15 de octubre.
                </p>
              </div>
            </div>

            {!countdown.done && (
              <div className="flex items-center gap-2 mb-4">
                <CountdownBox value={countdown.days} label="Días" compact />
                <CountdownBox value={countdown.hours} label="Hrs" compact />
                <CountdownBox value={countdown.minutes} label="Min" compact />
                <CountdownBox value={countdown.seconds} label="Seg" compact />
              </div>
            )}

            <div className="pt-5 border-t border-border/50 flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
              <UserPlus className="w-5 h-5 text-brand-blue flex-shrink-0 hidden sm:block" />
              <p className="text-xs text-muted-foreground flex-1">
                ¿Tú tratas esta condición? Márcala en tu perfil para ser de los primeros en aparecer aquí.
              </p>
              <Button variant="outline" size="sm" className="rounded-xl flex-shrink-0" asChild>
                <Link to="/registro-medico">Regístrate gratis</Link>
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* CTA: siempre visible, con destino distinto según si ya hay especialistas cargados */}
      <section className="relative bg-brand-navy rounded-3xl overflow-hidden p-6 sm:p-8 mb-10">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-brand-blue/20 rounded-full pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row items-center gap-5 justify-between text-center sm:text-left">
          <div>
            <h2 className="font-heading font-bold text-lg sm:text-xl text-white">
              {specialists.length > 0
                ? "¿Listo para agendar con un especialista?"
                : "Explora otras especialidades disponibles"}
            </h2>
            <p className="text-white/70 text-sm mt-1.5 max-w-md">
              {specialists.length > 0
                ? "Compara perfiles verificados, reseñas y contacta directo por WhatsApp."
                : "Mientras sumamos especialistas para esta condición, conoce a los médicos verificados que ya tenemos."}
            </p>
          </div>
          <Button size="lg" variant="secondary" className="bg-white text-brand-navy hover:bg-white/90 font-heading font-semibold flex-shrink-0 gap-2" asChild>
            <Link to="/especialistas">
              {specialists.length > 0 ? "Ver todos" : "Ver especialistas"} <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      {relatedConditions.length > 0 && (
        <section className="mb-10">
          <h2 className="font-heading font-semibold text-sm text-foreground mb-3">Otras enfermedades de {specialtyDisplayName || condition.specialty}</h2>
          <div className="flex flex-wrap gap-2">
            {relatedConditions.map((c) => (
              <Link
                key={c.id}
                to={`/enfermedades/${c.slug}/${citySlug}`}
                className="inline-flex items-center bg-accent text-accent-foreground hover:bg-accent/80 transition-colors rounded-full px-4 py-2 text-sm font-medium"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {relatedPosts.length > 0 && (
        <section className="mb-10">
          <h2 className="font-heading font-bold text-lg sm:text-xl text-foreground mb-4">
            Artículos sobre {(specialtyDisplayName || condition.specialty).toLowerCase()}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedPosts.map((p, i) => (
              <BlogCard key={p.id} post={p} priority={i === 0} />
            ))}
          </div>
        </section>
      )}

      {faqs.length > 0 && (
        <section className="mb-6">
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground mb-5">Preguntas frecuentes sobre {specialtyDisplayName || condition.specialty}</h2>
          <Accordion type="single" collapsible className="bg-card rounded-2xl border border-border/50 divide-y divide-border/50">
            {faqs.map((f, i) => (
              <AccordionItem key={f.id} value={`faq-${i}`} className="px-5">
                <AccordionTrigger className="text-left font-heading font-semibold text-sm sm:text-base text-foreground hover:no-underline">{f.question}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}
    </div>
  );
}
