import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Check, Trash2, Star, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/api/activityLog";

function StarDisplay({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`w-3.5 h-3.5 ${rating >= s ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");

  const load = async () => {
    const all = await base44.entities.Review.list("-created_date");
    setReviews(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    const review = reviews.find((r) => r.id === id);
    await base44.entities.Review.update(id, { approved: true });
    toast.success("Reseña aprobada");
    logActivity({
      type: "resena_aprobada",
      description: `Se aprobó la reseña de ${review?.patient_name || "un paciente"} para ${review?.specialist_name || "un doctor"}`,
      specialistName: review?.specialist_name || "",
    });
    load();
  };

  const remove = async (id) => {
    if (!confirm("¿Eliminar esta reseña?")) return;
    const review = reviews.find((r) => r.id === id);
    await base44.entities.Review.delete(id);
    toast.success("Reseña eliminada");
    logActivity({
      type: "resena_eliminada",
      description: `Se eliminó la reseña de ${review?.patient_name || "un paciente"} para ${review?.specialist_name || "un doctor"}`,
      specialistName: review?.specialist_name || "",
    });
    load();
  };

  const pending = reviews.filter((r) => !r.approved);
  const approved = reviews.filter((r) => r.approved);
  const displayed = tab === "pending" ? pending : approved;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-bold text-2xl text-foreground">Reseñas</h1>
        {pending.length > 0 && (
          <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full">
            {pending.length} pendiente{pending.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("pending")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === "pending" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          Pendientes ({pending.length})
        </button>
        <button
          onClick={() => setTab("approved")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === "approved" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          Aprobadas ({approved.length})
        </button>
      </div>

      {displayed.length === 0 ? (
        <p className="text-muted-foreground text-sm">No hay reseñas en esta sección.</p>
      ) : (
        <div className="space-y-3">
          {displayed.map((r) => (
            <div key={r.id} className="bg-card rounded-2xl border border-border/50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-foreground">{r.patient_name}</span>
                    <span className="text-xs text-muted-foreground">→ {r.specialist_name}</span>
                  </div>
                  <StarDisplay rating={r.rating} />
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{r.comment}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!r.approved && (
                    <button
                      onClick={() => approve(r.id)}
                      aria-label="Aprobar reseña"
                      className="p-2 rounded-xl bg-green-50 hover:bg-green-100 transition-colors"
                      title="Aprobar"
                    >
                      <Check className="w-4 h-4 text-green-600" />
                    </button>
                  )}
                  <button
                    onClick={() => remove(r.id)}
                    aria-label="Eliminar reseña"
                    className="p-2 rounded-xl hover:bg-destructive/10 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}