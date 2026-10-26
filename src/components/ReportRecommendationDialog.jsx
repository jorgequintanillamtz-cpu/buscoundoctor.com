import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formErrorMessage } from "@/lib/formErrors";

// Motivos de un reporte (deben coincidir con `submit_recommendation_report` en la base de datos).
export const REPORT_REASONS = [
  { v: "falsa", label: "Información falsa o inexacta" },
  { v: "ofensiva", label: "Ofensivo o inapropiado" },
  { v: "datos_personales", label: "Datos personales o de salud" },
  { v: "soy_el_doctor", label: "Soy el doctor y quiero corregirlo o retirarlo" },
  { v: "spam", label: "Spam o publicidad" },
  { v: "otro", label: "Otro motivo" },
];

// Ventana para reportar una recomendación o su comentario (`commentId` = id de la recomendación; `kind` = "recommendation" o "comment") o la página de recomendaciones de un doctor (sin `commentId`).
// Cualquier persona puede reportar, sin cuenta (CLAUDE.md §8r). Lo revisa el equipo en /admin/recomendaciones.
export default function ReportRecommendationDialog({ open, onOpenChange, slug, commentId = null, kind = null, what = "comentario" }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const close = (o) => {
    onOpenChange(o);
    if (!o) setTimeout(() => { setReason(""); setDetails(""); setEmail(""); setError(""); setDone(false); }, 200);
  };

  const submit = async () => {
    if (!reason) { setError("Elige el motivo del reporte."); return; }
    setBusy(true); setError("");
    try {
      await base44.functions.invoke("submitRecommendationReport", { slug, comment_id: commentId, kind, reason, details: details.trim() || null, email: email.trim() || null });
      setDone(true);
    } catch (e) {
      setError(formErrorMessage(e, "No pudimos enviar el reporte. Intenta de nuevo en un momento."));
    }
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md rounded-2xl">
        {done ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" aria-hidden="true" />
            <DialogTitle className="font-heading">Gracias por avisarnos</DialogTitle>
            <DialogDescription className="mt-2">Nuestro equipo revisará el reporte. Si es necesario, retiraremos el contenido.</DialogDescription>
            <Button onClick={() => close(false)} className="mt-5 rounded-xl min-h-[44px] px-8">Cerrar</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading">Reportar {what}</DialogTitle>
              <DialogDescription>Cuéntanos qué pasa. Lo revisa nuestro equipo; no se te pide cuenta.</DialogDescription>
            </DialogHeader>
            <fieldset className="space-y-1.5">
              <legend className="sr-only">Motivo</legend>
              {REPORT_REASONS.map((r) => (
                <label key={r.v} className={`flex items-center gap-3 rounded-xl border px-3.5 min-h-[44px] cursor-pointer text-sm transition-colors ${reason === r.v ? "border-brand-augusta bg-brand-augustaLight text-brand-augustaDark font-medium" : "border-border hover:border-brand-augusta/50"}`}>
                  <input type="radio" name="report-reason" value={r.v} checked={reason === r.v} onChange={() => { setReason(r.v); setError(""); }} className="accent-[#006747]" />
                  {r.label}
                </label>
              ))}
            </fieldset>
            <div>
              <Textarea value={details} onChange={(e) => setDetails(e.target.value.slice(0, 300))} rows={3} placeholder="Detalles (opcional)" className="rounded-xl resize-none" />
              <p className="text-xs text-muted-foreground mt-1 text-right">{details.length}/300</p>
            </div>
            <div>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Tu correo (opcional)" className="h-11 rounded-xl" autoComplete="email" />
              <p className="text-xs text-muted-foreground mt-1">Solo para responderte; no se publica. Si eres el doctor, también puedes escribirnos desde Contacto.</p>
            </div>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <Button onClick={submit} disabled={busy} className="rounded-xl min-h-[44px] bg-brand-augusta hover:bg-brand-augusta/90 text-white">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar reporte"}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
