import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { base44 } from "@/api/base44Client";
import { MapPin, Clock, Calendar, ChevronLeft, Monitor, Users, CheckCircle, Instagram, ShieldCheck, MessageCircle, Phone, Languages, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppointmentForm from "../components/AppointmentForm";
import ReviewList from "../components/ReviewList";
import ReviewForm from "../components/ReviewForm";
import PublicOfficeList from "../components/PublicOfficeList";
import EducationTimeline from "../components/EducationTimeline";
import LanguagesChips from "../components/LanguagesChips";
import SimilarSpecialists from "../components/SimilarSpecialists";
import SpecialistCases from "../components/SpecialistCases";
import SpecialistPosts from "../components/SpecialistPosts";
import { setOpenGraph, SITE_OG } from "@/lib/seoMeta";
import { trackDoctorContact } from "@/utils/trackDoctorStats";

export default function SpecialistProfile() {
  const { slug } = useParams();
  const [specialist, setSpecialist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [insurers, setInsurers] = useState([]);
  const [primaryOffice, setPrimaryOffice] = useState(null);
  const [zoneName, setZoneName] = useState("");
  const [descExpanded, setDescExpanded] = useState(false);
  const [languageNames, setLanguageNames] = useState([]);
  const [allReviews, setAllReviews] = useState([]);

  const getNext8Days = () => {
    const days = [];
    for (let i = 0; i < 8; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const formatDayLabel = (date) => {
    if (date.toDateString() === new Date().toDateString()) return 'Hoy';
    return date.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });
  };

  const formatDateValue = (date) => {
    return date.toISOString().split('T')[0];
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setShowForm(true);
    trackDoctorContact(specialist);
  };

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
          const offices = await base44.entities.Office.filter({ specialist_id: specialist.id });
          if (offices.length > 0) {
            const primary = offices.find(o => o.is_primary) || offices[0];
            setPrimaryOffice(primary);
            if (primary.zone_id) {
              const zones = await base44.entities.Zone.filter({ id: primary.zone_id });
              if (zones.length > 0) setZoneName(zones[0].name);
            }
          }
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
        
        // Add JSON-LD LocalBusiness schema
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

        // Open Graph: sobrescribe los defaults del Layout con datos del médico
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

  const whatsappHref = specialist.whatsapp
    ? `https://wa.me/${specialist.whatsapp.replace(/[^\d]/g, "")}?text=${encodeURIComponent("Hola, encontré su perfil en BuscoUnDoctor y me gustaría agendar una cita.")}`
    : null;

  const displayAddress = primaryOffice?.address_line || specialist.address;
  const displayLocation = zoneName || specialist.city || specialist.zone;
  const displayPhone = primaryOffice?.phone;

  const description = specialist.description || "";
  const isLongDescription = description.length > 300;
  const shownDescription = !isLongDescription || descExpanded
    ? description
    : description.slice(0, 300).trim() + "…";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-28 sm:pb-10">
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

      {/* Header: foto cuadrada + nombre + tarjeta de calificación, estilo directorio profesional */}
      <div className="bg-card rounded-3xl border border-border/50 shadow-lg p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border border-border/50 shadow-sm flex-shrink-0 bg-muted mx-auto sm:mx-0">
            {specialist.profile_photo ?
            <img src={specialist.profile_photo} alt={`Foto de perfil de ${specialist.full_name}`} className="w-full h-full object-cover object-top" /> :

            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center">
                <span className="font-heading font-bold text-2xl text-primary/40">
                  {specialist.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </span>
              </div>
            }
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0 w-full">
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-foreground">
              {specialist.full_name}
            </h1>
            <p className="text-muted-foreground font-semibold text-sm sm:text-base mt-1">
              {specialist.specialty}
              {specialist.years_experience && <> {'\u00b7'} {specialist.years_experience}+ años de experiencia</>}
            </p>

            {/* Tarjeta blanca de calificación */}
            <div className="mt-4 border border-border/60 rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 flex-wrap">
              <div>
                {specialist.rating != null ? (
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="font-heading font-bold text-sm text-foreground">{specialist.rating.toFixed(1)} de calificación</span>
                    <span className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-4 h-4 ${specialist.rating >= s ? "fill-amber-400 text-amber-400" : "text-border"}`} />
                      ))}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Aún sin calificación</span>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {allReviews.length > 0 ? `Basado en ${allReviews.length} reseña${allReviews.length !== 1 ? "s" : ""}` : "Sé el primero en dejar una reseña"}
                </p>
              </div>
              <a href="#resenas" className="text-xs font-semibold text-brand-blue hover:underline flex-shrink-0">Ver reseñas</a>
            </div>

            {displayAddress &&
            <p className="flex items-center justify-center sm:justify-start gap-1.5 text-sm text-muted-foreground mt-3">
                <MapPin className="w-4 h-4 text-brand-blue flex-shrink-0" />
                {displayAddress}
              </p>
            }

            {specialist.license_verification_status === "verified" && (
              <div className="inline-flex items-center gap-1.5 mt-3 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-3 py-1.5 rounded-full w-fit">
                <ShieldCheck className="w-3.5 h-3.5" />
                Cédula profesional verificada
              </div>
            )}

            {(languageNames.length > 0 || specialist.modality) && (
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                {languageNames.length > 0 && (
                  <span className="flex items-center gap-1.5 text-xs font-medium bg-brand-bluePale text-brand-navy rounded-full px-3 py-1.5">
                    <Languages className="w-3.5 h-3.5" />
                    {languageNames.join(", ")}
                  </span>
                )}
                {specialist.modality === "online" && (
                  <span className="flex items-center gap-1.5 text-xs font-medium bg-brand-bluePale text-brand-navy rounded-full px-3 py-1.5">
                    <Monitor className="w-3.5 h-3.5" />
                    Consulta virtual disponible
                  </span>
                )}
                {specialist.modality === "ambas" && (
                  <span className="flex items-center gap-1.5 text-xs font-medium bg-brand-bluePale text-brand-navy rounded-full px-3 py-1.5">
                    <Monitor className="w-3.5 h-3.5" />
                    Presencial y en línea
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Botones de acción tipo píldora */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mt-6">
          {whatsappHref &&
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-3 min-h-[44px] rounded-full shadow-sm transition-colors">
            
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
          }
          {displayPhone &&
          <a
            href={`tel:${displayPhone.replace(/[^\d+]/g, "")}`}
            className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue/90 text-white text-sm font-semibold px-5 py-3 min-h-[44px] rounded-full shadow-sm transition-colors">
            
              <Phone className="w-4 h-4" />
              Llamar
            </a>
          }
          <button
            onClick={() => { setShowForm(true); trackDoctorContact(specialist); }}
            className="inline-flex items-center gap-2 bg-brand-bluePale hover:bg-brand-bluePale/70 text-brand-navy text-sm font-semibold px-5 py-3 min-h-[44px] rounded-full transition-colors">
            
            <Calendar className="w-4 h-4" />
            Agendar cita
          </button>
          {specialist.price_from && (
            <span className="text-sm font-medium text-primary bg-accent px-3 py-2 rounded-full">
              Desde ${specialist.price_from} MXN
            </span>
          )}
        </div>

        {/* Info: experiencia, cedula, estrellas */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-5 pt-5 border-t border-border/50 text-sm text-muted-foreground">
          {specialist.years_experience &&
          <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {specialist.years_experience} años de experiencia
            </span>
          }
          {specialist.certifications &&
          <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-primary" />
              Cédula: <span className="font-medium text-foreground">{specialist.certifications.replace(/cédula\s*(profesional)?:?\s*/i, '').split(/[,\-|]/)[0].trim()}</span>
            </span>
          }
          {specialist.rating != null &&
          <span className="flex items-center gap-1.5">
              <span className="text-brand-blue text-base leading-none">
                {'★'.repeat(Math.round(specialist.rating))}{'☆'.repeat(5 - Math.round(specialist.rating))}
              </span>
              <span className="text-sm font-semibold text-foreground">{specialist.rating.toFixed(1)}</span>
            </span>
          }
        </div>

        {/* Date picker mobile - selección de fecha para agendar */}
        <div className="mt-5 lg:hidden">
          <p className="text-sm font-heading font-semibold text-foreground mb-1">Selecciona una fecha</p>
          <p className="text-xs text-muted-foreground mb-3">para agendar tu cita</p>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {getNext8Days().map((date, i) =>
              <button
                key={i}
                onClick={() => handleDateSelect(date)}
                className="flex flex-col items-center gap-0.5 p-2 rounded-xl border border-border/50 hover:border-primary hover:bg-accent transition-all text-center group">
                
                <span className="text-xs text-muted-foreground group-hover:text-primary font-medium leading-tight">
                  {formatDayLabel(date).split(' ')[0]}
                </span>
                <span className="text-sm font-heading font-bold text-foreground group-hover:text-primary">
                  {date.getDate()}
                </span>
              </button>
              )}
          </div>
        </div>
      </div>

      {/* Navegación interna sticky (escritorio) */}
      <nav className="hidden lg:flex items-center gap-1 mt-8 mb-2 sticky top-16 z-30 bg-background/95 backdrop-blur-sm py-3 border-b border-border/50 text-sm">
        <a href="#sobre-mi" className="px-3 py-1.5 rounded-full text-muted-foreground hover:text-brand-navy hover:bg-brand-bluePale transition-colors font-medium">Sobre mí</a>
        <a href="#formacion" className="px-3 py-1.5 rounded-full text-muted-foreground hover:text-brand-navy hover:bg-brand-bluePale transition-colors font-medium">Formación</a>
        <a href="#consultorios" className="px-3 py-1.5 rounded-full text-muted-foreground hover:text-brand-navy hover:bg-brand-bluePale transition-colors font-medium">Consultorios</a>
        <a href="#aseguradoras" className="px-3 py-1.5 rounded-full text-muted-foreground hover:text-brand-navy hover:bg-brand-bluePale transition-colors font-medium">Aseguradoras</a>
        <a href="#resenas" className="px-3 py-1.5 rounded-full text-muted-foreground hover:text-brand-navy hover:bg-brand-bluePale transition-colors font-medium">Reseñas</a>
      </nav>

      <div className="mt-2 lg:grid lg:grid-cols-3 lg:gap-8 lg:items-start">
      <div className="lg:col-span-2">

      <LanguagesChips specialistId={specialist.id} />

      {/* Descripción + Video */}
      {(specialist.description || specialist.video_url) &&
      <div id="sobre-mi" className="mt-6 bg-card rounded-3xl border border-border/50 p-6 sm:p-8 scroll-mt-32">
          <h2 className="font-heading font-bold text-lg text-foreground mb-3">Sobre el especialista</h2>
          {specialist.video_url &&
        <div className="mt-0 mb-5">
              
              <video
            src={specialist.video_url}
            controls
            className="w-full rounded-2xl max-h-64 bg-black"
            playsInline />
          
            </div>
        }
          {specialist.description &&
        <p className="text-sm text-muted-foreground leading-relaxed">
              {shownDescription}
              {isLongDescription &&
              <button
                onClick={() => setDescExpanded(v => !v)}
                className="text-brand-blue font-medium ml-1 hover:underline">
                
                  {descExpanded ? "Leer menos" : "Leer más"}
                </button>
              }
            </p>
        }
        </div>
      }

      <div id="formacion" className="scroll-mt-32">
        <EducationTimeline specialistId={specialist.id} />
      </div>

      {/* Servicios / Especialidades */}
      {specialist.services?.length > 0 &&
      <div className="mt-6 bg-card rounded-3xl border border-border/50 p-6 sm:p-8">
          <h2 className="font-heading font-bold text-lg text-foreground mb-4">Especialidades y enfoques</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {specialist.services.map((service, i) =>
          <div key={i} className="flex items-center gap-2.5 text-sm text-foreground">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                {service}
              </div>
          )}
          </div>
          <div id="aseguradoras" className="mt-5 pt-5 border-t border-border/50 scroll-mt-32">
              <h3 className="font-heading font-semibold text-sm text-foreground mb-3">Aseguradoras aceptadas</h3>
              {resolvedInsurers.length > 0 ?
              <div className="flex flex-wrap gap-2">
                  {resolvedInsurers.map((ins, i) =>
              <span key={i} className="text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded-full flex items-center gap-1.5">
                     {ins.logo_url && <img src={ins.logo_url} alt={ins.name} className="w-4 h-4 object-contain" />}
                     {ins.name}
                   </span>
              )}
               </div> :

              <span className="text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded-full">N/A</span>
              }
            </div>
          </div>
      }

      {specialist.gallery?.length > 0 &&
      <div className="mt-6 bg-card rounded-3xl border border-border/50 p-6 sm:p-8">
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {specialist.gallery.map((img, i) =>
          <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-muted">
                <img src={img} alt={`Galería de ${specialist.full_name}, imagen ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              </div>
          )}
          </div>
        </div>
      }

      <div id="consultorios" className="scroll-mt-32">
        <PublicOfficeList specialistId={specialist.id} />
      </div>

      <SpecialistCases specialistId={specialist.id} />
      <SpecialistPosts specialistId={specialist.id} />

      {/* Tipos de consulta */}
      {specialist.modality &&
      <div className="mt-6 bg-card rounded-3xl border border-border/50 p-6 sm:p-8">
          <h2 className="font-heading font-bold text-lg text-foreground mb-4">Tipos de consulta</h2>
          <div className="flex flex-wrap gap-3">
            {(specialist.modality === 'presencial' || specialist.modality === 'ambas') &&
          <div className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2.5 rounded-xl text-sm font-medium">
                <Users className="w-4 h-4" />
                Presencial
              </div>
          }
            {(specialist.modality === 'online' || specialist.modality === 'ambas') &&
          <div className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2.5 rounded-xl text-sm font-medium">
                <Monitor className="w-4 h-4" />
                En línea
              </div>
          }
          </div>
          {specialist.instagram &&
        <div className="mt-4 pt-4 border-t border-border/50">
              <a
            href={`https://instagram.com/${specialist.instagram.replace(/^@/, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary bg-accent hover:bg-accent/80 px-4 py-2.5 rounded-xl transition-colors">
            
                <Instagram className="w-4 h-4" />
                @{specialist.instagram.replace(/^@/, '')}
              </a>
            </div>
        }
        </div>
      }

      {/* Reseñas */}
      <div id="resenas" className="mt-6 bg-card rounded-3xl border border-border/50 p-6 sm:p-8 scroll-mt-32">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading font-bold text-lg text-foreground">Reseñas de pacientes</h2>
          {!showReviewForm &&
          <button
            onClick={() => setShowReviewForm(true)}
            className="text-sm font-medium text-primary border border-primary/30 bg-accent hover:bg-primary/10 px-4 py-1.5 rounded-full transition-colors">
            
              ✏️ Escribir reseña
            </button>
          }
        </div>
        <ReviewList specialistId={specialist.id} />
        {allReviews.length > 0 && (
          <div className="mb-6 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = allReviews.filter((r) => Math.round(r.rating) === star).length;
              const pct = Math.round((count / allReviews.length) * 100);
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-0.5 w-10 flex-shrink-0 text-muted-foreground">
                    {star} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  </span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-brand-blue rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-9 text-right text-muted-foreground flex-shrink-0">{pct}%</span>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground pt-1">Basado en {allReviews.length} reseña{allReviews.length !== 1 ? "s" : ""} verificada{allReviews.length !== 1 ? "s" : ""}</p>
          </div>
        )}
        {showReviewForm &&
        <div className="mt-6 pt-6 border-t border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-base text-foreground">Dejar una reseña</h3>
              <button onClick={() => setShowReviewForm(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
            </div>
            <ReviewForm specialist={specialist} />
          </div>
        }
      </div>

      </div>

      {/* Sidebar de contacto fijo (escritorio) */}
      <aside className="hidden lg:block lg:col-span-1">
        <div className="sticky top-32 bg-card rounded-3xl border border-border/50 shadow-sm p-6 space-y-4">
          <div>
            <p className="font-heading font-semibold text-base text-foreground">¿Tienes alguna pregunta?</p>
            <p className="text-xs text-muted-foreground mt-1">Contacta directamente a {specialist.full_name?.split(' ')[0]}.</p>
          </div>
          {specialist.license_verification_status === "verified" && (
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-3 py-1.5 rounded-full w-fit">
              <ShieldCheck className="w-3.5 h-3.5" />
              Cédula verificada
            </div>
          )}
          <div className="flex flex-col gap-2.5">
            {whatsappHref &&
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-3 min-h-[44px] rounded-full shadow-sm transition-colors">
              
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
            }
            <button
              onClick={() => { setShowForm(true); trackDoctorContact(specialist); }}
              className="inline-flex items-center justify-center gap-2 bg-brand-navy hover:bg-brand-navy/90 text-white text-sm font-semibold px-5 py-3 min-h-[44px] rounded-full transition-colors">
              
              <Calendar className="w-4 h-4" />
              Agendar cita
            </button>
          </div>
          {specialist.price_from && (
            <p className="text-xs text-muted-foreground">Precio de consulta: <span className="font-semibold text-foreground">Desde ${specialist.price_from} MXN</span></p>
          )}
          <p className="text-[11px] text-muted-foreground border-t border-border/50 pt-3">La reserva y el contacto son gratuitos.</p>
        </div>
      </aside>
      </div>

      <SimilarSpecialists specialistId={specialist.id} specialty={specialist.specialty} zone={specialist.zone} />

      {/* CTA fijo en móvil */}
      {whatsappHref &&
      <div className="fixed bottom-0 inset-x-0 z-40 sm:hidden bg-card border-t border-border/50 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-5 py-3.5 min-h-[44px] rounded-full shadow-sm transition-colors">
          
            <MessageCircle className="w-4 h-4" />
            Contactar por WhatsApp
          </a>
        </div>
      }

      {/* Appointment Form Modal */}
      {showForm &&
      <AppointmentForm specialist={specialist} initialDate={selectedDate ? formatDateValue(selectedDate) : ''} onClose={() => {setShowForm(false);setSelectedDate(null);}} />
      }
    </div>);

}
