import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, MessageCircle, Star, ShieldCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const TIME_SLOTS = ["09:00", "10:30", "12:00", "16:00", "17:30"];

function getNext7Days() {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDateValue(date) {
  return date.toISOString().split("T")[0];
}

function formatDayLabel(date) {
  if (date.toDateString() === new Date().toDateString()) return "Hoy";
  return date.toLocaleDateString("es-MX", { weekday: "short" }).replace(".", "");
}

export default function AppointmentForm({ specialist, onClose, initialDate = "" }) {
  const [form, setForm] = useState({
    patient_name: "",
    phone: "",
    reason: "",
    preferred_date: initialDate,
    preferred_time: "",
    comments: "",
  });

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Save the appointment request
    await base44.entities.AppointmentRequest.create({
      ...form,
      specialist_id: specialist.id,
      specialist_name: specialist.full_name,
    });

    // Build WhatsApp message
    const message = `Hola, me gustaría solicitar una cita.

Nombre: ${form.patient_name}
Teléfono: ${form.phone}
Motivo de consulta: ${form.reason}
Fecha preferencial: ${form.preferred_date}
Hora preferencial: ${form.preferred_time}${form.comments ? `\nComentarios: ${form.comments}` : ""}`;

    // Open WhatsApp
    window.open(
      `https://wa.me/${specialist.whatsapp}?text=${encodeURIComponent(message)}`,
      "_blank"
    );

    onClose();
  };

  const initials = (specialist.full_name || "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl border border-border/50 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Encabezado con foto del médico */}
        <div className="sticky top-0 bg-card/95 backdrop-blur-lg z-10 p-5 border-b border-border/50 rounded-t-3xl">
          <button onClick={onClose} aria-label="Cerrar" className="absolute right-4 top-4 p-2 rounded-xl hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-3 pr-10">
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-border/50 bg-accent flex items-center justify-center">
                {specialist.profile_photo ? (
                  <img src={specialist.profile_photo} alt={`Foto de ${specialist.full_name}`} className="w-full h-full object-cover object-top" />
                ) : (
                  <span className="font-heading font-bold text-sm text-primary/60">{initials}</span>
                )}
              </div>
              {specialist.rating != null && (
                <span className="absolute -bottom-1 -right-1 flex items-center gap-0.5 bg-brand-navy text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                  <Star className="w-2.5 h-2.5 fill-current" />
                  {specialist.rating.toFixed(1)}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="font-heading font-bold text-base text-foreground truncate">Solicitar cita</h2>
              <p className="text-sm text-muted-foreground truncate">{specialist.full_name} · {specialist.specialty}</p>
            </div>
          </div>

          {/* Datos rápidos */}
          {(specialist.license_verification_status === "verified" || specialist.years_experience) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {specialist.license_verification_status === "verified" && (
                <span className="flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Cédula verificada
                </span>
              )}
              {specialist.years_experience && (
                <span className="flex items-center gap-1.5 text-xs font-medium bg-brand-bluePale text-brand-navy rounded-full px-3 py-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {specialist.years_experience} años de experiencia
                </span>
              )}
              <span className="flex items-center gap-1.5 text-xs font-medium bg-accent text-accent-foreground rounded-full px-3 py-1.5">
                <MessageCircle className="w-3.5 h-3.5" />
                Contacto directo
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Selector de fecha tipo calendario semanal */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Selecciona una fecha</label>
            <div className="grid grid-cols-7 gap-1.5">
              {getNext7Days().map((date, i) => {
                const value = formatDateValue(date);
                const selected = form.preferred_date === value;
                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => update("preferred_date", value)}
                    className={`flex flex-col items-center gap-0.5 py-2 rounded-xl border text-center transition-colors ${
                      selected
                        ? "bg-brand-blue border-brand-blue text-white"
                        : "border-border/50 hover:border-brand-blue/50 hover:bg-accent/30"
                    }`}
                  >
                    <span className={`text-[10px] font-medium ${selected ? "text-white/80" : "text-muted-foreground"}`}>
                      {formatDayLabel(date)}
                    </span>
                    <span className="text-sm font-heading font-bold">{date.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selector de hora en píldoras */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Selecciona un horario</label>
            <div className="flex flex-wrap gap-2">
              {TIME_SLOTS.map((slot) => {
                const selected = form.preferred_time === slot;
                return (
                  <button
                    type="button"
                    key={slot}
                    onClick={() => update("preferred_time", slot)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                      selected
                        ? "bg-brand-blue border-brand-blue text-white"
                        : "border-border/50 text-foreground hover:border-brand-blue/50 hover:bg-accent/30"
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Horarios sugeridos — confirma disponibilidad real con el médico por WhatsApp.</p>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Nombre completo *</label>
            <Input
              required
              value={form.patient_name}
              onChange={(e) => update("patient_name", e.target.value)}
              placeholder="Tu nombre"
              className="h-11 rounded-xl"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Teléfono *</label>
            <Input
              required
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="Tu número de teléfono"
              className="h-11 rounded-xl"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Motivo de consulta *</label>
            <Textarea
              required
              value={form.reason}
              onChange={(e) => update("reason", e.target.value)}
              placeholder="Describe brevemente el motivo de tu consulta"
              className="rounded-xl min-h-[80px] resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Comentarios adicionales</label>
            <Textarea
              value={form.comments}
              onChange={(e) => update("comments", e.target.value)}
              placeholder="¿Algo más que debamos saber?"
              className="rounded-xl min-h-[60px] resize-none"
            />
          </div>

          <div className="pt-2">
            <Button type="submit" size="lg" className="w-full gap-2 rounded-xl font-heading font-semibold h-12 bg-brand-blue hover:bg-brand-blue/90 text-white">
              <MessageCircle className="w-5 h-5" />
              Solicitar cita por WhatsApp
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-3">
              Se abrirá WhatsApp con un mensaje prellenado para el especialista
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
