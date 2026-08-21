import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function ReviewForm({ specialist }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [consultationDate, setConsultationDate] = useState("");
  const [treatmentPerformed, setTreatmentPerformed] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  // Honeypot anti-bot: campo invisible que solo un script rellena. Ver
  // nota completa en src/components/AppointmentForm.jsx.
  const [website, setWebsite] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (website) { setSubmitted(true); return; }
    if (rating === 0) {
      toast.error("Por favor selecciona una calificación");
      return;
    }
    setLoading(true);
    await base44.entities.Review.create({
      specialist_id: specialist.id,
      specialist_name: specialist.full_name,
      owner_user_id: specialist.owner_user_id || null,
      patient_name: name,
      rating,
      comment,
      consultation_date: consultationDate || undefined,
      treatment_performed: treatmentPerformed || undefined,
      approved: false,
    });
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-accent/50 rounded-2xl p-6 text-center">
        <p className="text-2xl mb-2">🎉</p>
        <p className="font-heading font-semibold text-foreground">¡Gracias por tu reseña!</p>
        <p className="text-sm text-muted-foreground mt-1">Será revisada por nuestro equipo antes de publicarse.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
      />
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Tu calificación *</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              aria-label={`${star} estrellas`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 ${(hover || rating) >= star ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Tu nombre *</label>
        <Input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Escribe tu nombre"
          className="rounded-xl"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Comentario *</label>
        <Textarea
          required
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Comparte tu experiencia con este especialista..."
          className="rounded-xl min-h-[90px] resize-none"
        />
      </div>

      <div className="rounded-xl border border-dashed border-border/70 p-3 space-y-3 bg-muted/30">
        <p className="text-xs font-medium text-foreground">¿Quieres el sello "Cliente verificado"? (opcional)</p>
        <p className="text-xs text-muted-foreground -mt-2">Compártenos estos datos para que nuestro equipo pueda confirmar tu visita.</p>
        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">Fecha de tu consulta</label>
          <Input
            type="date"
            value={consultationDate}
            onChange={(e) => setConsultationDate(e.target.value)}
            className="rounded-xl"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">¿Qué consulta o tratamiento te realizaron?</label>
          <Input
            value={treatmentPerformed}
            onChange={(e) => setTreatmentPerformed(e.target.value)}
            placeholder="Ej. Limpieza dental, consulta general..."
            className="rounded-xl"
          />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full min-h-[44px] rounded-xl font-heading font-semibold">
        {loading ? "Enviando..." : "Enviar reseña"}
      </Button>
      <p className="text-xs text-muted-foreground text-center">Tu reseña será revisada antes de publicarse.</p>
    </form>
  );
}