import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { notifyDocumentApproved, notifyDocumentRejected } from "@/api/doctorNotify";

const DOC_TYPES = [
  { value: "cedula_profesional", label: "Cédula profesional", hint: "Tu cédula de médico general/cirujano", required: true },
  { value: "cedula_especialidad", label: "Cédula de especialidad", hint: "Solo si cuentas con una especialidad certificada", required: false },
  { value: "identificacion_oficial", label: "Identificación oficial (INE/pasaporte)", hint: "Para confirmar tu identidad", required: true },
];

const STATUS = {
  uploaded: { label: "Cargado", color: "text-blue-600 bg-blue-50" },
  under_review: { label: "En revisión", color: "text-amber-600 bg-amber-50" },
  approved: { label: "Aprobado", color: "text-emerald-600 bg-emerald-50" },
  rejected: { label: "Rechazado", color: "text-red-600 bg-red-50" },
};

function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function DocTypeCard({ type, doc, isAdmin, user, specialist, onUploaded, onReviewed }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const st = doc ? (STATUS[doc.upload_status] || STATUS.uploaded) : null;

  const handleUpload = async () => {
    if (!file) { toast.error("Selecciona un archivo primero"); return; }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.SpecialistDocument.create({
        specialist_id: doc?.specialist_id || onUploaded.specialistId,
        owner_user_id: specialist?.owner_user_id || null,
        document_type: type.value,
        file_url,
        upload_status: "uploaded",
      });
      toast.success(`${type.label} cargado`);
      setFile(null);
      onUploaded.reload();
    } catch (e) {
      toast.error("Error al cargar: " + e.message);
    }
    setUploading(false);
  };

  const setReview = async (status, reason) => {
    setReviewing(true);
    try {
      await base44.entities.SpecialistDocument.update(doc.id, {
        upload_status: status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        ...(status === "rejected" ? { rejection_reason: reason } : {}),
      });
      if (type.value === "cedula_profesional") {
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
      if (specialist) {
        status === "approved"
          ? notifyDocumentApproved(specialist, type.label)
          : notifyDocumentRejected(specialist, type.label, reason);
      }
      onUploaded.reload();
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
    <div className="border border-border/50 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            {type.label}
            {!type.required && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Opcional</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">{type.hint}</p>
        </div>
        {st && <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${st.color}`}>{st.label}</span>}
      </div>

      {doc && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
            <FileText className="w-3 h-3" /> Ver archivo cargado
          </a>
          <span className="text-muted-foreground">Subido el {fmtDate(doc.created_date)}</span>
        </div>
      )}
      {doc?.upload_status === "rejected" && doc.rejection_reason && (
        <p className="text-xs text-red-500">Motivo de rechazo: {doc.rejection_reason}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="text-xs flex-1 min-w-[160px] file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-accent file:text-accent-foreground file:text-xs"
        />
        <Button size="sm" onClick={handleUpload} disabled={uploading || !file} className="rounded-xl gap-1.5 h-8 flex-shrink-0">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {doc ? "Reemplazar" : "Subir"}
        </Button>
      </div>

      {isAdmin && doc && (
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
              <Button size="sm" variant="outline" className="rounded-xl gap-1.5" disabled={reviewing || doc.upload_status === "approved"} onClick={() => setReview("approved")}>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Aprobar
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl gap-1.5" disabled={reviewing || doc.upload_status === "rejected"} onClick={() => setRejecting(true)}>
                <XCircle className="w-3.5 h-3.5 text-red-500" />
                Rechazar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DocumentManager({ specialistId }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [specialist, setSpecialist] = useState(null);

  const isAdmin = user && (user.role === "admin" || user.role === "superadmin");

  const load = async () => {
    try {
      const list = await base44.entities.SpecialistDocument.filter({ specialist_id: specialistId });
      setDocs(list);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.entities.Specialist.get(specialistId).then(setSpecialist).catch(() => {});
    load();
  }, [specialistId]);

  // El documento más reciente de cada tipo (si un médico resube uno, mostramos el último)
  const latestByType = (typeValue) => {
    const matches = docs.filter((d) => d.document_type === typeValue);
    if (matches.length === 0) return null;
    return matches.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
      <h2 className="font-heading font-semibold text-lg text-foreground flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        Documentos de verificación
      </h2>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando documentos…</p>
      ) : (
        <div className="space-y-3">
          {DOC_TYPES.map((type) => (
            <DocTypeCard
              key={type.value}
              type={type}
              doc={latestByType(type.value)}
              isAdmin={isAdmin}
              user={user}
              specialist={specialist}
              onUploaded={{ specialistId, reload: load }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
