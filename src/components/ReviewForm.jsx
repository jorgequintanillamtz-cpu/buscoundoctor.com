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
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Por favor selecciona una calificación");
      return;
    }
    setLoading(true);
    await base44.entities.Review.create({
      specialist_id: specialist.id,
      specialist_name: specialist.full_name,
      patient_name: name,
      rating,
      comment,
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
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Tu calificación *</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
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

      <Button type="submit" disabled={loading} className="w-full rounded-xl font-heading font-semibold">
        {loading ? "Enviando..." : "Enviar reseña"}
      </Button>
      <p className="text-xs text-muted-foreground text-center">Tu reseña será revisada antes de publicarse.</p>
    </form>
  );
}