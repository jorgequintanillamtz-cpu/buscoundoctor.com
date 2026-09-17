import { CheckCircle2, Circle, TrendingUp, ArrowRight } from "lucide-react";

// Los 5 criterios calculados por la función recalculateSpecialistScore
// (base44/functions/recalculateSpecialistScore/entry.ts). El orden y las
// claves deben coincidir exactamente con el checklist que devuelve esa
// función / con la entidad SpecialistSeoChecklist.
const CHECKLIST_ITEMS = [
  {
    key: "has_optimized_title",
    label: "Título optimizado",
    hint: "Tu nombre completo y tu especialidad principal están definidos — con eso Google arma el título de tu perfil en los resultados de búsqueda.",
    target: "perfil",
    cta: "Completar en Datos y biografía",
  },
  {
    key: "has_min_word_biography",
    label: "Biografía de al menos 50 palabras",
    hint: "Una biografía real y completa es lo que más le dice a Google (y a tus pacientes) que tu perfil es de confianza.",
    target: "perfil",
    cta: "Escribir biografía",
  },
  {
    key: "has_meta_description",
    label: "Descripción de tu perfil",
    hint: "Se usa como el resumen que aparece debajo de tu nombre en Google. Depende de que tu biografía no esté vacía.",
    target: "perfil",
    cta: "Completar en Datos y biografía",
  },
  {
    key: "has_specialty_zone_keywords",
    label: "Especialidad y zona configuradas",
    hint: "Con tu especialidad y al menos un consultorio con zona asignada, apareces en búsquedas como \"cardiólogo en San Pedro\".",
    target: "consultorios",
    cta: "Completar en Zona de cobertura",
  },
  {
    key: "has_alt_text_images",
    label: "Foto de perfil o galería",
    hint: "Sube tu foto de perfil (o fotos a tu galería) — los perfiles con imagen generan más confianza y más clics desde Google.",
    target: "perfil",
    cta: "Subir foto",
  },
];

function scoreColor(score) {
  if (score >= 80) return { text: "text-emerald-400", border: "border-emerald-400/40" };
  if (score >= 50) return { text: "text-amber-400", border: "border-amber-400/40" };
  return { text: "text-red-400", border: "border-red-400/40" };
}

export default function SeoScoreManager({ seoScore = 0, checklist, onNavigate }) {
  const colors = scoreColor(seoScore);
  const pendingCount = checklist ? CHECKLIST_ITEMS.filter((item) => !checklist[item.key]).length : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado con el score grande, mismo lenguaje visual que "Completitud" */}
      <div className="bg-brand-navy rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-brand-blue/20 rounded-full pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
          <div className={`flex items-center justify-center w-24 h-24 rounded-full bg-white/10 border-4 ${colors.border} flex-shrink-0`}>
            <span className={`font-heading font-extrabold text-3xl ${colors.text}`}>{seoScore}%</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <TrendingUp className="w-4 h-4 text-brand-bluePale" />
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-bluePale">Score de SEO</span>
            </div>
            <h2 className="font-heading font-bold text-xl text-white leading-snug">
              {seoScore >= 100
                ? "¡Tu perfil está listo para que Google lo encuentre!"
                : "Así de cerca estás de que Google encuentre tu perfil"}
            </h2>
            <p className="text-sm text-white/70 mt-1.5 max-w-lg">
              {pendingCount === null
                ? "Guarda un cambio en tu perfil para calcular tu score."
                : pendingCount === 0
                ? "Completaste los 5 puntos que evaluamos. Sigue así y consigue reseñas reales de tus pacientes."
                : `Te falta${pendingCount === 1 ? "" : "n"} ${pendingCount} de 5 ${pendingCount === 1 ? "punto" : "puntos"} para llegar al 100%.`}
            </p>
          </div>
        </div>
      </div>

      {/* Checklist: cada punto explica qué hace falta y a dónde ir a completarlo */}
      <div className="bg-card rounded-2xl border border-border/50 divide-y divide-border/50">
        {CHECKLIST_ITEMS.map((item) => {
          const done = !!checklist?.[item.key];
          return (
            <div key={item.key} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 p-5">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="flex-shrink-0 mt-0.5">
                  {done ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${done ? "text-foreground" : "text-foreground"}`}>{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.hint}</p>
                </div>
              </div>
              {!done && (
                <button
                  type="button"
                  onClick={() => onNavigate?.(item.target)}
                  className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-brand-blue hover:underline whitespace-nowrap ml-9 sm:ml-0 sm:mt-0.5"
                >
                  {item.cta}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground px-1">
        El score se recalcula automáticamente cada vez que guardas cambios en tu perfil.
      </p>
    </div>
  );
}
