import { Heart, Lock, Quote } from "lucide-react";
import { recommendationTagLabel } from "@/lib/recommendationTags";

function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

// "Recomendaciones" (CLAUDE.md §8r, paso 5): pacientes que recomendaron al doctor en
// buscoundoctor.com/recomendaciones. Solo llegan las que el equipo ya aprobó, con sus etiquetas y el
// mensaje privado; nunca el correo ni ningún dato de quien recomendó (la base ni siquiera lo entrega).
export default function DoctorRecommendations({ data }) {
  const items = data?.items || [];
  const count = data?.count || 0;

  if (count === 0) {
    return (
      <div className="bg-card border border-border/50 rounded-2xl p-8 text-center">
        <Heart className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
        <p className="text-sm font-medium text-foreground">Todavía no tienes recomendaciones de pacientes.</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Cuando un paciente te recomiende y nuestro equipo la revise, aparecerá aquí con lo que más valoró de ti.
        </p>
      </div>
    );
  }

  const tagCounts = {};
  items.forEach((r) => (r.tags || []).forEach((t) => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
  const withMessage = items.filter((r) => r.message);

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="rounded-2xl bg-brand-bluePale p-5">
        <p className="flex items-center gap-2 font-heading font-bold text-lg text-brand-navy">
          <Heart className="w-5 h-5 text-red-500 fill-red-500" aria-hidden="true" />
          {count === 1 ? "1 paciente te recomienda" : `${count} pacientes te recomiendan`}
        </p>
        {topTags.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground mt-3 mb-2">Lo que más valoran de ti</p>
            <div className="flex flex-wrap gap-2">
              {topTags.map(([t, n]) => (
                <span key={t} className="text-sm bg-white text-brand-navy px-3 py-1 rounded-full border border-border/60">
                  {recommendationTagLabel(t)} · {n}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <div>
        <h2 className="text-sm font-heading font-semibold text-foreground mb-1 flex items-center gap-1.5">
          <Lock className="w-4 h-4 text-muted-foreground" /> Mensajes privados ({withMessage.length})
        </h2>
        <p className="text-xs text-muted-foreground mb-3">Solo tú los ves. No se publican ni se comparten.</p>
        {withMessage.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ningún paciente dejó un mensaje por ahora.</p>
        ) : (
          <div className="space-y-3">
            {withMessage.map((r) => (
              <div key={r.id} className="bg-card border border-border/50 rounded-2xl p-4">
                <p className="text-sm text-foreground flex gap-2"><Quote className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" /><span className="whitespace-pre-line">{r.message}</span></p>
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  {(r.tags || []).map((t) => (
                    <span key={t} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{recommendationTagLabel(t)}</span>
                  ))}
                  <span className="text-xs text-muted-foreground ml-auto">{fmtDate(r.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Por privacidad de los pacientes, no mostramos quién hizo cada recomendación. Y no son reseñas ni calificaciones: no llevan estrellas ni texto público.
      </p>
    </div>
  );
}
