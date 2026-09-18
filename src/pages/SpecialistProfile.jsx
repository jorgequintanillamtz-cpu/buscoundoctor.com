import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Star, Stethoscope } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import VerifiedSeal from "../components/profile/VerifiedSeal";
import PublicOfficeList from "../components/PublicOfficeList";
import EducationTimeline from "../components/EducationTimeline";
import SpecialistHighlights from "../components/SpecialistHighlights";
import SimilarSpecialists from "../components/SimilarSpecialists";
import SpecialistCases from "../components/SpecialistCases";
import SpecialistPosts from "../components/SpecialistPosts";
import DoctorArticles from "../components/profile/DoctorArticles";
import SpecialistServices from "../components/SpecialistServices";
import ScrollSpyNav from "../components/profile/ScrollSpyNav";
import { usePresentSectionIds } from "@/hooks/usePresentSectionIds";
import EspecialidadesSection from "../components/profile/EspecialidadesSection";
import ReviewsSection from "../components/profile/ReviewsSection";
import FaqSection from "../components/profile/FaqSection";
import BookingSidebar from "../components/profile/BookingSidebar";
import MobileBookingBar from "../components/profile/MobileBookingBar";
import ShareProfileButton from "../components/profile/ShareProfileButton";
import { setOpenGraph, SITE_OG, buildAbsoluteUrl } from "@/lib/seoMeta";

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

const MODALITY_LABELS = {
  presencial: "Atiende presencial",
  online: "Atiende en línea",
  ambas: "Presencial y en línea",
};

const NAV_SECTIONS = [
  { id: "informacion", label: "Información" },
  { id: "especialidades", label: "Especialidades" },
  { id: "experiencia", label: "Experiencia" },
  { id: "tecnologia-tratamientos", label: "Tecnología y tratamientos" },
  { id: "estudios", label: "Estudios" },
  { id: "hospitales", label: "Hospitales" },
  { id: "servicios", label: "Servicios" },
  { id: "faq", label: "Preguntas frecuentes" },
  { id: "opiniones", label: "Opiniones" },
];

// Array estáble (fuera del componente) para no invalidar el useEffect del
// hook usePresentSectionIds en cada render.
const NAV_SECTION_IDS = NAV_SECTIONS.map((s) => s.id);

const PAYMENT_LABELS = { tarjeta: "Tarjeta", transferencia: "Transferencia", efectivo: "Efectivo" };

