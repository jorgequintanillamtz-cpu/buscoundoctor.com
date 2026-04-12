import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function AppointmentForm({ specialist, onClose, initialDate = '' }) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl border border-border/50 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card/95 backdrop-blur-lg z-10 p-5 border-b border-border/50 flex items-center justify-between rounded-t-3xl">
          <div>
            <h2 className="font-heading font-bold text-lg text-foreground">Solicitar cita</h2>
            <p className="text-sm text-muted-foreground">{specialist.full_name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Fecha preferencial</label>
              <Input
                type="date"
                value={form.preferred_date}
                onChange={(e) => update("preferred_date", e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Hora preferencial</label>
              <Input
                type="time"
                value={form.preferred_time}
                onChange={(e) => update("preferred_time", e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
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
            <Button type="submit" size="lg" className="w-full gap-2 rounded-xl font-heading font-semibold h-12">
              <MessageCircle className="w-5 h-5" />
              Ver disponibilidad
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