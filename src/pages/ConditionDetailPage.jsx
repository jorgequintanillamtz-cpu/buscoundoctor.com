import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Stethoscope, UserPlus, Star, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import BlogCard from "@/components/BlogCard";
import { trackDoctorClick } from "@/utils/trackDoctorClick";
import { slugify } from "@/lib/citySlug";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";

// Tarjeta compacta para la lista de especialistas de una enfermedad: solo lo
// esencial para comparar de un vistazo (igual que en el home), sin el detalle
// completo de reservar cita que sí tiene SpecialistCard en otras páginas.
function SpecialistMiniCard({ specialist }) {
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
      <p className="text-brand-blue text-xs font-medium mt-1.5">{specialist.specialty}</p>
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
  const { slug } = useParams();
  const [condition, setCondition] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [specialists, setSpecialists] = useState([]);
  const [zones, setZones] = useState([]);
  const [relatedConditions, setRelatedConditions] = useState([]);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [specialtySlug, setSpecialtySlug] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const conditionList = await base44.entities.Condition.filter({ slug });
      const found = conditionList.find((c) => c.active !== false);
      if (!active) return;
      if (!found) { setNotFound(true); setLoading(false); return; }

      const [specialtyList, allSpecialists, allConditions, zoneList] = await Promise.all([
        base44.entities.Specialty.filter({ name: found.specialty }),
        base44.entities.Specialist.filter({ specialty: found.specialty, active: true, publication_status: "published" }),
        base44.entities.Condition.filter({ specialty: found.specialty, active: true }),
        base44.entities.Zone.filter({ active: true }),
      ]);
      if (!active) return;

      const specialtyRecord = specialtyList[0];
      const [faqItems, blogPosts] = await Promise.all([
        specialtyRecord ? base44.entities.FaqItem.filter({ specialty_id: specialtyRecord.id, status: "publicado" }) : Promise.resolve([]),
        specialtyRecord ? base44.entities.BlogPost.filter({ specialty_id: specialtyRecord.id, published: true }) : Promise.resolve([]),
      ]);
      if (!active) return;

      setCondition(found);
      setSpecialists(allSpecialists);
      setZones(zoneList);
      setRelatedConditions(allConditions.filter((c) => c.slug !== found.slug).slice(0, 8));
      setRelatedPosts(blogPosts.slice(0, 3));
      setSpecialtySlug(specialtyRecord?.profession_slug || null);
      setFaqs(faqItems);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (!condition) return;
    const title = condition.meta_title || `${condition.name}: información y especialistas | BuscoUnDoctor`;
    const description = condition.meta_description || `Qué es ${condition.name}, cuándo consultar a un especialista y directorio de médicos verificados en Monterrey y San Pedro Garza García.`;
    document.title = title;
    setMeta("description", description);
    // Contenido sin revisión médica todavía: no lo indexamos hasta que pase a "revisado" o "publicado".
    setMeta("robots", condition.content_status === "borrador" ? "noindex,follow" : "index,follow");
  }, [condition]);

  useEffect(() => {
    if (!condition) return;
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
      "description": condition.description || condition.meta_description || `${condition.name} en Monterrey y San Pedro Garza García.`,
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
  }, [condition, faqs]);

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

  // Chips "[Especialidad] en [Ciudad]" para dirigir la búsqueda local (Monterrey,
  // San Pedro Garza García, y cualquier ciudad que se agregue después) hacia las
  // páginas /:professionSlug/:citySlug ya existentes. Ordenadas por cuántos
  // especialistas de esta condición hay en cada ciudad, para mostrar primero la
  // más relevante.
  const zoneStats = useMemo(() => {
    return zones
      .map((z) => ({
        zone: z,
        slug: slugify(z.name),
        count: specialists.filter((s) => s.zone === z.name || s.location === z.name).length,
      }))
      .sort((a, b) => b.count - a.count);
  }, [zones, specialists]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
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
            <BreadcrumbPage>{condition.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground">{condition.name}</h1>
        <Link
          to={`/especialistas?specialty=${encodeURIComponent(condition.specialty)}`}
          className="inline-block mt-1.5 text-xs font-medium text-brand-blue hover:underline"
        >
          Atendida por: {condition.specialty}
        </Link>

        {specialtySlug && zoneStats.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {zoneStats.map(({ zone, slug, count }) => (
              <Link
                key={zone.id}
                to={`/${specialtySlug}/${slug}`}
                className="inline-flex items-center gap-1.5 bg-brand-bluePale text-brand-blue hover:bg-brand-blue hover:text-white transition-colors rounded-full pl-3 pr-3.5 py-1.5 text-xs font-medium"
              >
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                {condition.specialty} en {zone.name}
                {count > 0 && <span className="opacity-70">· {count}</span>}
              </Link>
            ))}
          </div>
        )}

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

      {/* Especialistas: lista real si ya hay, o captación (paciente + médico) si todavía no */}
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
                  Aún no tenemos {condition.specialty.toLowerCase()} verificados en Monterrey
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Estamos incorporando especialistas verificados todo el tiempo en Monterrey y San Pedro Garza García.
                </p>
              </div>
            </div>

            <div className="pt-5 border-t border-border/50 flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
              <UserPlus className="w-5 h-5 text-brand-blue flex-shrink-0 hidden sm:block" />
              <p className="text-xs text-muted-foreground flex-1">
                ¿Eres {condition.specialty.toLowerCase()}? Sé de los primeros en aparecer aquí.
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
                : "Mientras sumamos especialistas para esta condición, conoce a los médicos verificados que ya tenemos en Monterrey y San Pedro Garza García."}
            </p>
          </div>
          <Button size="lg" variant="secondary" className="bg-white text-brand-navy hover:bg-white/90 font-heading font-semibold flex-shrink-0 gap-2" asChild>
            <Link to={specialists.length > 0 && specialtySlug ? `/${specialtySlug}/${slugify(zones[0]?.name)}` : "/especialistas"}>
              {specialists.length > 0 ? "Ver todos" : "Ver especialistas"} <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      {relatedConditions.length > 0 && (
        <section className="mb-10">
          <h2 className="font-heading font-semibold text-sm text-foreground mb-3">Otras enfermedades de {condition.specialty}</h2>
          <div className="flex flex-wrap gap-2">
            {relatedConditions.map((c) => (
              <Link
                key={c.id}
                to={`/enfermedades/${c.slug}`}
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
            Artículos sobre {condition.specialty.toLowerCase()}
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
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground mb-5">Preguntas frecuentes sobre {condition.specialty}</h2>
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
