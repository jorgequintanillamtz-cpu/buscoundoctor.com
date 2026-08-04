import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, FileText, CheckCircle2, XCircle, Loader2, ExternalLink, Stethoscope } from "lucide-react";
import { toast } from "sonner";

// Misma lista de tipos de documento que usa DocumentManager.jsx (el
// componente que vive dentro del editor de cada doctor), para que las
// etiquetas coincidan en los dos lugares.
const DOC_TYPE_LABELS = {
  cedula_profesional: "Cédula profesional",
  cedula_especialidad: "Cédula de especialidad",
  certificado_especialidad: "Certificado del consejo de especialidad",
  titulo: "Título profesional",
  identificacion_oficial: "Identificación oficial (INE/pasaporte)",
  foto_verificacion: "Foto reciente de verificación",
};

const STATUS_LABELS = {
  uploaded: { label: "Cargado", color: "text-blue-600 bg-blue-50" },
  under_review: { label: "En revisión", color: "text-amber-600 bg-amber-50" },
};

function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

// Tarjeta de un documento pendiente: mismo comportamiento de aprobar/rechazar
// que DocumentManager.jsx, pero aquí junta TODOS los doctores en una sola
// bandeja en vez de tener que entrar uno por uno a revisar.
function PendingDocCard({ doc, specialist, user, onReviewed }) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const st = STATUS_LABELS[doc.upload_status] || STATUS_LABELS.uploaded;
  const typeLabel = DOC_TYPE_LABELS[doc.document_type] || doc.document_type;

  const setReview = async (status, reason) => {
    setReviewing(true);
    try {
      await base44.entities.SpecialistDocument.update(doc.id, {
        upload_status: status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        ...(status === "rejected" ? { rejection_reason: reason } : {}),
      });
      // La cédula profesional es el único documento que además controla el
      // sello de "Verificado" visible en el perfil público del doctor.
      if (doc.document_type === "cedula_profesional") {
        if (status === "approved") {
          await base44.entities.Specialist.update(doc.specialist_id, {
            license_verification_status: "verified",
            license_verified_at: new Date().toISOString(),
            license_verified_by: user.id,
          });
        } else if (status === "rejected") {
          await base44.entities.Specialist.update(doc.specialist_id, { license_verification_status: "rejected" });
        }
      }
      toast.success(status === "approved" ? "Documento aprobado" : "Documento rechazado");
      onReviewed(doc.id);
    } catch (e) {
      toast.error("Error: " + e.message);
    }
    setReviewing(false);
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) { toast.error("El motivo de rechazo es obligatorio"); return; }
    await setReview("rejected", rejectReason.trim());
    setRejecting(false);
    setRejectReason("");
  };

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <Link
            to={specialist ? `/admin/doctores/editar/${specialist.id}` : "#"}
            className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
          >
            {specialist ? specialist.full_name : "Doctor no encontrado"}
          </Link>
          <p className="text-xs text-muted-foreground mt-0.5">
            {typeLabel} · Subido el {fmtDate(doc.created_date)}
          </p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${st.color}`}>{st.label}</span>
      </div>

      <a
        href={doc.file_url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline flex items-center gap-1.5 text-sm w-fit"
      >
        <FileText className="w-4 h-4" /> Ver archivo cargado <ExternalLink className="w-3 h-3" />
      </a>

      <div className="pt-2 border-t border-border/40">
        {rejecting ? (
          <div className="space-y-2">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo de rechazo (obligatorio)"
              className="w-full text-sm border border-input rounded-xl p-2 min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" className="rounded-xl" disabled={reviewing} onClick={confirmReject}>
                {reviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Confirmar rechazo
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { setRejecting(false); setRejectReason(""); }}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="rounded-xl gap-1.5" disabled={reviewing} onClick={() => setReview("approved")}>
              {reviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              Aprobar
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl gap-1.5" disabled={reviewing} onClick={() => setRejecting(true)}>
              <XCircle className="w-3.5 h-3.5 text-red-500" />
              Rechazar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminVerificaciones() {
  const [docs, setDocs] = useState([]);
  const [specialistsById, setSpecialistsById] = useState({});
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [allDocs, allSpecialists, me] = await Promise.all([
      base44.entities.SpecialistDocument.list("-created_date", 500),
      base44.entities.Specialist.list(),
      base44.auth.me().catch(() => null),
    ]);
    setDocs(allDocs.filter((d) => d.upload_status === "uploaded" || d.upload_status === "under_review"));
    setSpecialistsById(Object.fromEntries(allSpecialists.map((s) => [s.id, s])));
    setUser(me);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleReviewed = (docId) => {
    setDocs((prev) => prev.filter((d) => d.id !== docId));
  };

  // Cédula profesional primero: es el documento que más le importa al
  // negocio (controla el sello de "Verificado" en el perfil público).
  const sortedDocs = useMemo(
    () => [...docs].sort((a, b) => (a.document_type === "cedula_profesional" ? -1 : 1) - (b.document_type === "cedula_profesional" ? -1 : 1)),
    [docs]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <ShieldCheck className="w-6 h-6 text-primary" />
        <h1 className="font-heading font-bold text-2xl text-foreground">Verificaciones</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Documentos de todos los doctores esperando revisión, en un solo lugar en vez de entrar uno por uno.
      </p>

      {sortedDocs.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-2xl p-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">No hay documentos pendientes de revisión.</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {sortedDocs.map((doc) => (
            <PendingDocCard
              key={doc.id}
              doc={doc}
              specialist={specialistsById[doc.specialist_id]}
              user={user}
              onReviewed={handleReviewed}
            />
          ))}
        </div>
      )}
    </div>
  );
}
