import { CheckCircle2, Circle, ArrowRight, Sparkles } from "lucide-react";

// Los 9 puntos que forman el porcentaje "perfil completo". Las claves salen de
// la función recalculate_specialist_score (completeness_checklist). Van en
// orden de importancia para el paciente; los tres últimos ya se llenan en el
// registro, así que casi siempre aparecen como listos.
const ITEMS = [
  { key: "photo", label: "Tu foto de perfil", hint: "Los pacientes confían mucho más en un perfil con foto.", target: "perfil", cta: "Subir mi foto" },
  { key: "cedula_document", label: "Tu cédula profesional", hint: "Sube una foto de tu cédula. Con eso verificamos tu perfil y aparece el sello \"Verificado\".", target: "documentos", cta: "Subir mi cédula" },
  { key: "biography", label: "Tu presentación", hint: "Cuéntale a tus pacientes quién eres y cómo trabajas. Con unas 50 palabras es suficiente.", target: "perfil", cta: "Escribir mi presentación" },
  { key: "office", label: "Tu consultorio", hint: "La dirección donde atiendes, para que los pacientes te encuentren en el mapa.", target: "consultorios", cta: "Agregar mi consultorio" },
  { key: "education", label: "Tu formación", hint: "Dónde estudiaste y tus especialidades. Muestra que eres un profesional certificado.", target: "formacion", cta: "Agregar mi formación" },
  { key: "languages", label: "Los idiomas que hablas", hint: "Muchos pacientes buscan un médico que hable su idioma.", target: "idiomas", cta: "Agregar idiomas" },
  { key: "specialty", label: "Tu especialidad", hint: "La especialidad con la que apareces en el directorio.", target: "perfil", cta: "Revisar mi especialidad" },
  { key: "license_number", label: "Tu número de cédula", hint: "El número de tu cédula profesional.", target: "perfil", cta: "Revisar mi cédula" },
  { key: "name", label: "Tu nombre completo", hint: "Como quieres que te vean los pacientes.", target: "perfil", cta: "Revisar mi nombre" },
];

function barColor(score) {
  if (score >= 80) return { text: "text-emerald-400", border: "border-emerald-400/40" };
  if (score >= 50) return { text: "text-amber-400", border: "border-amber-400/40" };
  return { text: "text-red-400", border: "border-red-400/40" };
}

export default function ProfileChecklist({ score = 0, checklist, onNavigate }) {
  const colors = barColor(score);
  const pending = checklist ? ITEMS.filter((item) => !checklist[item.key]) : [];
  const done = checklist ? ITEMS.filter((item) => checklist[item.key]) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-brand-navy rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-brand-blue/20 rounded-full pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
          <div className={`flex items-center justify-center w-24 h-24 rounded-full bg-white/10 border-4 ${colors.border} flex-shrink-0`}>
            <span className={`font-heading font-extrabold text-3xl ${colors.text}`}>{score}%</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-brand-bluePale" />
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-bluePale">Llena tu perfil</span>
            </div>
            <h2 className="font-heading font-bold text-xl text-white leading-snug">
              {score >= 100 ? "¡Tu perfil está completo!" : "Un perfil completo genera más confianza y recibe más pacientes"}
            </h2>
            <p className="text-sm text-white/70 mt-1.5 max-w-lg">
              {!checklist
                ? "Estamos revisando tu perfil…"
                : pending.length === 0
                ? "Ya tienes todo lo importante. Cuando lleguen tus primeros pacientes, pídeles una reseña."
                : `Te ${pending.length === 1 ? "falta" : "faltan"} ${pending.length} ${pending.length === 1 ? "paso" : "pasos"} para llegar al 100%.`}
            </p>
          </div>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/50 divide-y divide-border/50">
          <p className="px-5 pt-4 pb-3 text-xs font-heading font-semibold uppercase tracking-wide text-muted-foreground">Lo que te falta</p>
          {pending.map((item) => (
            <div key={item.key} className="flex flex-col sm:flex-row sm:items-center gap-3 p-5">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <Circle className="w-5 h-5 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.hint}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate?.(item.target)}
                className="flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue/90 transition-colors ml-9 sm:ml-0 flex-shrink-0"
              >
                {item.cta}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/50 divide-y divide-border/50">
          <p className="px-5 pt-4 pb-3 text-xs font-heading font-semibold uppercase tracking-wide text-muted-foreground">Ya está listo</p>
          {done.map((item) => (
            <div key={item.key} className="flex items-center gap-4 px-5 py-3.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <p className="text-sm text-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground px-1">
        Tu perfil se guarda solo. El porcentaje se actualiza cada vez que haces un cambio.
      </p>
    </div>
  );
}
