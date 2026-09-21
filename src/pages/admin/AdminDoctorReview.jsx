import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Circle, Loader2, ExternalLink, Pencil, MapPin, Phone, Mail, BadgeCheck, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { approveDoctor, rejectDoctor } from "@/api/doctorReview";
import { useAdminBadges } from "@/components/adminBadges";
import DocumentManager from "@/components/admin/DocumentManager";
import { Button } from "@/components/ui/button";

// Nombres cortos para el administrador de los 9 puntos de "perfil completo".
const CHECK_LABELS = [
  ["name", "Nombre completo"],
  ["specialty", "Especialidad"],
  ["license_number", "Número de cédula"],
  ["photo", "Foto de perfil"],
  ["biography", "Presentación (50+ palabras)"],
  ["office", "Consultorio"],
  ["education", "Formación"],
  ["languages", "Idiomas"],
  ["cedula_document", "Documento de la cédula"],
];

const STATUS = {
  draft: { label: "Borrador", cls: "bg-muted text-muted-foreground" },
  pending_review: { label: "En revisión", cls: "bg-amber-100 text-amber-700" },
  published: { label: "Publicado", cls: "bg-green-100 text-green-700" },
  suspended: { label: "En pausa", cls: "bg-amber-100 text-amber-700" },
  rejected: { label: "Con cambios pendientes", cls: "bg-red-100 text-red-700" },
};

