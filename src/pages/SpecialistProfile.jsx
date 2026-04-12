import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MapPin, Clock, Calendar, ChevronLeft, Monitor, Users, CheckCircle, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppointmentForm from "../components/AppointmentForm";
import ReviewList from "../components/ReviewList";
import ReviewForm from "../components/ReviewForm";

export default function SpecialistProfile() {
  const { slug } = useParams();
  const [specialist, setSpecialist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

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
  };

  useEffect(() => {
    async function load() {
      const results = await base44.entities.Specialist.filter({ slug, active: true });
      if (results.length > 0) {
        setSpecialist(results[0]);
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Link to="/especialistas" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground bg-card border border-border/50 hover:border-border rounded-full px-3 py-1.5 transition-all mb-4 w-fit">
        <ChevronLeft className="w-3.5 h-3.5" />
        Especialistas
      </Link>

      {/* Header card */}
      <div className="bg-card rounded-3xl border border-border/50 overflow-hidden">
        {/* Hero photo background */}
        <div className="relative h-64 sm:h-80 overflow-hidden">
          {specialist.profile_photo ?
          <img src={specialist.profile_photo} alt={specialist.full_name} className="w-full h-full object-cover object-top" /> :

          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center">
              <span className="font-heading font-bold text-6xl text-primary/40">
                {specialist.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </span>
            </div>
          }
          {/* Info overlaid at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
            <h1 className="font-heading font-bold text-2xl sm:text-3xl" style={{ color: '#073348' }}>
              <span className="block">{specialist.full_name?.split(' ')[0]}</span>
              <span className="block">{specialist.full_name?.split(' ').slice(1).join(' ')}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-sm font-medium bg-white/70 backdrop-blur-sm px-3 py-1 rounded-full" style={{ color: '#073348' }}>
                {specialist.specialty}
              </span>
              {specialist.subspecialty &&
              <span className="text-sm bg-white/50 backdrop-blur-sm px-3 py-1 rounded-full" style={{ color: '#073348' }}>
                  {specialist.subspecialty}
                </span>
              }
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {/* Info: ubicación, experiencia, cedula, estrellas */}
          <div className="flex flex-wrap items-center gap-4 mb-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {specialist.zone || specialist.location}{specialist.city ? `, ${specialist.city}` : ''}
            </span>
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
                <span className="text-amber-400 text-base leading-none">
                  {'★'.repeat(Math.round(specialist.rating))}{'☆'.repeat(5 - Math.round(specialist.rating))}
                </span>
                <span className="text-sm font-semibold text-foreground">{specialist.rating.toFixed(1)}</span>
              </span>
            }
          </div>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" className="gap-2 rounded-xl font-heading font-semibold flex-1 sm:flex-none" onClick={() => setShowForm(true)}>
            <Calendar className="w-4 h-4" />
            Agendar cita
          </Button>
        </div>

        {/* Date picker mobile - below button */}
        <div className="mt-4 lg:hidden">
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
      </div>

      {/* Descripción + Video */}
      {(specialist.description || specialist.video_url) &&
      <div className="mt-6 bg-card rounded-3xl border border-border/50 p-6 sm:p-8">
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
        <p className="text-sm text-muted-foreground leading-relaxed">{specialist.description}</p>
        }
        </div>
      }

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
          <div className="mt-5 pt-5 border-t border-border/50">
              <h3 className="font-heading font-semibold text-sm text-foreground mb-3">Aseguradoras aceptadas</h3>
              {specialist.insurers?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {specialist.insurers.map((ins, i) =>
            <span key={i} className="text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded-full">{ins}</span>
            )}
                </div>
              ) : (
                <span className="text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded-full">N/A</span>
              )}
            </div>
          </div>
          }

      {specialist.gallery?.length > 0 &&
      <div className="mt-6 bg-card rounded-3xl border border-border/50 p-6 sm:p-8">
          <h2 className="font-heading font-bold text-lg text-foreground mb-4">Galería</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {specialist.gallery.map((img, i) =>
          <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-muted">
                <img src={img} alt={`Galería ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              </div>
          )}
          </div>
          {specialist.instagram &&
        <div className="mt-4 pt-4 border-t border-border/50">
              <a
                href={`https://instagram.com/${specialist.instagram.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary bg-accent hover:bg-accent/80 px-4 py-2.5 rounded-xl transition-colors"
              >
                <Instagram className="w-4 h-4" />
                @{specialist.instagram.replace(/^@/, '')}
              </a>
            </div>
        }
        </div>
      }

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
          {specialist.address &&
        <p className="mt-3 text-sm text-muted-foreground flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {specialist.address}
            </p>
        }
        </div>
      }

      {/* Reseñas */}
      <div className="mt-6 bg-card rounded-3xl border border-border/50 p-6 sm:p-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading font-bold text-lg text-foreground">Reseñas de pacientes</h2>
          {!showReviewForm && (
            <button
              onClick={() => setShowReviewForm(true)}
              className="text-sm font-medium text-primary border border-primary/30 bg-accent hover:bg-primary/10 px-4 py-1.5 rounded-full transition-colors"
            >
              ✏️ Escribir reseña
            </button>
          )}
        </div>
        <ReviewList specialistId={specialist.id} />
        {showReviewForm && (
          <div className="mt-6 pt-6 border-t border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-base text-foreground">Dejar una reseña</h3>
              <button onClick={() => setShowReviewForm(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
            </div>
            <ReviewForm specialist={specialist} />
          </div>
        )}
      </div>

      {/* Botón final agendar cita */}
      {/* Appointment Form Modal */}
      {showForm &&
      <AppointmentForm specialist={specialist} initialDate={selectedDate ? formatDateValue(selectedDate) : ''} onClose={() => {setShowForm(false);setSelectedDate(null);}} />
      }
    </div>);

}