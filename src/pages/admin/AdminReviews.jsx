import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Check, XCircle, RotateCcw, Star, Stethoscope, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { logActivity } from "@/api/activityLog";
import { usePaginatedList } from "@/api/usePaginatedList";
import Pagination from "@/components/admin/Pagination";

function StarDisplay({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`w-3.5 h-3.5 ${rating >= s ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

// A diferencia de antes, "rechazar" ya no borra la reseña: la marca como
// rechazada con un motivo obligatorio y queda en su propia pestaña, igual
// que el flujo de doctores/documentos/blog. Nada se elimina de forma
// permanente desde aquí.
export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [verifyChecks, setVerifyChecks] = useState({});

  const load = async () => {
    const [all, me] = await Promise.all([
      base44.entities.Review.list("-created_date"),
      base44.auth.me().catch(() => null),
    ]);
    setReviews(all);
    setUser(me);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    const review = reviews.find((r) => r.id === id);
    setSaving(true);
    try {
      await base44.entities.Review.update(id, {
        approved: true,
        rejected: false,
        rejection_reason: "",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id || "",
        verified_client: !!verifyChecks[id],
      });
      toast.success("Reseña aprobada");
      logActivity({
        type: "resena_aprobada",
        description: `Se aprobó la reseña de ${review?.patient_name || "un paciente"} para ${review?.specialist_name || "un doctor"}`,
        specialistName: review?.specialist_name || "",
      });
      load();
    } catch (e) {
      toast.error("No se pudo aprobar: " + e.message);
    }
    setSaving(false);
  };

  const openReject = (id) => {
    setRejectingId(id);
    setRejectReason("");
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) { toast.error("Debes ingresar un motivo de rechazo"); return; }
    const review = reviews.find((r) => r.id === rejectingId);
    setSaving(true);
    try {
      await base44.entities.Review.update(rejectingId, {
        approved: false,
        rejected: true,
        rejection_reason: rejectReason.trim(),
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id || "",
      });
      toast.success("Reseña rechazada");
      logActivity({
        type: "resena_rechazada",
        description: `Se rechazó la reseña de ${review?.patient_name || "un paciente"} para ${review?.specialist_name || "un doctor"}. Motivo: ${rejectReason.trim()}`,
        specialistName: review?.specialist_name || "",
      });
      setRejectingId(null);
      setRejectReason("");
      load();
    } catch (e) {
      toast.error("No se pudo rechazar: " + e.message);
    }
    setSaving(false);
  };

  const toggleVerified = async (r) => {
    setSaving(true);
    try {
      await base44.entities.Review.update(r.id, { verified_client: !r.verified_client });
      toast.success(r.verified_client ? "Se quitó el sello de verificado" : "Marcada como cliente verificado");
      load();
    } catch (e) {
      toast.error("No se pudo actualizar: " + e.message);
    }
    setSaving(false);
  };

  const pending = reviews.filter((r) => !r.approved && !r.rejected);
  const approved = reviews.filter((r) => r.approved && !r.rejected);
  const rejected = reviews.filter((r) => r.rejected);
  const displayed = tab === "pending" ? pending : tab === "approved" ? approved : rejected;
  const { pageItems: pagedDisplayed, page, setPage, totalPages } = usePaginatedList(displayed, {
    pageSize: 20,
    resetKey: tab,
  });

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
        <button
          onClick={() => setTab("rejected")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === "rejected" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          Rechazadas ({rejected.length})
        </button>
      </div>

      {displayed.length === 0 ? (
        <p className="text-muted-foreground text-sm">No hay reseñas en esta sección.</p>
      ) : (
        <div className="space-y-3">
          {pagedDisplayed.map((r) => (
            <div key={r.id} className="bg-card rounded-2xl border border-border/50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-foreground">{r.patient_name}</span>
                    <span className="text-xs text-muted-foreground">→ {r.specialist_name}</span>
                  </div>
                  <StarDisplay rating={r.rating} />
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{r.comment}</p>
                  {r.rejected && r.rejection_reason && (
                    <p className="text-xs text-red-600 mt-2">Motivo de rechazo: {r.rejection_reason}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!r.approved && !r.rejected && (
                    <button
                      onClick={() => approve(r.id)}
                      aria-label="Aprobar reseña"
                      className="p-2 rounded-xl bg-green-50 hover:bg-green-100 transition-colors"
                      title="Aprobar"
                    >
                      <Check className="w-4 h-4 text-green-600" />
                    </button>
                  )}
                  {!r.rejected && (
                    <button
                      onClick={() => openReject(r.id)}
                      aria-label="Rechazar reseña"
                      className="p-2 rounded-xl hover:bg-destructive/10 transition-colors"
                      title="Rechazar"
                    >
                      <XCircle className="w-4 h-4 text-destructive" />
                    </button>
                  )}
                  {r.rejected && (
                    <button
                      onClick={() => approve(r.id)}
                      aria-label="Aprobar de todas formas"
                      className="p-2 rounded-xl hover:bg-green-50 transition-colors"
                      title="Aprobar de todas formas"
                    >
                      <RotateCcw className="w-4 h-4 text-green-600" />
                    </button>
                  )}
                </div>
              </div>

              {rejectingId === r.id && (
                <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Motivo de rechazo (obligatorio)"
                    className="w-full text-sm border border-input rounded-xl p-2 min-h-[60px]"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" className="rounded-xl" disabled={saving} onClick={confirmReject}>
                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                      Confirmar rechazo
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { setRejectingId(null); setRejectReason(""); }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={displayed.length} pageSize={20} />
    </div>
  );
}
