import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, CheckCircle2 } from "lucide-react";
import StarRating from "./StarRating";

/**
 * Bloque de reseña pública para la página de resumen de consulta.
 *
 * - Si ya existe una reseña para este resumen → la muestra (gracias + estrellas).
 * - Si no existe → muestra estrellas interactivas para calificar.
 * - Al calificar → llama a createConsultReview (una reseña por resumen).
 * - Sin login: el read es público (ConsultReview sin RLS read), el create
 *   va vía función backend con asServiceRole.
 */
export default function PublicReviewBlock({ consultSummaryId }) {
  const [existingReview, setExistingReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const reviews = await base44.entities.ConsultReview.filter({
          consult_summary_id: consultSummaryId,
        });
        if (!cancelled) {
          setExistingReview(reviews && reviews[0] ? reviews[0] : null);
        }
      } catch {
        // Si falla, asumimos que no hay reseña
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [consultSummaryId]);

  const handleSubmit = async (rating) => {
    if (submitting || existingReview) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await base44.functions.invoke("createConsultReview", {
        consult_summary_id: consultSummaryId,
        rating,
      });
      const data = res?.data || res;
      if (data?.already_reviewed && data?.review) {
        setExistingReview(data.review);
      } else if (data?.review) {
        setExistingReview(data.review);
      } else if (data?.error) {
        setError(data.error);
      }
    } catch (e) {
      // Re-verificar si ya existe una reseña (puede haber una carrera)
      try {
        const reviews = await base44.entities.ConsultReview.filter({
          consult_summary_id: consultSummaryId,
        });
        if (reviews && reviews[0]) {
          setExistingReview(reviews[0]);
        } else {
          setError(e.message || "No se pudo enviar tu calificación");
        }
      } catch {
        setError(e.message || "No se pudo enviar tu calificación");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-white/50" />
      </div>
    );
  }

  if (existingReview) {
    return (
      <div className="text-center py-2">
        <CheckCircle2 className="w-6 h-6 mx-auto mb-2" style={{ color: "#F8F7F0" }} />
        <p className="text-white/80 text-sm font-medium mb-2">¡Gracias por tu calificación!</p>
        <div className="flex justify-center">
          <StarRating value={existingReview.rating || 0} readOnly size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-2">
      <p className="text-white/80 text-sm font-medium mb-3">¿Cómo calificarías tu consulta?</p>
      {submitting ? (
        <div className="flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-white/50" />
        </div>
      ) : (
        <div className="flex justify-center">
          <StarRating onChange={handleSubmit} size={32} />
        </div>
      )}
      {error && <p className="text-red-300 text-xs mt-2">{error}</p>}
    </div>
  );
}