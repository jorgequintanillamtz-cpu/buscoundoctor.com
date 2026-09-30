import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// Formulario público para preguntarle algo a un doctor, sin necesidad de
// cuenta -- mismo patrón que ReviewForm.jsx (honeypot anti-bot incluido, ver
// nota completa en AppointmentForm.jsx). La pregunta nunca se hace pública
// aquí mismo: solo se ve en el perfil una vez que el doctor la responde
// desde su panel (ver DoctorQuestions.jsx).
export default function QuestionForm({ specialist, onSubmitted }) {
  const [name, setName] = useState("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [website, setWebsite] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (website) { setSubmitted(true); return; }
    if (!question.trim()) {
      toast.error("Escribe tu pregunta");
      return;
    }
    setLoading(true);
    try {
      await base44.entities.SpecialistQuestion.create({
        specialist_id: specialist.id,
        specialist_name: specialist.full_name,
        patient_display_name: name.trim() || undefined,
        question: question.trim(),
      });
      setSubmitted(true);
      onSubmitted?.();
    } catch {
      toast.error("No se pudo enviar tu pregunta, intenta de nuevo");
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="bg-accent/50 rounded-2xl p-6 text-center">
        <p className="text-2xl mb-2">🙋</p>
        <p className="font-heading font-semibold text-foreground">¡Pregunta enviada!</p>
        <p className="text-sm text-muted-foreground mt-1">
          En cuanto {specialist?.full_name || "el especialista"} la responda, se va a ver aquí mismo.
        </p>
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
        <label className="text-sm font-medium text-foreground mb-1 block">Tu nombre (opcional)</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={'Se muestra junto a tu pregunta -- déjalo en blanco para aparecer como "Paciente"'}
          className="rounded-xl"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Tu pregunta *</label>
        <Textarea
          required
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ej. ¿Atiende los sábados? ¿Necesito estudios previos para la consulta?"
          className="rounded-xl min-h-[90px] resize-none"
          maxLength={500}
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full min-h-[44px] rounded-xl font-heading font-semibold">
        {loading ? "Enviando..." : "Enviar pregunta"}
      </Button>
      <p className="text-xs text-muted-foreground text-center">Tu pregunta se hace pública solo cuando el doctor la responde.</p>
    </form>
  );
}
