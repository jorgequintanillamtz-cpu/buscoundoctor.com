import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MapPin, Clock, Mail, Shield, Calendar, ChevronLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppointmentForm from "../components/AppointmentForm";

export default function SpecialistProfile() {
  const { slug } = useParams();
  const [specialist, setSpecialist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
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
      </div>
    );
  }

  if (!specialist) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="font-heading font-bold text-2xl text-foreground">Especialista no encontrado</h1>
        <Link to="/especialistas" className="text-primary mt-4 inline-block">Ver todos los especialistas</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Link to="/especialistas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ChevronLeft className="w-4 h-4" />
        Volver a especialistas
      </Link>

      {/* Header card */}
      <div className="bg-card rounded-3xl border border-border/50 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/5 to-accent p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-card border-4 border-card shadow-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
              {specialist.profile_photo ? (
                <img src={specialist.profile_photo} alt={specialist.full_name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-heading font-bold text-3xl text-primary">
                  {specialist.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground">{specialist.full_name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                  {specialist.specialty}
                </span>
                {specialist.subspecialty && (
                  <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {specialist.subspecialty}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {specialist.zone || specialist.location}, {specialist.city}
                </span>
                {specialist.years_experience && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {specialist.years_experience} años de experiencia
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="gap-2 rounded-xl font-heading font-semibold flex-1 sm:flex-none" onClick={() => setShowForm(true)}>
              <Calendar className="w-4 h-4" />
              Agendar cita
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 rounded-xl flex-1 sm:flex-none"
              onClick={() => {
                const msg = `Hola ${specialist.full_name}, me gustaría solicitar información sobre una cita.`;
                window.open(`https://wa.me/${specialist.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
              }}
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp directo
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 space-y-6">
          {/* About */}
          {specialist.description && (
            <div className="bg-card rounded-2xl border border-border/50 p-6">
              <h2 className="font-heading font-semibold text-lg text-foreground mb-3">Acerca del especialista</h2>
              <p className="text-muted-foreground leading-relaxed">{specialist.description}</p>
            </div>
          )}

          {/* Services */}
          {specialist.services?.length > 0 && (
            <div className="bg-card rounded-2xl border border-border/50 p-6">
              <h2 className="font-heading font-semibold text-lg text-foreground mb-4">Servicios y tratamientos</h2>
              <div className="flex flex-wrap gap-2">
                {specialist.services.map((service, i) => (
                  <span key={i} className="text-sm bg-accent text-accent-foreground px-3 py-1.5 rounded-full">
                    {service}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {specialist.certifications && (
            <div className="bg-card rounded-2xl border border-border/50 p-6">
              <h2 className="font-heading font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Certificaciones
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{specialist.certifications}</p>
            </div>
          )}

          {/* Gallery */}
          {specialist.gallery?.length > 0 && (
            <div className="bg-card rounded-2xl border border-border/50 p-6">
              <h2 className="font-heading font-semibold text-lg text-foreground mb-4">Galería</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {specialist.gallery.map((img, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden bg-muted">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Schedule */}
          {specialist.schedule && (
            <div className="bg-card rounded-2xl border border-border/50 p-6">
              <h3 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Horarios
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {specialist.schedule.split("|").map(s => s.trim()).join("\n")}
              </p>
            </div>
          )}

          {/* Info */}
          <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
            <h3 className="font-heading font-semibold text-foreground">Información</h3>

            {specialist.address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <span className="text-sm text-muted-foreground">{specialist.address}</span>
              </div>
            )}
            {specialist.email && (
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                <span className="text-sm text-muted-foreground">{specialist.email}</span>
              </div>
            )}
            {specialist.modality && (
              <div className="text-sm">
                <span className="text-muted-foreground">Modalidad: </span>
                <span className="font-medium text-foreground capitalize">{specialist.modality}</span>
              </div>
            )}
            {specialist.price_range && (
              <div className="text-sm">
                <span className="text-muted-foreground">Precio: </span>
                <span className="font-medium text-foreground">{specialist.price_range}</span>
              </div>
            )}
          </div>

          {/* Date picker CTA */}
          <div className="bg-card rounded-2xl border border-border/50 p-5">
            <p className="text-sm font-heading font-semibold text-foreground mb-1">Selecciona una fecha</p>
            <p className="text-xs text-muted-foreground mb-4">para agendar tu cita</p>
            <div className="grid grid-cols-4 gap-2">
              {getNext8Days().map((date, i) => (
                <button
                  key={i}
                  onClick={() => handleDateSelect(date)}
                  className="flex flex-col items-center gap-0.5 p-2 rounded-xl border border-border/50 hover:border-primary hover:bg-accent transition-all text-center group"
                >
                  <span className="text-xs text-muted-foreground group-hover:text-primary font-medium leading-tight">
                    {formatDayLabel(date).split(' ')[0]}
                  </span>
                  <span className="text-sm font-heading font-bold text-foreground group-hover:text-primary">
                    {date.getDate()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Form Modal */}
      {showForm && (
        <AppointmentForm specialist={specialist} initialDate={selectedDate ? formatDateValue(selectedDate) : ''} onClose={() => { setShowForm(false); setSelectedDate(null); }} />
      )}
    </div>
  );
}