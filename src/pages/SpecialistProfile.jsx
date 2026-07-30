import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Star } from "lucide-react";
import VerifiedSeal from "../components/profile/VerifiedSeal";
import PublicOfficeList from "../components/PublicOfficeList";
import EducationTimeline from "../components/EducationTimeline";
import SimilarSpecialists from "../components/SimilarSpecialists";
import SpecialistCases from "../components/SpecialistCases";
import SpecialistPosts from "../components/SpecialistPosts";
import SpecialistServices from "../components/SpecialistServices";
import ScrollSpyNav from "../components/profile/ScrollSpyNav";
import EspecialidadesSection from "../components/profile/EspecialidadesSection";
import ReviewsSection from "../components/profile/ReviewsSection";
import FaqSection from "../components/profile/FaqSection";
import BookingSidebar from "../components/profile/BookingSidebar";
import MobileBookingBar from "../components/profile/MobileBookingBar";
import { setOpenGraph, SITE_OG } from "@/lib/seoMeta";

const NAV_SECTIONS = [
  { id: "informacion", label: "Información" },
  { id: "especialidades", label: "Especialidades" },
  { id: "experiencia", label: "Experiencia" },
  { id: "estudios", label: "Estudios" },
  { id: "hospitales", label: "Hospitales" },
  { id: "servicios", label: "Servicios" },
  { id: "opiniones", label: "Opiniones" },
  { id: "faq", label: "Preguntas frecuentes" },
];

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

  useEffect(() => {
    async function load() {
      const results = await base44.entities.Specialist.filter({ slug, active: true });
      if (results.length > 0) {
        const specialist = results[0];
        setSpecialist(specialist);
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

        try {
          const revs = await base44.entities.Review.filter({ specialist_id: specialist.id, approved: true });
          setAllReviews(revs);
        } catch {}

        try {
          const svcList = await base44.entities.SpecialistService.filter({ specialist_id: specialist.id });
          setServices(svcList.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
        } catch {}

        // JSON-LD Physician — se conserva exactamente igual que antes del rediseño.
        const schema = {
          "@context": "https://schema.org",
          "@type": "Physician",
          "name": specialist.full_name,
          "description": specialist.description || specialist.specialty,
          "medicalSpecialty": specialist.specialty,
          "address": {
            "@type": "PostalAddress",
            "streetAddress": specialist.address || "",
            "addressLocality": specialist.city || "Monterrey",
            "addressRegion": "Nuevo León",
            "addressCountry": "MX"
          },
          "telephone": specialist.whatsapp ? `+52${specialist.whatsapp}` : "",
          "url": window.location.href,
          ...(specialist.rating && {
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": specialist.rating,
              "bestRating": "5",
              "worstRating": "1"
            }
          })
        };

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.innerHTML = JSON.stringify(schema);
        document.head.appendChild(script);

        setOpenGraph({
          title: `${specialist.full_name} — ${specialist.specialty} | BuscoUnDoctor`,
          description: specialist.description
            ? specialist.description.slice(0, 160)
            : `Especialista en ${specialist.specialty} en ${specialist.zone || specialist.location || 'Monterrey'}. Cédula profesional verificada. Contacta directo y agenda tu cita.`,
          image: specialist.profile_photo || SITE_OG.image,
        });
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
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
  const whatsappHref = specialist.whatsapp
    ? `https://wa.me/${specialist.whatsapp.replace(/[^\d]/g, "")}?text=${encodeURIComponent("Hola, encontré su perfil en BuscoUnDoctor y me gustaría agendar una cita.")}`
    : null;
  const displayPhone = primaryOffice?.phone;

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
      <Link to="/especialistas" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground bg-card border border-border/50 hover:border-border rounded-full px-3 py-1.5 transition-all mb-4 w-fit">
        <ChevronLeft className="w-3.5 h-3.5" />
        Especialistas
      </Link>

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
      <div className="lg:grid lg:grid-cols-[1fr_460px] gap-8">
      <div className="flex flex-col">

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
              {specialist.specialty}
              {specialist.subspecialty && <> {'·'} {specialist.subspecialty}</>}
            </p>
            {primaryOffice?.address_line && (
              <p className="text-muted-foreground text-sm mt-1">
                {primaryOffice.address_line}
              </p>
            )}

            {allReviews.length > 0 && (
              <div className="flex items-center justify-center lg:justify-start gap-2 mt-3">
                <span className="font-heading font-bold text-lg text-foreground">{avgRating.toFixed(1)}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-3.5 h-3.5 ${Math.round(avgRating) >= s ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">({allReviews.length} opinión{allReviews.length !== 1 ? "es" : ""})</span>
                <a href="#opiniones" className="text-xs font-semibold text-brand-blue hover:underline">Ver todas →</a>
              </div>
            )}

            {featuredReview && (
              <div className="mt-4 min-h-[76px] bg-brand-blueLight/50 border border-brand-blue/10 rounded-2xl px-4 py-3.5 max-w-xl mx-auto lg:mx-0">
                <p className="text-sm text-brand-navy/80 italic leading-relaxed line-clamp-2">
                  “{featuredReview.comment}”
                </p>
                <p className="text-xs text-brand-navy/50 font-medium mt-1.5">— {featuredReview.patient_name}</p>
              </div>
            )}

            {specialist.description && (
              <p className="text-sm text-muted-foreground leading-relaxed mt-4">
                {shownDescription}
                {isLongDescription && (
                  <button onClick={() => setDescExpanded(v => !v)} className="text-brand-blue font-medium ml-1 hover:underline">
                    {descExpanded ? "Leer menos" : "Leer más"}
                  </button>
                )}
              </p>
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
      <nav className="order-2 lg:hidden flex items-center gap-1.5 mt-5 overflow-x-auto pb-1" aria-label="Navegación rápida del perfil">
        {NAV_SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-accent hover:text-foreground transition-colors whitespace-nowrap"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <div className="mt-6 order-1 lg:order-7">
          {/* OPINIONES: en el DOM permanece en el orden lógico de escritorio,
              pero en móvil se muestra primero (order-1) por conversión —
              exactamente lo que pidió Jorge: hero → opiniones → resto. */}
            <ReviewsSection specialistId={specialist.id} specialist={specialist} />
      </div>

          <div id="informacion" className="order-3 lg:order-1 mt-6 bg-card rounded-3xl border border-border/50 p-6 sm:p-8 scroll-mt-32">
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
          <div className="order-4 lg:order-2">
            <EspecialidadesSection specialist={specialist} />
          </div>

          {/* EXPERIENCIA */}
          <div className="order-5 lg:order-3">
            <EducationTimeline
              specialistId={specialist.id}
              variant="experiencia"
              currentOffices={offices}
              yearsExperience={specialist.years_experience}
            />
          </div>

          {/* ESTUDIOS */}
          <div className="order-6 lg:order-4">
            <EducationTimeline specialistId={specialist.id} variant="estudios" />
          </div>

          {/* HOSPITALES */}
          <div className="order-7 lg:order-5">
            <PublicOfficeList specialistId={specialist.id} />
          </div>

          {/* SERVICIOS */}
          <div className="order-8 lg:order-6">
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
                        {ins.logo_url && <img src={ins.logo_url} alt={ins.name} className="w-4 h-4 object-contain" />}
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
          <div className="order-10 lg:order-8">
            <FaqSection specialist={specialist} />
          </div>

          {/* Contenido adicional existente (se conserva para no perder SEO/indexación previa) */}
          <div className="order-11 lg:order-9">
            <SpecialistCases specialistId={specialist.id} />
          </div>
          <div className="order-12 lg:order-10">
            <SpecialistPosts specialistId={specialist.id} />
          </div>

          {/* Especialistas similares: va DENTRO de la misma columna que el resto
              del contenido (no como hermano fuera del grid), para que el alto de
              esta columna — y por lo tanto el rango en el que el sticky de la
              derecha se mantiene pegado — incluya también esta sección. Un sticky
              solo puede quedarse fijo mientras su propio contenedor tenga alto de
              sobra; si esta sección quedaba fuera del grid, no contaba. */}
          <div className="order-13 lg:order-11">
            <SimilarSpecialists specialistId={specialist.id} specialty={specialist.specialty} zone={specialist.zone} />
          </div>
      </div>

      {/* Columna de reserva sticky (escritorio), alineada desde arriba junto al hero */}
      <aside className="hidden lg:block">
          <BookingSidebar
            specialist={specialist}
            offices={offices}
            services={services}
            resolvedInsurers={resolvedInsurers}
            languageNames={languageNames}
            whatsappHref={whatsappHref}
            displayPhone={displayPhone}
          />
        </aside>
      </div>

      {/* Botón fijo "Agendar cita" + Bottom Sheet (móvil) */}
      <MobileBookingBar specialist={specialist} offices={offices} services={services} />
    </div>
  );
}
