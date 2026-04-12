import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Star } from "lucide-react";
import moment from "moment";

function StarDisplay({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`w-4 h-4 ${rating >= s ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

export default function ReviewList({ specialistId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Review.filter({ specialist_id: specialistId, approved: true }, "-created_date").then((r) => {
      setReviews(r);
      setLoading(false);
    });
  }, [specialistId]);

  if (loading) return null;
  if (reviews.length === 0) return (
    <p className="text-sm text-muted-foreground">Aún no hay reseñas aprobadas. ¡Sé el primero en dejar una!</p>
  );

  const avg = (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
        <span className="font-heading font-bold text-3xl text-foreground">{avg}</span>
        <div>
          <StarDisplay rating={Math.round(avg)} />
          <p className="text-xs text-muted-foreground mt-0.5">{reviews.length} reseña{reviews.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {reviews.map((r) => (
        <div key={r.id} className="pb-4 border-b border-border/30 last:border-0 last:pb-0">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-sm text-foreground">{r.patient_name}</span>
            <span className="text-xs text-muted-foreground">{moment(r.created_date).format("DD MMM YYYY")}</span>
          </div>
          <StarDisplay rating={r.rating} />
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{r.comment}</p>
        </div>
      ))}
    </div>
  );
}