export default function SpecialistProfile() {
  const { slug } = useParams();
  const [specialist, setSpecialist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [insurers, setInsurers] = useState([]);
  const [offices, setOffices] = useState([]);
  const [descExpanded, setDescExpanded] = useState(false);
  const [languageNames, setLanguageNames] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [services, setServices] = useState([]);
  // Vista rápida en el hero: años de experiencia + primeras enfermedades que
  // trata, para que se vean sin tener que bajar hasta "Especialidades". Es
  // un resumen -- el detalle completo (con enlaces a /enfermedades) sigue
  // viviendo en EspecialidadesSection más abajo.
  const [topConditions, setTopConditions] = useState([]);
  // Nombre "como lo busca el paciente" (ej. "Ginecólogo") de la especialidad
  // del doctor, resuelto contra el banco de especialidades. Cae de regreso
  // al nombre formal (specialist.specialty) si no hay match.
  const [specialtyDisplay, setSpecialtyDisplay] = useState(null);
  // Mismo criterio que ScrollSpyNav (escritorio): en el nav de anclas de
  // móvil tampoco tiene caso mostrar un título que lleva a una sección que
  // el doctor nunca llegó a llenar. Se declara aquí arriba (junto con el
  // resto de los hooks) porque el componente tiene un return condicional
  // más abajo mientras carga/si no encuentra al especialista.
  const presentSectionIds = usePresentSectionIds(NAV_SECTION_IDS);

  useEffect(() => {
    async function load() {
      const results = await base44.entities.Specialist.filter({ slug, active: true });
      if (results.length > 0) {
        const specialist = results[0];
        setSpecialist(specialist);

        let specialtyDisplayName = specialist.specialty;
        try {
          const specMatches = await base44.entities.Specialty.filter({ name: specialist.specialty });
          if (specMatches[0]?.display_name) specialtyDisplayName = specMatches[0].display_name;
        } catch {}
        setSpecialtyDisplay(specialtyDisplayName);

        try {
          const insList = await base44.entities.Insurer.list('name', 50);
          setInsurers(insList);
        } catch {}

        try {
          const offList = await base44.entities.Office.filter({ specialist_id: specialist.id });
          setOffices(offList);
        } catch {}

        try {
          const links = await base44.entities.SpecialistLanguage.filter({ specialist_id: specialist.id });
          if (links.length > 0) {
            const allLangs = await base44.entities.Language.list('name', 50);
            const names = links.map(l => allLangs.find(la => la.id === l.language_id)?.name).filter(Boolean);
            setLanguageNames(names);
          }
        } catch {}

        // Declarada fuera del try para poder reusarla más abajo al armar el
        // JSON-LD (el estado de React vía setAllReviews no se refleja de
        // inmediato dentro de este mismo efecto async).
        let reviewsForSchema = [];
        try {
          const revs = await base44.entities.Review.filter({ specialist_id: specialist.id, approved: true });
          reviewsForSchema = revs;
          setAllReviews(revs);
        } catch {}

        try {
          const svcList = await base44.entities.SpecialistService.filter({ specialist_id: specialist.id });
          setServices(svcList.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
        } catch {}

        try {
          const curated = specialist.conditions_relation || [];
          if (curated.length > 0) {
            const all = await base44.entities.Condition.list("name", 2000);
            setTopConditions(curated.map((id) => all.find((c) => c.id === id)).filter(Boolean).slice(0, 4));
          } else if (specialist.specialty) {
            const list = await base44.entities.Condition.filter({ specialty: specialist.specialty, active: true });
            setTopConditions(list.slice(0, 4));
          }
        } catch {}

        // JSON-LD Physician. El teléfono llevaba un bug: specialist.whatsapp
        // ya viene guardado CON el 52 de México (ej. "528113456789"), pero
        // aquí se le anteponia otro "+52" encima, generando un teléfono
        // duplicado/inválido ("+52528113456789") tanto para los resultados
        // enriquecidos de Google como para cualquier sistema de IA que lea
        // este dato estructurado. También se agrega la foto, las reseñas
        // reales (no solo el promedio) e Instagram si lo tiene — más señales
        // verificables ayudan tanto al SEO tradicional como a que asistentes
        // de IA (ChatGPT, Perplexity, etc.) tengan datos concretos que citar.
        const realReviews = reviewsForSchema.filter((r) => r.comment?.trim());
        const schema = {
          "@context": "https://schema.org",
          "@type": "Physician",
          "name": specialist.full_name,
          "description": specialist.description || specialtyDisplayName,
          "medicalSpecialty": specialtyDisplayName,
          ...(specialist.profile_photo && { "image": specialist.profile_photo }),
          "address": {
            "@type": "PostalAddress",
            "streetAddress": specialist.address || "",
            "addressLocality": specialist.city || "Monterrey",
            "addressRegion": "Nuevo León",
            "addressCountry": "MX"
          },
          "telephone": specialist.whatsapp ? `+${specialist.whatsapp}` : "",
          "url": window.location.href,
          ...(specialist.instagram && { "sameAs": [`https://instagram.com/${specialist.instagram.replace(/^@/, "")}`] }),
          ...(specialist.rating && {
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": specialist.rating,
              "reviewCount": reviewsForSchema.length || 1,
              "bestRating": "5",
              "worstRating": "1"
            }
          }),
          ...(realReviews.length > 0 && {
            "review": realReviews.slice(0, 10).map((r) => ({
              "@type": "Review",
              "author": { "@type": "Person", "name": r.patient_name || "Paciente" },
              "reviewBody": r.comment,
              "reviewRating": { "@type": "Rating", "ratingValue": r.rating, "bestRating": "5", "worstRating": "1" }
            }))
          })
        };

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.innerHTML = JSON.stringify(schema);
        document.head.appendChild(script);

        const zoneLabel = specialist.zone || specialist.location || "Monterrey";
        const pageTitle = `${specialist.full_name} — ${specialtyDisplayName} en ${zoneLabel} | BuscoUnDoctor`;

        // Descripción para redes/WhatsApp: cuando hay reseñas reales se antepone
        // el rating (la señal que más empuja el clic en una tarjeta compartida),
        // seguido de la propia descripción del doctor o, si no escribió una, un
        // fallback genérico. Se recorta a 160 caracteres en total (límite usual
        // de las tarjetas de WhatsApp/Facebook antes de truncar con "...").
        const ratingPrefix = reviewsForSchema.length > 0 && specialist.rating
          ? `⭐ ${Number(specialist.rating).toFixed(1)} (${reviewsForSchema.length} reseña${reviewsForSchema.length !== 1 ? "s" : ""}) · `
          : "";
        const baseDescription = specialist.description
          || `Especialista en ${specialtyDisplayName} en ${zoneLabel}. Cédula profesional verificada. Contacta directo y agenda tu cita.`;
        const pageDescription = `${ratingPrefix}${baseDescription}`.slice(0, 160);
        const pageUrl = buildAbsoluteUrl(`/especialista/${specialist.slug}`);

        // Cada perfil necesita su propio <title> y meta description únicos — sin
        // esto, Google ve todos los perfiles con el mismo título genérico del
        // sitio y ninguno puede posicionar por el nombre del doctor.
        document.title = pageTitle;
        setMeta("description", pageDescription);
        // Perfiles aún no publicados (borrador, en revisión, suspendidos o
        // rechazados) no se indexan hasta que pasen a "published".
        setMeta("robots", specialist.publication_status === "published" ? "index,follow" : "noindex,follow");

        setOpenGraph({
          title: pageTitle,
          description: pageDescription,
          image: specialist.profile_photo || SITE_OG.image,
          imageAlt: `Foto de perfil de ${specialist.full_name}, ${specialtyDisplayName}`,
          url: pageUrl,
        });
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  // min-h-[100dvh]: evita que el Footer se vea antes de tiempo y brinque al
  // cargar el contenido real (mismo arreglo que Home.jsx/SpecialtyPage.jsx).
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>);
  }

  if (!specialist) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="font-heading font-bold text-2xl text-foreground">Especialista no encontrado</h1>
        <Link to="/especialistas" className="text-primary mt-4 inline-block">Ver todos los especialistas</Link>
      </div>);
  }

  const resolvedInsurers = (specialist.insurers_relation || [])
    .map(id => insurers.find(i => i.id === id))
    .filter(Boolean);

  const primaryOffice = offices.find(o => o.is_primary) || offices[0];

  const description = specialist.description || "";
  const isLongDescription = description.length > 300;
  const shownDescription = !isLongDescription || descExpanded
    ? description
    : description.slice(0, 300).trim() + "…";

  const avgRating = allReviews.length > 0
    ? allReviews.reduce((a, r) => a + r.rating, 0) / allReviews.length
    : specialist.rating;

  // Un comentario real destacado junto al hero (no inventado): preferimos el
  // más reciente que sí tenga texto, para que el espacio reservado abajo del
  // rating siempre muestre algo genuino en vez de quedar vacío sin razón.
  const featuredReview = [...allReviews]
    .filter((r) => r.comment?.trim())
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

  const showMobileExtras = resolvedInsurers.length > 0 || specialist.payment_methods?.length > 0 || languageNames.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-28 lg:pb-10">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/">Inicio</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/especialistas">Especialistas</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{specialist.full_name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center justify-between gap-3 mb-4">
        <Link to="/especialistas" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground bg-card border border-border/50 hover:border-border rounded-full px-3 py-1.5 transition-all w-fit">
          <ChevronLeft className="w-3.5 h-3.5" />
          Especialistas
        </Link>
        <ShareProfileButton specialist={specialist} className="!min-h-0 !py-1.5 !px-3 text-xs" />
      </div>

      {specialist.license_verification_status === "verified" && specialist.license_verified_at && (
        <p className="text-xs text-muted-foreground mb-3">
          Última verificación: {new Date(specialist.license_verified_at).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })} · Verificamos manualmente cada cédula profesional
        </p>
      )}

      {/* Nota sobre items-start: aquí NO se usa items-start a propósito. Si el
          contenedor grid alinea sus hijos a start, la celda del <aside> solo
          mide lo alto de su propio contenido y el sticky de adentro no tiene
          espacio para desplazarse — se "desaparece" casi de inmediato al
          hacer scroll. Dejando el stretch por default, la celda del aside se
          estira para igualar el alto de la columna izquierda (mucho más
          alta), dándole al Agendar cita todo ese rango para quedarse fijo. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_460px] gap-8">
      <div className="flex flex-col min-w-0">

      {/* HERO */}
      <div className="pb-2">
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 lg:gap-10 items-start">
          <div className="text-center lg:text-left order-2">
            <div className="flex items-center justify-center lg:justify-start gap-2.5 flex-wrap">
              <h1 className="font-heading font-extrabold text-3xl sm:text-[2.6rem] leading-[1.1] text-brand-navy">
                {specialist.full_name}
              </h1>
              {specialist.license_verification_status === "verified" && (
                <VerifiedSeal size="sm" />
              )}
            </div>
            <p className="text-brand-navy/70 font-semibold text-base sm:text-lg mt-2">
              {specialtyDisplay || specialist.specialty}
              {specialist.subspecialty && <> {'·'} {specialist.subspecialty}</>}
            </p>
            {MODALITY_LABELS[specialist.modality] && (
              <span className="inline-block text-xs font-semibold text-brand-blue bg-brand-bluePale rounded-full px-2.5 py-1 mt-2">
                {MODALITY_LABELS[specialist.modality]}
              </span>
            )}
            {(specialist.years_experience > 0 || topConditions.length > 0) && (
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mt-3">
                {specialist.years_experience > 0 && (
                  <span className="inline-flex items-center text-xs font-semibold text-foreground bg-muted rounded-full px-3 py-1.5 whitespace-nowrap">
                    {specialist.years_experience} años de experiencia
                  </span>
                )}
                {topConditions.map((c) => (
                  <span key={c.id} className="text-xs font-medium bg-accent text-accent-foreground rounded-full px-3 py-1.5">
                    {c.name}
                  </span>
                ))}
              </div>
            )}
            {primaryOffice?.address_line && (
              <p className="text-muted-foreground text-sm mt-1">
                {primaryOffice.address_line}
              </p>
            )}

            {allReviews.length > 0 && (
              <div className="mt-4 min-h-[92px] bg-card border border-border/50 rounded-2xl px-5 py-4 max-w-xl mx-auto lg:mx-0">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center flex-shrink-0 pr-4 border-r border-border/50">
                    <span className="font-heading font-extrabold text-3xl text-foreground leading-none">{avgRating.toFixed(2)}</span>
                    <div className="flex gap-0.5 mt-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-3.5 h-3.5 ${Math.round(avgRating) >= s ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    {featuredReview ? (
                      <>
                        <p className="text-sm text-foreground/80 italic leading-relaxed line-clamp-2">
                          “{featuredReview.comment}”
                        </p>
                        <div className="flex items-center justify-between gap-3 mt-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            {featuredReview.patient_name} · {new Date(featuredReview.created_date).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          <a href="#opiniones" className="text-xs font-semibold text-brand-blue hover:underline whitespace-nowrap">
                            Ver las {allReviews.length} opinión{allReviews.length !== 1 ? "es" : ""} →
                          </a>
                        </div>
                      </>
                    ) : (
                      <a href="#opiniones" className="text-xs font-semibold text-brand-blue hover:underline">
                        Ver las {allReviews.length} opinión{allReviews.length !== 1 ? "es" : ""} →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {specialist.description && (
              <div className="text-sm text-muted-foreground leading-relaxed mt-4">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    ul: ({ children }) => <ul className="list-disc pl-5 mb-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 mb-2">{children}</ol>,
                    li: ({ children }) => <li className="mb-0.5">{children}</li>,
                    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-blue underline">{children}</a>,
                    h1: ({ children }) => <p className="font-heading font-semibold text-foreground mt-2 mb-1">{children}</p>,
                    h2: ({ children }) => <p className="font-heading font-semibold text-foreground mt-2 mb-1">{children}</p>,
                    h3: ({ children }) => <p className="font-heading font-semibold text-foreground mt-2 mb-1">{children}</p>,
                    img: ({ src, alt }) => <img src={src} alt={alt || ""} loading="lazy" className="rounded-xl max-w-full my-2" />,
                  }}
                >
                  {shownDescription}
                </ReactMarkdown>
                {isLongDescription && (
                  <button onClick={() => setDescExpanded(v => !v)} className="text-brand-blue font-medium hover:underline">
                    {descExpanded ? "Leer menos" : "Leer más"}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="relative flex justify-center order-1">
            <div className="relative w-36 h-44 sm:w-48 sm:h-56 rounded-[2rem] overflow-hidden border border-border/50 shadow-md bg-muted">
              {specialist.profile_photo ? (
                <img src={specialist.profile_photo} alt={`Foto de perfil de ${specialist.full_name}`} className="w-full h-full object-cover object-top" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="font-heading font-bold text-4xl text-brand-navy/30">
                    {specialist.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nav sticky con scroll-spy (escritorio) */}
      <ScrollSpyNav sections={NAV_SECTIONS} />

      {/* Quick-nav horizontal (móvil): equivalente en espíritu a "tabs", pero
          como enlaces ancla que hacen scroll — así todo el contenido sigue
          siempre renderizado y visible para Google (no ocultamos paneles). */}
      <nav className="order-1 lg:hidden flex items-center gap-1.5 mt-5 overflow-x-auto pb-1" aria-label="Navegación rápida del perfil">
        {NAV_SECTIONS.filter((s) => presentSectionIds.has(s.id)).map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-accent hover:text-foreground transition-colors whitespace-nowrap"
          >
            {s.label}
          </a>
        ))}
      </nav>

          <div id="informacion" className="order-2 lg:order-1 mt-6 bg-card rounded-3xl border border-border/50 p-6 sm:p-8 scroll-mt-32">
            <h2 className="font-heading font-bold text-lg text-foreground mb-3">Sobre el especialista</h2>
            {specialist.video_url && (
              <div className="mt-0 mb-5">
                <video src={specialist.video_url} controls className="w-full rounded-2xl max-h-64 bg-black" playsInline />
              </div>
            )}
            {(specialist.professional_license_number || specialist.certifications) && (
              <div className="mt-5 pt-5 border-t border-border/50 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                {specialist.professional_license_number && (
                  <span><strong className="text-foreground font-medium">Cédula profesional:</strong> {specialist.professional_license_number}</span>
                )}
                {specialist.certifications && (
                  <span><strong className="text-foreground font-medium">Cédula de especialidad / certificaciones:</strong> {specialist.certifications}</span>
                )}
              </div>
            )}

            {languageNames.length > 0 && (
              <div className="mt-5 pt-5 border-t border-border/50">
                <p className="text-sm font-semibold text-foreground mb-2">Idiomas</p>
                <div className="flex flex-wrap gap-2">
                  {languageNames.map((name, i) => (
                    <span key={i} className="text-xs font-medium bg-accent text-accent-foreground px-3 py-1.5 rounded-full">{name}</span>
                  ))}
                </div>
              </div>
            )}

            {specialist.gallery?.length > 0 && (
              <div className="mt-5 pt-5 border-t border-border/50">
                <p className="text-sm font-semibold text-foreground mb-3">Galería</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {specialist.gallery.map((img, i) => (
                    <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-muted">
                      <img src={img} alt={`Galería de ${specialist.full_name}, imagen ${i + 1}`} loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ESPECIALIDADES */}
          <div className="order-3 lg:order-2">
            <EspecialidadesSection specialist={specialist} />
          </div>

          {/* EXPERIENCIA */}
          <div className="order-4 lg:order-3">
            <EducationTimeline
              specialistId={specialist.id}
              variant="experiencia"
              currentOffices={offices}
              yearsExperience={specialist.years_experience}
            />
          </div>

          {/* TECNOLOGÍA Y TRATAMIENTOS */}
          <div className="order-5 lg:order-4">
            <SpecialistHighlights specialistId={specialist.id} />
          </div>

          {/* ESTUDIOS */}
          <div className="order-6 lg:order-5">
            <EducationTimeline specialistId={specialist.id} variant="estudios" />
          </div>

          {/* HOSPITALES */}
          <div className="order-7 lg:order-6">
            <PublicOfficeList specialistId={specialist.id} />
          </div>

          {/* SERVICIOS */}
          <div className="order-8 lg:order-7">
            <SpecialistServices specialistId={specialist.id} />
          </div>

          {/* Versión móvil de aseguradoras/pagos/idiomas: en escritorio esta
              misma información ya vive en la tarjeta sticky de la derecha,
              que en móvil no se renderiza — así el contenido sigue presente
              e indexable en el HTML que ve el rastreador mobile-first. */}
          {showMobileExtras && (
            <div className="order-9 lg:hidden mt-6 bg-card rounded-3xl border border-border/50 p-6 sm:p-8 space-y-5">
              {resolvedInsurers.length > 0 && (
                <div>
                  <h3 className="text-sm font-heading font-semibold text-foreground mb-2">Acepta seguros</h3>
                  <div className="flex flex-wrap gap-2">
                    {resolvedInsurers.map((ins, i) => (
                      <span key={i} className="text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded-full flex items-center gap-1.5">
                        {ins.logo_url && <img src={ins.logo_url} alt={ins.name} loading="lazy" className="w-4 h-4 object-contain" />}
                        {ins.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {specialist.payment_methods?.length > 0 && (
                <div>
                  <h3 className="text-sm font-heading font-semibold text-foreground mb-2">Métodos de pago</h3>
                  <div className="flex flex-wrap gap-2">
                    {specialist.payment_methods.map((m) => (
                      <span key={m} className="text-xs font-medium bg-accent text-accent-foreground px-3 py-1.5 rounded-full">{PAYMENT_LABELS[m] || m}</span>
                    ))}
                  </div>
                </div>
              )}
              {languageNames.length > 0 && (
                <div>
                  <h3 className="text-sm font-heading font-semibold text-foreground mb-2">Idiomas</h3>
                  <div className="flex flex-wrap gap-2">
                    {languageNames.map((name, i) => (
                      <span key={i} className="text-xs font-medium bg-accent text-accent-foreground px-3 py-1.5 rounded-full">{name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FAQ */}
          <div className="order-10 lg:order-9">
            <FaqSection specialist={specialist} />
          </div>

          {/* Contenido adicional existente (se conserva para no perder SEO/indexación previa) */}
          <div className="order-11 lg:order-10">
            <SpecialistCases specialistId={specialist.id} />
          </div>
          <div className="order-12 lg:order-11">
            <SpecialistPosts specialistId={specialist.id} />
          </div>
          <div className="order-13 lg:order-12">
            <DoctorArticles specialistId={specialist.id} />
          </div>

          {/* Especialistas similares: va DENTRO de la misma columna que el resto
              del contenido (no como hermano fuera del grid), para que el alto de
              esta columna — y por lo tanto el rango en el que el sticky de la
              derecha se mantiene pegado — incluya también esta sección. Un sticky
              solo puede quedarse fijo mientras su propio contenedor tenga alto de
              sobra; si esta sección quedaba fuera del grid, no contaba. */}
          <div className="order-14 lg:order-13">
            <SimilarSpecialists specialistId={specialist.id} specialty={specialist.specialty} zone={specialist.zone} />
          </div>

          {/* OPINIONES: a petición de Jorge, va hasta el final del perfil
              (mismo criterio que Amazon con las reseñas de producto), en vez
              de justo después del hero como antes. */}
          <div className="order-15 lg:order-14">
            <ReviewsSection specialistId={specialist.id} specialist={specialist} />
          </div>
      </div>

      {/* Columna de reserva sticky (escritorio), alineada desde arriba junto al hero */}
      <aside className="hidden lg:block">
          <BookingSidebar
            specialist={specialist}
            offices={offices}
            services={services}
            resolvedInsurers={resolvedInsurers}
          />
        </aside>
      </div>

      {/* Botón fijo "Agendar cita" + Bottom Sheet (móvil) */}
      <MobileBookingBar specialist={specialist} offices={offices} services={services} insurers={resolvedInsurers} />
    </div>
  );
}
