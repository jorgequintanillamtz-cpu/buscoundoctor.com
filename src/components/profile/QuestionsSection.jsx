import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { HelpCircle } from "lucide-react";
import moment from "moment";
import QuestionForm from "../QuestionForm";

// "Dudas solucionadas": preguntas reales de pacientes ya respondidas por el
// doctor. El filtro por specialist_id ya trae solo las respondidas para un
// visitante sin sesión -- la policy de RLS (specialist_question_select)
// nunca deja ver una pendiente a nadie que no sea el dueño o un admin, así
// que no hace falta repetir `answer is not null` aquí.
export default function QuestionsSection({ specialistId, specialist }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let active = true;
    base44.entities.SpecialistQuestion.filter({ specialist_id: specialistId }, "-answered_at")
      .then((q) => { if (active) { setQuestions(q); setLoading(false); } })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [specialistId]);

  if (loading) return null;

  // Sin preguntas (y sin el formulario abierto): una franja delgada en vez de una tarjeta entera
  // vacía. En cuanto haya una pregunta respondida, o se abra el formulario, sale la tarjeta completa.
  if (questions.length === 0 && !showForm) {
    return (
      <div id="dudas" className="mt-6 bg-card rounded-2xl border border-border/50 px-5 py-4 flex items-center justify-between gap-3 flex-wrap scroll-mt-32">
        <p className="text-sm text-muted-foreground">
          <span className="font-heading font-semibold text-foreground">Dudas solucionadas</span>
          {" · "}Aún no hay preguntas respondidas por este especialista.
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="text-sm font-medium text-primary border border-primary/30 bg-accent hover:bg-primary/10 px-4 py-1.5 rounded-full transition-colors"
        >
          🙋 Hacer una pregunta
        </button>
      </div>
    );
  }

  return (
    <div id="dudas" className="mt-6 bg-card rounded-3xl border border-border/50 p-7 sm:p-9 scroll-mt-32">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h2 className="font-heading font-bold text-xl text-foreground">Dudas solucionadas</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm font-medium text-primary border border-primary/30 bg-accent hover:bg-primary/10 px-4 py-1.5 rounded-full transition-colors"
          >
            🙋 Hacer una pregunta
          </button>
        )}
      </div>

      {questions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no hay preguntas respondidas por este especialista. ¡Sé el primero en preguntar!</p>
      ) : (
        <div className="space-y-6">
          {questions.map((q) => (
            <div key={q.id} className="pb-6 border-b border-border/30 last:border-0 last:pb-0">
              <div className="flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-base text-foreground">{q.question}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {q.patient_display_name || "Paciente"} · {moment(q.answered_at).format("DD MMM YYYY")}
                  </p>
                </div>
              </div>
              <div className="mt-3 ml-6 pl-4 border-l-2 border-brand-blue/30 bg-brand-bluePale/40 rounded-r-xl py-2.5 px-3.5">
                <p className="text-xs font-semibold text-brand-navy">Respuesta de {specialist?.full_name || "el especialista"}</p>
                <p className="text-sm text-foreground/80 mt-1 leading-relaxed">{q.answer}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="mt-6 pt-6 border-t border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-base text-foreground">Hacer una pregunta</h3>
            <button onClick={() => setShowForm(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
          </div>
          <QuestionForm specialist={specialist} onSubmitted={() => {}} />
        </div>
      )}
    </div>
  );
}
