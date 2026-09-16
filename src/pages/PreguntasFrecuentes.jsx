import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Sparkles, ChevronDown, ArrowRight, MessageCircleQuestion, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { setOpenGraph, SITE_OG } from "@/lib/seoMeta";
import { resolveCitySlug } from "@/lib/citySlug";

export default function PreguntasFrecuentes() {
  const [faqs, setFaqs] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [zones, setZones] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [items, specs, zoneList] = await Promise.all([
        base44.entities.FaqItem.filter({ status: "publicado" }),
        base44.entities.Specialty.filter({ active: true }),
        base44.entities.Zone.filter({ active: true }),
      ]);
      setFaqs(items);
      setSpecialties(specs);
      setZones(zoneList);
      setLoading(false);
    }
    load();
  }, []);

  const groups = useMemo(() => {
    const map = {};
    for (const item of faqs) {
      const key = item.specialty || "Generales";
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return Object.entries(map)
      .map(([name, items]) => ({
        name,
        items: items.sort((a, b) => (a.position || 0) - (b.position || 0)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [faqs]);

  useEffect(() => {
    if (!activeGroup && groups.length > 0) setActiveGroup(groups[0].name);
  }, [groups, activeGroup]);

  const currentGroup = groups.find((g) => g.name === activeGroup);
  const specialtyMatch = specialties.find((s) => s.name === activeGroup);

  useEffect(() => {
    const title = "Preguntas Frecuentes sobre Doctores y Especialistas en Monterrey | BuscoUnDoctor";
    const description = "Respuestas a las preguntas más frecuentes sobre especialidades médicas en Monterrey y San Pedro Garza García: síntomas, tratamientos, costos y ubicación de consultorios.";
    document.title = title;
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", description);
    setOpenGraph({ title, description, image: SITE_OG.image });
  }, []);

  // JSON-LD FAQPage: se arma con TODAS las preguntas publicadas (no solo las
  // del grupo/especialidad seleccionado en pantalla). Antes solo mandaba el
  // grupo activo, así que Google nunca veía el resto del contenido como
  // datos estructurados aunque estuviera renderizado en el DOM.
  useEffect(() => {
    if (faqs.length === 0) return;
    const faqLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "faq-page-jsonld";
    script.text = JSON.stringify(faqLd);
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [faqs]);

  // JSON-LD BreadcrumbList: mismo patrón que ya usa BlogPostPage.
  useEffect(() => {
    const breadcrumbLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: "https://buscoundoctor.com/" },
        { "@type": "ListItem", position: 2, name: "Preguntas frecuentes", item: "https://buscoundoctor.com/preguntas-frecuentes" },
      ],
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "faq-breadcrumb-jsonld";
    script.text = JSON.stringify(breadcrumbLd);
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, []);

  // min-h-[100dvh]: evita que el Footer se vea antes de tiempo y brinque al
  // cargar el contenido real (mismo arreglo que Home.jsx/SpecialtyPage.jsx).
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/">Inicio</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage>Preguntas frecuentes</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="bg-white rounded-3xl border border-border/50 shadow-sm p-6 sm:p-10">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 bg-brand-bluePale text-brand-navy text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <Sparkles className="w-3 h-3" />
            Preguntas Frecuentes
          </span>
          <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-foreground leading-tight">
            ¿Tienes dudas? <span className="text-brand-blue">Tenemos respuestas</span>
          </h1>
          <p className="text-muted-foreground mt-3">
            Todo lo que necesitas saber sobre especialidades médicas en Monterrey y San Pedro Garza García: síntomas, tratamientos, costos y ubicación.
          </p>
        </div>

        <div className="grid md:grid-cols-[260px_1fr] gap-8">
          {/* Sidebar de categorías (especialidades) */}
          <aside className="space-y-2">
            <p className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Explorar por especialidad
            </p>
            {groups.map((g) => (
              <button
                key={g.name}
                onClick={() => { setActiveGroup(g.name); setOpenId(null); }}
                className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl text-sm font-medium text-left transition-colors ${
                  activeGroup === g.name
                    ? "bg-brand-blue text-white"
                    : "bg-muted/60 text-foreground hover:bg-muted"
                }`}
              >
                <span>{g.name}</span>
                <span className={`text-xs ${activeGroup === g.name ? "text-white/70" : "text-muted-foreground"}`}>
                  {g.items.length}
                </span>
              </button>
            ))}

            <div className="mt-6 bg-brand-navy rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1.5">
                <MessageCircleQuestion className="w-4 h-4 text-brand-bluePale" />
                <p className="font-heading font-semibold text-sm text-white">¿No encontraste tu respuesta?</p>
              </div>
              <p className="text-xs text-white/70 leading-relaxed mb-3">
                Nuestro equipo puede ayudarte con cualquier otra duda sobre el directorio.
              </p>
              <Button size="sm" className="w-full bg-white text-brand-navy hover:bg-white/90 rounded-xl" asChild>
                <Link to="/contacto">Contactar</Link>
              </Button>
            </div>
          </aside>

          {/* Lista de preguntas de la especialidad seleccionada */}
          <div>
            {currentGroup && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading font-bold text-lg text-foreground">{currentGroup.name}</h2>
                  {specialtyMatch && (
                    <Link
                      to={`/${specialtyMatch.profession_slug}/${resolveCitySlug(zones)}`}
                      className="text-sm font-medium text-brand-blue flex items-center gap-1 hover:gap-2 transition-all flex-shrink-0"
                    >
                      Ver especialistas <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>

                <div className="space-y-2.5">
                  {currentGroup.items.map((item) => {
                    const isOpen = openId === item.id;
                    return (
                      <div key={item.id} className="border border-border/60 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setOpenId(isOpen ? null : item.id)}
                          className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
                        >
                          <span className="text-sm font-medium text-foreground">{item.question}</span>
                          <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                            {item.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {groups.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">Aún no hay preguntas frecuentes publicadas.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
