import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Stethoscope, UserPlus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import SpecialistCard from "@/components/SpecialistCard";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

// Formulario simple para capturar el interés de un paciente cuando todavía no
// hay especialistas publicados en la especialidad de esta condición.
function NotifyMeForm({ conditionSlug, conditionName }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Escribe un correo válido");
      return;
    }
    setLoading(true);
    try {
      await base44.entities.NewsletterSubscriber.create({
        email: email.trim(),
        source: `condicion:${conditionSlug}`,
      });
      setSent(true);
    } catch {
      toast.error("No se pudo registrar tu correo. Intenta de nuevo.");
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="flex items-center gap-2 text-sm text-brand-navy font-medium">
        <CheckCircle2 className="w-4 h-4 text-brand-blue flex-shrink-0" />
        Listo, te avisamos en cuanto tengamos un especialista disponible.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
      <Input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@correo.com"
        className="h-11 rounded-xl text-sm"
        aria-label={`Avísame cuando haya especialistas para ${conditionName}`}
      />
      <Button type="submit" disabled={loading} className="h-11 rounded-xl font-heading font-semibold whitespace-nowrap">
        {loading ? "Enviando..." : "Avísame"}
      </Button>
    </form>
  );
}

export default function ConditionDetailPage() {
  const { slug } = useParams();
  const [condition, setCondition] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [specialists, setSpecialists] = useState([]);
  const [relatedConditions, setRelatedConditions] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const conditionList = await base44.entities.Condition.filter({ slug });
      const found = conditionList.find((c) => c.active !== false);
      if (!active) return;
      if (!found) { setNotFound(true); setLoading(false); return; }

      const [specialtyList, allSpecialists, allConditions] = await Promise.all([
        base44.entities.Specialty.filter({ name: found.specialty }),
        base44.entities.Specialist.filter({ specialty: found.specialty, active: true, publication_status: "published" }),
        base44.entities.Condition.filter({ specialty: found.specialty, active: true }),
      ]);
      if (!active) return;

      const specialtyRecord = specialtyList[0];
      const faqItems = specialtyRecord
        ? await base44.entities.FaqItem.filter({ specialty_id: specialtyRecord.id, status: "publicado" })
        : [];
      if (!active) return;

      setCondition(found);
      setSpecialists(allSpecialists);
      setRelatedConditions(allConditions.filter((c) => c.slug !== found.slug).slice(0, 8));
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
    const medicalLd = {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      "name": condition.name,
      "description": condition.description || condition.meta_description || `${condition.name} en Monterrey y San Pedro Garza García.`,
      "about": { "@type": "MedicalCondition", "name": condition.name },
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

  const paragraphs = useMemo(() => {
    if (!condition?.description) return [];
    return condition.description.split(/\n{2,}/).filter(Boolean);
  }, [condition]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
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

        <section className="mt-4 max-w-3xl space-y-3">
          {(paragraphs.length > 0 ? paragraphs : ["Contenido en preparación."]).map((para, i) => (
            <p key={i} className="text-muted-foreground leading-relaxed text-sm sm:text-base">{para}</p>
          ))}
        </section>
      </div>

      {/* Especialistas: lista real si ya hay, o captación (paciente + médico) si todavía no */}
      <section className="mb-10">
        {specialists.length > 0 ? (
          <>
            <h2 className="font-heading font-bold text-lg sm:text-xl text-foreground mb-4">
              Especialistas que atienden {condition.name.toLowerCase()}
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {specialists.map((s, i) => (
                <SpecialistCard key={s.id} specialist={s} priority={i === 0} sourcePage="condicion" />
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
                  Estamos incorporando especialistas todo el tiempo. Déjanos tu correo y te avisamos en cuanto haya uno disponible.
                </p>
              </div>
            </div>
            <NotifyMeForm conditionSlug={condition.slug} conditionName={condition.name} />

            <div className="mt-5 pt-5 border-t border-border/50 flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
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
