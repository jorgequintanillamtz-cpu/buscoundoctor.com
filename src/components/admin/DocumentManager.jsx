import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileText, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const DOC_TYPES = [
  { value: "cedula_profesional", label: "Cédula profesional" },
  { value: "cedula_especialidad", label: "Cédula de especialidad" },
  { value: "certificado_especialidad", label: "Certificado del consejo de especialidad" },
  { value: "titulo", label: "Título profesional" },
  { value: "identificacion_oficial", label: "Identificación oficial (INE/pasaporte)" },
  { value: "foto_verificacion", label: "Foto reciente de verificación" },
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

export default function DocumentManager({ specialistId }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [docType, setDocType] = useState(DOC_TYPES[0].value);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reviewing, setReviewing] = useState(null);

  const isAdmin = user && (user.role === "admin" || user.role === "superadmin");

  const load = async () => {
    try {
      const list = await base44.entities.SpecialistDocument.filter({ specialist_id: specialistId });
      list.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      setDocs(list);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    load();
  }, [specialistId]);

  const handleUpload = async () => {
    if (!file) { toast.error("Selecciona un archivo"); return; }
    if (!docType) { toast.error("Selecciona un tipo de documento"); return; }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.SpecialistDocument.create({
        specialist_id: specialistId,
        document_type: docType,
        file_url,
        upload_status: "uploaded",
      });
      toast.success("Documento cargado");
      setFile(null);
      setDocType(DOC_TYPES[0].value);
      load();
    } catch (e) {
      toast.error("Error al cargar: " + e.message);
    }
    setUploading(false);
  };

  const setReview = async (doc, status, reason) => {
    setReviewing(doc.id);
    try {
      await base44.entities.SpecialistDocument.update(doc.id, {
        upload_status: status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        ...(status === "rejected" ? { rejection_reason: reason } : {}),
      });
      if (doc.document_type === "cedula_profesional") {
        if (status === "approved") {
          await base44.entities.Specialist.update(specialistId, {
            license_verification_status: "verified",
            license_verified_at: new Date().toISOString(),
            license_verified_by: user.id,
          });
        } else if (status === "rejected") {
          await base44.entities.Specialist.update(specialistId, {
            license_verification_status: "rejected",
          });
        }
      }
      toast.success(status === "approved" ? "Documento aprobado" : "Documento rechazado");
      load();
    } catch (e) {
      toast.error("Error: " + e.message);
    }
    setReviewing(null);
  };

  const confirmReject = async (doc) => {
    if (!rejectReason.trim()) { toast.error("El motivo de rechazo es obligatorio"); return; }
    await setReview(doc, "rejected", rejectReason.trim());
    setRejectingId(null);
    setRejectReason("");
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
      <h2 className="font-heading font-semibold text-lg text-foreground flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        Documentos de verificación
      </h2>

      <div className="border border-border/50 rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">Subir nuevo documento</p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo de documento</label>
            <select value={docType} onChange={e => setDocType(e.target.value)}
              className="w-full h-9 px-3 text-sm bg-background border border-input rounded-xl">
              {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Archivo</label>
            <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)}
              className="rounded-xl text-sm h-9" />
          </div>
          <Button onClick={handleUpload} disabled={uploading} className="rounded-xl gap-1.5 h-9">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Subir
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando documentos…</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no hay documentos cargados.</p>
      ) : (
        <div className="space-y-3">
          {docs.map(doc => {
            const type = DOC_TYPES.find(t => t.value === doc.document_type);
            const st = STATUS[doc.upload_status] || STATUS.uploaded;
            const isRejecting = rejectingId === doc.id;
            return (
              <div key={doc.id} className="border border-border/50 rounded-xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{type?.label || doc.document_type}</p>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                       className="text-xs text-primary hover:underline flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Ver archivo
                    </a>
                    <p className="text-xs text-muted-foreground mt-0.5">Subido el {fmtDate(doc.created_date)}</p>
                    {doc.upload_status === "rejected" && doc.rejection_reason && (
                      <p className="text-xs text-red-500 mt-1">Motivo: {doc.rejection_reason}</p>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.color}`}>{st.label}</span>
                </div>

                {isAdmin && (
                  <div className="pt-2 border-t border-border/40">
                    {isRejecting ? (
                      <div className="space-y-2">
                        <textarea
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder="Motivo de rechazo (obligatorio)"
                          className="w-full text-sm border border-input rounded-xl p-2 min-h-[60px]"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="destructive" className="rounded-xl"
                            disabled={reviewing === doc.id}
                            onClick={() => confirmReject(doc)}>
                            {reviewing === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            Confirmar rechazo
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-xl"
                            onClick={() => { setRejectingId(null); setRejectReason(""); }}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="rounded-xl gap-1.5"
                          disabled={reviewing === doc.id || doc.upload_status === "approved"}
                          onClick={() => setReview(doc, "approved")}>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Aprobar
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-xl gap-1.5"
                          disabled={reviewing === doc.id || doc.upload_status === "rejected"}
                          onClick={() => setRejectingId(doc.id)}>
                          <XCircle className="w-3.5 h-3.5 text-red-500" />
                          Rechazar
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}