// Todo lo necesario para decidir sobre un doctor en una sola pantalla: su
// resumen, lo que le falta, sus documentos (con aprobar/rechazar) y los botones
// de decisión. Antes había que ir a Bandeja, Verificaciones y al editor.
export default function AdminDoctorReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refresh: refreshBadges } = useAdminBadges();
  const [doc, setDoc] = useState(null);
  const [offices, setOffices] = useState([]);
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");

  const load = async () => {
    const [specialist, offs] = await Promise.all([
      base44.entities.Specialist.get(id).catch(() => null),
      base44.entities.Office.filter({ specialist_id: id }).catch(() => []),
    ]);
    setDoc(specialist);
    setOffices(offs || []);
    try {
      const res = await base44.functions.invoke("recalculateSpecialistScore", { specialist_id: id });
      const data = res.data || res;
      setChecklist(data.completeness_checklist || null);
      // El porcentaje guardado en la fila puede estar viejo: se muestra el recién calculado.
      if (typeof data.completeness_score === "number") setDoc((prev) => (prev ? { ...prev, completeness_score: data.completeness_score } : prev));
    } catch {
      setChecklist(null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!doc) {
    return (
      <div className="max-w-3xl">
        <p className="text-sm text-muted-foreground">No encontramos a este doctor.</p>
        <Link to="/admin/doctores" className="text-sm text-brand-blue hover:underline">Volver a Doctores</Link>
      </div>
    );
  }

  const status = STATUS[doc.publication_status] || STATUS.pending_review;
  const visible = doc.publication_status === "published" && doc.active === true;
  const verified = doc.license_verification_status === "verified";

  const approve = async () => {
    setBusy(true);
    try {
      await approveDoctor(doc);
      toast.success(`Perfil de ${doc.full_name} aprobado y publicado`);
      refreshBadges();
      navigate("/admin/bandeja");
    } catch (e) {
      toast.error("No se pudo aprobar: " + e.message);
      setBusy(false);
    }
  };

  const askForChanges = async () => {
    if (!reason.trim()) { toast.error("Escribe qué debe corregir el doctor"); return; }
    setBusy(true);
    try {
      await rejectDoctor(doc, reason.trim());
      toast.success("Le enviamos al doctor lo que debe corregir");
      refreshBadges();
      navigate("/admin/bandeja");
    } catch (e) {
      toast.error("No se pudo enviar: " + e.message);
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-5 pb-10">
      <Link to="/admin/bandeja" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Volver a la bandeja
      </Link>

      {/* Resumen */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
        <div className="flex items-start gap-4">
          {doc.profile_photo ? (
            <img src={doc.profile_photo} alt={doc.full_name} className="w-20 h-20 rounded-2xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center text-xl font-bold text-muted-foreground flex-shrink-0">
              {(doc.full_name || "D").replace(/^(dr\.?|dra\.?)\s+/i, "")[0]}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading font-bold text-xl text-foreground">{doc.full_name}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.cls}`}>{status.label}</span>
              {verified && <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-blue-50 text-blue-700"><BadgeCheck className="w-3.5 h-3.5" /> Cédula verificada</span>}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{doc.specialty || "Sin especialidad"}{doc.zone ? ` · ${doc.zone}` : ""}</p>
            <div className="mt-2 space-y-1 text-sm text-foreground/80">
              {doc.whatsapp && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-muted-foreground" /> {doc.whatsapp}</p>}
              {doc.email && <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-muted-foreground" /> {doc.email}</p>}
              <p className="text-xs text-muted-foreground">Cédula: {doc.professional_license_number || "no capturada"}</p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-heading font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Presentación</p>
          {doc.description ? (
            <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">{doc.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Todavía no escribió su presentación.</p>
          )}
        </div>

        <div>
          <p className="text-xs font-heading font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Consultorios</p>
          {offices.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin consultorio registrado.</p>
          ) : (
            <ul className="space-y-1">
              {offices.map((o) => (
                <li key={o.id} className="flex items-start gap-2 text-sm text-foreground/90">
                  <MapPin className="w-3.5 h-3.5 mt-1 text-muted-foreground flex-shrink-0" />
                  <span>{o.name ? `${o.name} — ` : ""}{o.address_line}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Qué tiene y qué falta */}
      <div className="bg-card rounded-2xl border border-border/50 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-heading font-semibold uppercase tracking-wide text-muted-foreground">Qué tiene y qué le falta</p>
          <span className="text-sm font-semibold text-foreground">{doc.completeness_score || 0}% completo</span>
        </div>
        {checklist ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {CHECK_LABELS.map(([key, label]) => (
              <li key={key} className="flex items-center gap-2 text-sm">
                {checklist[key] ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-muted-foreground/40" />}
                <span className={checklist[key] ? "text-foreground" : "text-muted-foreground"}>{label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No se pudo calcular ahora.</p>
        )}
      </div>

      {/* Documentos: aprobar o rechazar aquí mismo */}
      <DocumentManager specialistId={id} />

      {/* Decisión */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
        {visible ? (
          <p className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4" /> Este perfil ya está publicado y visible en el directorio.
          </p>
        ) : (
          <>
            {!verified && (
              <p className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2.5">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                La cédula todavía no está verificada. Puedes aprobar el perfil igual; no tendrá el sello de verificado hasta que apruebes su cédula arriba.
              </p>
            )}
            {asking ? (
              <div className="space-y-2">
                <label className="text-sm font-medium block">Qué debe corregir el doctor (le llega por correo)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej: La foto de la cédula está borrosa, súbela de nuevo"
                  className="w-full text-sm border border-input rounded-xl p-3 min-h-[80px]"
                />
                <div className="flex gap-2 flex-wrap">
                  <Button variant="destructive" className="rounded-xl gap-1.5 min-h-[44px]" disabled={busy} onClick={askForChanges}>
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                    Enviar al doctor
                  </Button>
                  <Button variant="outline" className="rounded-xl min-h-[44px]" onClick={() => { setAsking(false); setReason(""); }}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                <Button className="rounded-xl gap-1.5 min-h-[44px]" disabled={busy} onClick={approve}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Aprobar y publicar
                </Button>
                <Button variant="outline" className="rounded-xl gap-1.5 min-h-[44px]" disabled={busy} onClick={() => setAsking(true)}>
                  <XCircle className="w-4 h-4 text-red-500" />
                  Pedir cambios
                </Button>
              </div>
            )}
          </>
        )}
        <div className="flex gap-2 flex-wrap pt-1 border-t border-border/40">
          <Button variant="ghost" size="sm" className="gap-1.5" asChild>
            <Link to={`/admin/doctores/editar/${doc.id}`}><Pencil className="w-3.5 h-3.5" /> Editar perfil completo</Link>
          </Button>
          {doc.slug && (
            <Button variant="ghost" size="sm" className="gap-1.5" asChild>
              <a href={`/especialista/${doc.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5" /> Ver perfil público</a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
