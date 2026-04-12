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
        {/* Hero photo */}
        <div className="relative w-full aspect-[4/3] sm:aspect-[16/7] bg-accent overflow-hidden">
          {specialist.profile_photo ? (
            <img src={specialist.profile_photo} alt={specialist.full_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent">
              <span className="font-heading font-bold text-7xl text-primary/30">
                {specialist.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </span>
            </div>
          )}
          {/* Name overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-5 sm:p-7">
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white">{specialist.full_name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-sm font-medium text-white/90 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                {specialist.specialty}
              </span>
              {specialist.subspecialty && (
                <span className="text-sm text-white/80 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
                  {specialist.subspecialty}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info section */}
        <div className="p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {specialist.zone || specialist.location}{specialist.city ? `, ${specialist.city}` : ''}
            </span>
            {specialist.years_experience && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {specialist.years_experience} años de experiencia
              </span>
            )}
          </div>
          {specialist.rating != null && (
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400 text-lg leading-none">
                {'★'.repeat(Math.round(specialist.rating))}{'☆'.repeat(5 - Math.round(specialist.rating))}
              </span>
              <span className="text-sm font-semibold text-foreground">{specialist.rating.toFixed(1)}</span>
            </div>
          )}
          {specialist.modality && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full capitalize">{specialist.modality}</span>
              {specialist.price_range && (
                <span className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full">
                  {specialist.price_range === "$" ? "$800 - $900" : specialist.price_range === "$$" ? "$900 - $1,200" : specialist.price_range === "$$$" ? "$1,200 - $1,600" : "$1,600 - $2,000"}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="px-6 sm:px-8 pb-6 sm:pb-8">
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