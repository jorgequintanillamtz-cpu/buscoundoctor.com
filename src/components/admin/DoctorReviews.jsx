import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Star, MessageSquareText, Stethoscope, ShieldCheck, Reply, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePaginatedList } from "@/api/usePaginatedList";
import Pagination from "@/components/admin/Pagination";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function StarRow({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`w-3.5 h-3.5 ${n <= (rating || 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

// Responder una reseña (solo tiene sentido si ya está visible en el
// perfil -- una pendiente todavía no la ve nadie). La respuesta se guarda
// con reply_to_review, que solo toca doctor_reply/doctor_reply_at -- nunca
// el rating, el comentario ni el estado de aprobación de la reseña.
function ReplyBox({ review, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(review.doctor_reply || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const value = text.trim();
    setSaving(true);
    try {
      await base44.functions.invoke("replyToReview", { review_id: review.id, reply: value });
      onSaved(review.id, value || null);
      setEditing(false);
      toast.success(value ? "Respuesta publicada" : "Respuesta eliminada");
    } catch (e) {
      toast.error("No se pudo guardar: " + e.message);
    }
    setSaving(false);
  };

  const remove = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke("replyToReview", { review_id: review.id, reply: "" });
      onSaved(review.id, null);
      setText("");
      toast.success("Respuesta eliminada");
    } catch (e) {
      toast.error("No se pudo borrar: " + e.message);
    }
    setSaving(false);
  };

  if (!editing) {
    if (review.doctor_reply) {
      return (
        <div className="mt-2 ml-2 pl-3 border-l-2 border-brand-blue/30 bg-brand-bluePale/40 rounded-r-xl py-2 px-3">
          <p className="text-xs font-semibold text-brand-navy mb-0.5">Tu respuesta (pública)</p>
          <p className="text-sm text-foreground/80 leading-relaxed">{review.doctor_reply}</p>
          <div className="flex gap-3 mt-1.5">
            <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-brand-blue hover:underline flex items-center gap-1">
              <Pencil className="w-3 h-3" /> Editar
            </button>
            <button type="button" onClick={remove} disabled={saving} className="text-xs font-medium text-destructive hover:underline flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Borrar
            </button>
          </div>
        </div>
      );
    }
    return (
      <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-brand-blue hover:underline flex items-center gap-1 mt-1">
        <Reply className="w-3.5 h-3.5" /> Responder
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
        placeholder="Escribe tu respuesta. Se verá públicamente debajo de esta reseña en tu perfil."
        className="w-full text-sm border border-input rounded-xl p-3 min-h-[80px]"
      />
      <div className="flex gap-2">
        <Button size="sm" className="rounded-xl gap-1.5" disabled={saving || !text.trim()} onClick={save}>
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Publicar respuesta
        </Button>
        <Button size="sm" variant="outline" className="rounded-xl" disabled={saving} onClick={() => { setEditing(false); setText(review.doctor_reply || ""); }}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function ReviewCard({ review, onReplySaved }) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 space-y-2">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{review.patient_name || "Paciente"}</p>
            {review.verified_client && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" /> Cliente verificado
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <StarRow rating={review.rating} />
            <span className="text-xs text-muted-foreground">{fmtDate(review.created_date)}</span>
          </div>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
            review.approved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {review.approved ? "Visible en tu perfil" : "Pendiente de aprobación"}
        </span>
      </div>
      {review.comment && <p className="text-sm text-foreground">{review.comment}</p>}
      {review.approved && !review.rejected && (
        <ReplyBox review={review} onSaved={(id, reply) => onReplySaved(id, reply)} />
      )}
    </div>
  );
}

const STAT_TONES = { navy: "bg-brand-navy", blue: "bg-brand-blue" };
function StatCard({ label, value, tone = "navy" }) {
  return (
    <div className={`rounded-xl p-3.5 ${STAT_TONES[tone]}`}>
      <p className="text-sm font-semibold text-white/90 mb-1">{label}</p>
      <p className="font-heading font-extrabold text-3xl text-white leading-tight">{value}</p>
    </div>
  );
}

// Reseñas del propio doctor: antes solo se podían ver en su perfil público
// (y solo las ya aprobadas). Aquí ve todas — aprobadas y pendientes — junto
// con su promedio y la distribución por estrellas, sin salir del panel.
export default function DoctorReviews({ specialistId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!specialistId) return;
    base44.entities.Review.filter({ specialist_id: specialistId }, "-created_date", 500)
      .then(setReviews)
      .finally(() => setLoading(false));
  }, [specialistId]);

  const approvedReviews = useMemo(() => reviews.filter((r) => r.approved && !r.rejected), [reviews]);
  const pendingReviews = useMemo(() => reviews.filter((r) => !r.approved && !r.rejected), [reviews]);

  const average = useMemo(() => {
    if (approvedReviews.length === 0) return 0;
    return approvedReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / approvedReviews.length;
  }, [approvedReviews]);

  const distribution = useMemo(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    approvedReviews.forEach((r) => { if (dist[r.rating] !== undefined) dist[r.rating]++; });
    return dist;
  }, [approvedReviews]);

  const { pageItems: pagedReviews, page, setPage, totalPages } = usePaginatedList(reviews, { pageSize: 20 });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" fill="currentColor" />
          Reseñas
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
          Lo que tus pacientes opinan de ti. Las aprobadas son las que se ven en tu perfil público; las pendientes
          las está revisando nuestro equipo antes de publicarlas.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5 max-w-md">
        <StatCard label="Promedio" value={approvedReviews.length ? average.toFixed(1) : "—"} tone="navy" />
        <StatCard label="Visibles" value={approvedReviews.length} tone="blue" />
        <StatCard label="Pendientes" value={pendingReviews.length} tone="navy" />
      </div>

      {approvedReviews.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/50 p-5">
          <h2 className="font-heading font-semibold text-sm text-foreground mb-4">Distribución de calificaciones</h2>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((n) => {
              const count = distribution[n];
              const pct = approvedReviews.length ? Math.round((count / approvedReviews.length) * 100) : 0;
              return (
                <div key={n} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-10 flex-shrink-0">{n} ★</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-6 text-right flex-shrink-0">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-2xl p-8 text-center">
          <MessageSquareText className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium text-foreground">Todavía no tienes reseñas de pacientes.</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {pagedReviews.map((r) => (
            <ReviewCard
              key={r.id}
              review={r}
              onReplySaved={(id, reply) => setReviews((prev) => prev.map((x) => (x.id === id ? { ...x, doctor_reply: reply } : x)))}
            />
          ))}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={reviews.length} pageSize={20} />
    </div>
  );
}
