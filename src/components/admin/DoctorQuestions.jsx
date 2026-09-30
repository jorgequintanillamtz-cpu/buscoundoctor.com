import { useState, useEffect } from "react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { HelpCircle, Loader2, Pencil, Trash2, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

// Responder (o editar/borrar la respuesta) de una pregunta -- mismo patrón
// que ReplyBox de reseñas (DoctorReviews.jsx), pero aquí la pregunta
// pendiente ni siquiera es visible para nadie hasta que se conteste, así
// que no hace falta que ya esté "aprobada" para poder responderla.
function AnswerBox({ question, onSaved }) {
  const [editing, setEditing] = useState(!question.answer);
  const [text, setText] = useState(question.answer || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const value = text.trim();
    if (!value) { toast.error("Escribe una respuesta"); return; }
    setSaving(true);
    try {
      await base44.functions.invoke("answerSpecialistQuestion", { question_id: question.id, answer: value });
      onSaved(question.id, value);
      setEditing(false);
      toast.success("Respuesta publicada");
    } catch (e) {
      toast.error("No se pudo guardar: " + e.message);
    }
    setSaving(false);
  };

  const remove = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke("answerSpecialistQuestion", { question_id: question.id, answer: "" });
      onSaved(question.id, null);
      setText("");
      toast.success("Respuesta eliminada");
    } catch (e) {
      toast.error("No se pudo borrar: " + e.message);
    }
    setSaving(false);
  };

  if (!editing) {
    return (
      <div className="mt-2 ml-2 pl-3 border-l-2 border-brand-blue/30 bg-brand-bluePale/40 rounded-r-xl py-2 px-3">
        <p className="text-xs font-semibold text-brand-navy mb-0.5">Tu respuesta (pública)</p>
        <p className="text-sm text-foreground/80 leading-relaxed">{question.answer}</p>
        <div className="flex gap-3 mt-1.5">
          <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-brand-blue hover:underline flex items-center gap-1">
            <Pencil className="w-3 h-3" /> Editar
          </button>
          <button type="button" onClick={remove} disabled={saving} className="text-xs font-medium text-destructive hover:underline flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Borrar (vuelve a quedar oculta)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
        placeholder="Escribe tu respuesta. En cuanto la publiques, la pregunta se ve en tu perfil público."
        className="w-full text-sm border border-input rounded-xl p-3 min-h-[80px]"
      />
      <div className="flex gap-2">
        <Button size="sm" className="rounded-xl gap-1.5" disabled={saving || !text.trim()} onClick={save}>
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Publicar respuesta
        </Button>
        {question.answer && (
          <Button size="sm" variant="outline" className="rounded-xl" disabled={saving} onClick={() => { setEditing(false); setText(question.answer || ""); }}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}

function QuestionCard({ question, onSaved }) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 space-y-2">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-foreground">{question.patient_display_name || "Paciente"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(question.created_date)}</p>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
            question.answer ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {question.answer ? "Visible en tu perfil" : "Esperando tu respuesta"}
        </span>
      </div>
      <p className="text-sm text-foreground">{question.question}</p>
      <AnswerBox question={question} onSaved={onSaved} />
    </div>
  );
}

// "Dudas solucionadas": preguntas que cualquier visitante puede hacer desde
// el perfil público, sin necesidad de cuenta -- igual que una reseña. A
// diferencia de las reseñas, aquí no hay aprobación de por medio: una
// pregunta nunca se hace pública hasta que el propio doctor la responde,
// así que no le agrega trabajo al equipo de BuscoUnDoctor.
export default function DoctorQuestions({ specialistId }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!specialistId) return;
    base44.entities.SpecialistQuestion.filter({ specialist_id: specialistId }, "-created_date", 500)
      .then(setQuestions)
      .finally(() => setLoading(false));
  }, [specialistId]);

  const pending = questions.filter((q) => !q.answer);
  const answered = questions.filter((q) => q.answer);

  const handleSaved = (id, answer) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, answer } : q)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[30vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="bg-card border border-border/50 rounded-2xl p-8 text-center">
        <HelpCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
        <p className="text-sm font-medium text-foreground">Todavía no tienes preguntas de pacientes.</p>
        <p className="text-xs text-muted-foreground mt-1">Cuando alguien te pregunte algo desde tu perfil público, aparecerá aquí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {pending.length > 0 && (
        <div>
          <h2 className="text-sm font-heading font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <Reply className="w-4 h-4 text-amber-600" /> Esperando tu respuesta ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((q) => (
              <QuestionCard key={q.id} question={q} onSaved={handleSaved} />
            ))}
          </div>
        </div>
      )}
      {answered.length > 0 && (
        <div>
          <h2 className="text-sm font-heading font-semibold text-foreground mb-3">Ya respondidas ({answered.length})</h2>
          <div className="space-y-3">
            {answered.map((q) => (
              <QuestionCard key={q.id} question={q} onSaved={handleSaved} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
