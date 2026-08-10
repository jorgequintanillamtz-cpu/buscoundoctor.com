import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  Inbox, Stethoscope, Users, ShieldCheck, FileText, Crown,
  CheckCircle2, XCircle, Loader2, PartyPopper,
} from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/api/activityLog";
import { loadPremiumStatuses, mergePremiumStatus, computeLateDoctors } from "@/api/premiumStatus";
import { useAdminBadges } from "@/components/adminBadges";
import { PendingDocCard } from "@/pages/admin/AdminVerificaciones";
import { PendingBlogCard } from "@/pages/admin/AdminBlog";

// Tarjeta de un doctor esperando aprobación de su perfil: mismo patrón de
// aprobar/rechazar (con motivo obligatorio) que ya usa AdminDoctores.jsx,
// para que la experiencia sea consistente con las otras 3 colas de esta
// bandeja.
function PendingDoctorCard({ doc, onReviewed }) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const { refresh: refreshBadges } = useAdminBadges();

  const approve = async () => {
    setReviewing(true);
    try {
      await base44.entities.Specialist.update(doc.id, { publication_status: "published" });
      toast.success(`Perfil de ${doc.full_name} aprobado y publicado`);
      logActivity({
        type: "doctor_aprobado",
        description: `Se aprobó y publicó el perfil de ${doc.full_name}`,
        specialistId: doc.id,
        specialistName: doc.full_name,
      });
      onReviewed();
      refreshBadges();
    } catch (e) {
      toast.error("Error: " + e.message);
    }
    setReviewing(false);
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) { toast.error("El motivo de rechazo es obligatorio"); return; }
    setReviewing(true);
    try {
      await base44.entities.Specialist.update(doc.id, { publication_status: "rejected" });
      toast.success(`Perfil de ${doc.full_name} rechazado`);
      logActivity({
        type: "doctor_rechazado",
        description: `Se rechazó el perfil de ${doc.full_name}. Motivo: ${rejectReason.trim()}`,
        specialistId: doc.id,
        specialistName: doc.full_name,
      });
      setRejecting(false);
      setRejectReason("");
      onReviewed();
      refreshBadges();
    } catch (e) {
      toast.error("Error: " + e.message);
    }
    setReviewing(false);
  };

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 space-y-3">
      <div className="flex items-center gap-3">
        {doc.profile_photo ? (
          <img src={doc.profile_photo} alt={doc.full_name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-muted flex-shrink-0 flex items-center justify-center text-muted-foreground text-sm font-bold">
            {(doc.full_name || "D")[0]}
          </div>
        )}
        <div className="min-w-0">
          <Link
            to={`/admin/doctores/editar/${doc.id}`}
            className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
          >
            {doc.full_name}
          </Link>
          <p className="text-xs text-muted-foreground truncate">{doc.specialty || "Sin especialidad"}</p>
        </div>
      </div>

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
            <Button size="sm" variant="outline" className="rounded-xl gap-1.5" disabled={reviewing} onClick={approve}>
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

// Tarjeta de un doctor Premium retrasado en su pago: a diferencia de las
// otras 3 colas, aquí no hay un simple aprobar/rechazar — registrar el pago
// o desactivar el perfil requiere el formulario completo, así que esta
// tarjeta solo informa y manda a /admin/premium para actuar.
function LatePaymentCard({ doc }) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 flex items-center gap-3">
      {doc.profile_photo ? (
        <img src={doc.profile_photo} alt={doc.full_name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-muted flex-shrink-0 flex items-center justify-center text-muted-foreground text-sm font-bold">
          {(doc.full_name || "D")[0]}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{doc.full_name}</p>
        <p className="text-xs text-red-600 font-medium">{doc.daysLate} día{doc.daysLate !== 1 ? "s" : ""} de retraso</p>
      </div>
      <Button asChild size="sm" variant="outline" className="rounded-xl flex-shrink-0">
        <Link to="/admin/premium">Ver en Premium</Link>
      </Button>
    </div>
  );
}

// Sección genérica de la bandeja: título, ícono, contador y lista (o el
// estado "nada pendiente aquí").
function InboxSection({ icon: Icon, title, count, emptyLabel, children }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-heading font-semibold text-sm text-foreground">{title}</h2>
        {count > 0 && (
          <span className="text-xs bg-amber-500 text-white rounded-full px-2 py-0.5 font-semibold">{count}</span>
        )}
      </div>
      {count === 0 ? (
        <div className="bg-card border border-border/50 rounded-2xl p-5 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <div className="space-y-3 max-w-2xl">{children}</div>
      )}
    </div>
  );
}

// Bandeja de entrada unificada: junta las 4 colas de pendientes que antes
// vivían cada una en su propia página (Doctores, Verificaciones, Blog,
// Premium) para que el dueño no tenga que ir sección por sección a ver qué
// necesita atención. Las páginas originales siguen existiendo tal cual,
// para el trabajo más a fondo en cada una; esto es solo el resumen de
// "qué me falta revisar hoy".
export default function AdminInbox() {
  const [specialists, setSpecialists] = useState([]);
  const [docs, setDocs] = useState([]);
  const [posts, setPosts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [premiumStatuses, setPremiumStatuses] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [specs, allDocs, allPosts, allPayments, statuses, me] = await Promise.all([
      base44.entities.Specialist.list(),
      base44.entities.SpecialistDocument.list("-created_date", 500),
      base44.entities.BlogPost.list("-created_date", 500),
      base44.entities.PremiumPayment.list("-payment_date", 1000),
      loadPremiumStatuses(),
      base44.auth.me().catch(() => null),
    ]);
    setSpecialists(specs);
    setDocs(allDocs);
    setPosts(allPosts);
    setPayments(allPayments);
    setPremiumStatuses(statuses);
    setUser(me);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const specialistsById = useMemo(
    () => Object.fromEntries(specialists.map((s) => [s.id, s])),
    [specialists]
  );

  const pendingDoctors = useMemo(
    () => specialists.filter((s) => s.publication_status === "pending_review" || (s.publication_status === "draft" && s.owner_user_id)),
    [specialists]
  );

  const pendingDocs = useMemo(
    () => docs.filter((d) => d.upload_status === "uploaded" || d.upload_status === "under_review"),
    [docs]
  );

  const pendingPosts = useMemo(
    () => posts.filter((p) => p.submitted_by_specialist_id && p.review_status === "pending_review"),
    [posts]
  );

  const lateDoctors = useMemo(
    () => computeLateDoctors(mergePremiumStatus(specialists, premiumStatuses), payments),
    [specialists, premiumStatuses, payments]
  );

  const totalPending = pendingDoctors.length + pendingDocs.length + pendingPosts.length + lateDoctors.length;

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
        <Inbox className="w-6 h-6 text-primary" />
        <h1 className="font-heading font-bold text-2xl text-foreground">Bandeja de entrada</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Las 4 colas de pendientes del panel, juntas en un solo lugar: doctores por aprobar, documentos por
        verificar, artículos de blog por revisar, y doctores Premium retrasados en su pago.
      </p>

      {totalPending === 0 ? (
        <div className="bg-card border border-border/50 rounded-2xl p-10 text-center">
          <PartyPopper className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Todo al día. No hay nada pendiente de revisión.</p>
        </div>
      ) : (
        <>
          <InboxSection icon={Users} title="Doctores por aprobar" count={pendingDoctors.length} emptyLabel="No hay perfiles esperando aprobación.">
            {pendingDoctors.map((doc) => (
              <PendingDoctorCard key={doc.id} doc={doc} onReviewed={load} />
            ))}
          </InboxSection>

          <InboxSection icon={ShieldCheck} title="Documentos por verificar" count={pendingDocs.length} emptyLabel="No hay documentos pendientes de revisión.">
            {pendingDocs.map((doc) => (
              <PendingDocCard
                key={doc.id}
                doc={doc}
                specialist={specialistsById[doc.specialist_id]}
                user={user}
                onReviewed={load}
              />
            ))}
          </InboxSection>

          <InboxSection icon={FileText} title="Artículos de blog por revisar" count={pendingPosts.length} emptyLabel="No hay artículos esperando revisión.">
            {pendingPosts.map((post) => (
              <PendingBlogCard key={post.id} post={post} onReviewed={load} />
            ))}
          </InboxSection>

          <InboxSection icon={Crown} title="Premium retrasados en su pago" count={lateDoctors.length} emptyLabel="Nadie está retrasado.">
            {lateDoctors.map((doc) => (
              <LatePaymentCard key={doc.id} doc={doc} />
            ))}
          </InboxSection>
        </>
      )}
    </div>
  );
}
