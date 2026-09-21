import { CheckCircle2, Circle, ArrowRight, Sparkles } from "lucide-react";
import { PROFILE_CHECKLIST_ITEMS as ITEMS } from "@/lib/profileChecklistItems";

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
