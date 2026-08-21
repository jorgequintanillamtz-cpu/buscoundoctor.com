import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Star, ShieldCheck } from "lucide-react";
import moment from "moment";
import ReviewForm from "../ReviewForm";

function StarDisplay({ rating, size = "w-4 h-4" }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`${size} ${rating >= s ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

// Sección de opiniones estilo Airbnb: promedio + distribución por estrellas +
// comentarios + un filtro de orden real (recientes / mejor calificadas). El
// sello "Cliente verificado" (verified_client) lo activa un admin manualmente
// al aprobar, tras cotejar la fecha/tratamiento que reporta el paciente.
export default function ReviewsSection({ specialistId, specialist }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("recientes");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let active = true;
    base44.entities.Review.filter({ specialist_id: specialistId, approved: true }, "-created_date")
      .then((r) => { if (active) { setReviews(r); setLoading(false); } })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [specialistId]);

  const avg = reviews.length > 0 ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : null;

  const distribution = useMemo(() => (
    [5, 4, 3, 2, 1].map((star) => {
      const count = reviews.filter((r) => Math.round(r.rating) === star).length;
      const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
      return { star, count, pct };
    })
  ), [reviews]);

  const sortedReviews = useMemo(() => {
    const copy = [...reviews];
    if (sortBy === "mejor") return copy.sort((a, b) => b.rating - a.rating);
    return copy.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }, [reviews, sortBy]);

  if (loading) return null;

  return (
    <div id="opiniones" className="mt-6 bg-card rounded-3xl border border-border/50 p-7 sm:p-9 scroll-mt-32">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h2 className="font-heading font-bold text-xl text-foreground">Opiniones de pacientes</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm font-medium text-primary border border-primary/30 bg-accent hover:bg-primary/10 px-4 py-1.5 rounded-full transition-colors"
          >
            ✏️ Escribir opinión
          </button>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no hay opiniones aprobadas para este especialista. ¡Sé el primero en dejar una!</p>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-6 mb-6 border-b border-border/50">
            <div className="text-center flex-shrink-0">
              <p className="font-heading font-extrabold text-5xl text-foreground">{avg.toFixed(1)}</p>
              <div className="flex justify-center mt-1"><StarDisplay rating={Math.round(avg)} /></div>
              <p className="text-xs text-muted-foreground mt-1">{reviews.length} opinión{reviews.length !== 1 ? "es" : ""} verificada{reviews.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex-1 space-y-1.5 min-w-[200px]">
              {distribution.map(({ star, pct }) => (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-0.5 w-10 flex-shrink-0 text-muted-foreground">
                    {star} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  </span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-brand-blue rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-9 text-right text-muted-foreground flex-shrink-0">{pct}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">Ordenar por:</span>
            {[{ key: "recientes", label: "Más recientes" }, { key: "mejor", label: "Mejor calificadas" }].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                  sortBy === opt.key ? "bg-brand-navy text-white" : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {sortedReviews.map((r) => (
              <div key={r.id} className="pb-6 border-b border-border/30 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-base text-foreground">{r.patient_name}</span>
                    {r.verified_client && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3" /> Cliente verificado
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{moment(r.created_date).format("DD MMM YYYY")}</span>
                </div>
                <StarDisplay rating={r.rating} size="w-4 h-4" />
                <p className="text-base text-foreground/80 mt-2.5 leading-relaxed">{r.comment}</p>
                {r.verified_client && r.treatment_performed && (
                  <p className="text-xs text-muted-foreground mt-2">Consulta: {r.treatment_performed}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {showForm && (
        <div className="mt-6 pt-6 border-t border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-base text-foreground">Dejar una opinión</h3>
            <button onClick={() => setShowForm(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
          </div>
          <ReviewForm specialist={specialist} />
        </div>
      )}
    </div>
  );
}
