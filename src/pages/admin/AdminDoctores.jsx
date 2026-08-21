import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Plus, Pencil, Trash2, Star, ShieldCheck, BadgeCheck, XCircle, MessageCircle, Clock,
  Stethoscope, Crown, Search, ArrowUpDown, CheckSquare, Square, Calendar, Loader2, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { toast } from "sonner";
import { logActivity } from "@/api/activityLog";
import { notifyProfileApproved, notifyProfileRejected } from "@/api/doctorNotify";
import { loadPremiumStatuses, mergePremiumStatus, savePremiumStatus } from "@/api/premiumStatus";
import { usePaginatedList } from "@/api/usePaginatedList";
import Pagination from "@/components/admin/Pagination";
import { useAdminBadges } from "@/components/adminBadges";

const VERIFICATION_LABELS = {
  pending: { label: "Cédula pendiente", icon: Clock, cls: "bg-amber-100 text-amber-700" },
  verified: { label: "Cédula verificada", icon: ShieldCheck, cls: "bg-green-100 text-green-700" },
  rejected: { label: "Cédula rechazada", icon: XCircle, cls: "bg-red-100 text-red-700" },
};

export default function AdminDoctores() {
  const { refresh: refreshBadges } = useAdminBadges();
  const [doctors, setDoctors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("todos");

  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos"); // todos | activos | inactivos
  const [sortOrder, setSortOrder] = useState("recientes"); // recientes | citas | nombre

  const [selectedPending, setSelectedPending] = useState(new Set());
  const [rejectDialog, setRejectDialog] = useState({ open: false, ids: [], motivo: "" });
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Specialist.list("-created_date"),
      base44.entities.AppointmentRequest.list("-created_date", 2000),
      loadPremiumStatuses(),
    ]).then(([d, r, premiumStatuses]) => {
      setDoctors(mergePremiumStatus(d, premiumStatuses));
      setRequests(r);
      setLoading(false);
    });
  }, []);

  // "Eliminar" ya no borra nada de inmediato: manda el perfil a la papelera
  // (deja de verse en el sitio) y se puede restaurar después. El borrado
  // permanente en cascada (reseñas, consultorios, documentos, etc.) solo
  // pasa desde la pestaña Papelera, como acción aparte y explícita.
  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Mover a la papelera al doctor "${nombre}"? Dejará de verse en el sitio, pero podrás restaurarlo después desde la pestaña Papelera.`)) return;
    const reason = (prompt(`Motivo (opcional) por el que se da de baja a "${nombre}":`) || "").trim();
    const deletedAt = new Date().toISOString();
    try {
      await base44.entities.Specialist.update(id, { active: false, deleted_at: deletedAt, suspension_reason: reason });
      setDoctors(prev => prev.map(d => (d.id === id ? { ...d, active: false, deleted_at: deletedAt, suspension_reason: reason } : d)));
      toast.success("Doctor movido a la papelera");
      logActivity({
        type: "doctor_papelera",
        description: `Se movió a la papelera el perfil de ${nombre}${reason ? `. Motivo: ${reason}` : ""}`,
        specialistId: id,
        specialistName: nombre,
      });
      refreshBadges();
    } catch (e) {
      toast.error("No se pudo mover a la papelera: " + e.message);
    }
  };

  const handleRestore = async (id, nombre) => {
    try {
      await base44.entities.Specialist.update(id, { active: true, deleted_at: null, suspension_reason: "" });
      setDoctors(prev => prev.map(d => (d.id === id ? { ...d, active: true, deleted_at: null, suspension_reason: "" } : d)));
      toast.success(`${nombre} fue restaurado`);
      logActivity({ type: "doctor_restaurado", description: `Se restauró el perfil de ${nombre} desde la papelera`, specialistId: id, specialistName: nombre });
      refreshBadges();
    } catch (e) {
      toast.error("No se pudo restaurar: " + e.message);
    }
  };

  const handlePermanentDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar PERMANENTEMENTE a "${nombre}"? Se borrarán también sus reseñas, consultorios, servicios, documentos y estadísticas. Esta acción no se puede deshacer.`)) return;
    try {
      await base44.functions.invoke("deleteDoctorProfile", { specialist_id: id });
      setDoctors(prev => prev.filter(d => d.id !== id));
      toast.success("Doctor eliminado por completo");
      logActivity({ type: "doctor_eliminado", description: `Se eliminó de forma permanente el perfil de ${nombre}`, specialistName: nombre });
      refreshBadges();
    } catch (e) {
      toast.error("No se pudo eliminar: " + e.message);
    }
  };

  const toggleFeatured = async (id, nombre, current) => {
    const next = !current;
    setDoctors(prev => prev.map(d => d.id === id ? { ...d, featured: next } : d));
    try {
      await base44.entities.Specialist.update(id, { featured: next });
      toast.success(next ? `${nombre} ahora aparece en la página principal` : `${nombre} ya no aparece en la página principal`);
      logActivity({
        type: next ? "destacado_activado" : "destacado_desactivado",
        description: next ? `${nombre} se marcó como destacado` : `${nombre} se quitó de destacados`,
        specialistId: id,
        specialistName: nombre,
      });
    } catch (e) {
      setDoctors(prev => prev.map(d => d.id === id ? { ...d, featured: current } : d));
      toast.error("No se pudo actualizar: " + e.message);
    }
  };

  // Plan Premium/Gratis: el cobro se maneja manualmente fuera del sistema
  // (transferencia, efectivo, etc.), aquí solo se refleja el resultado para
  // que el sitio sepa a quién destacar y para llevar control interno. El
  // estado vive en la entidad PremiumStatus, no en Specialist.
  const togglePremium = async (doc) => {
    const { id, full_name: nombre } = doc;
    const currentPlan = doc.plan_slug || "gratis";
    const next = currentPlan === "premium" ? "gratis" : "premium";
    const prevActivatedAt = doc.premium_activated_at;
    const nextActivatedAt = next === "premium" ? new Date().toISOString() : prevActivatedAt;
    setDoctors(prev => prev.map(d => d.id === id ? { ...d, plan_slug: next, premium_activated_at: nextActivatedAt } : d));
    try {
      const statusId = await savePremiumStatus(doc, { plan_slug: next, premium_activated_at: nextActivatedAt || null });
      setDoctors(prev => prev.map(d => d.id === id ? { ...d, _premiumStatusId: statusId } : d));
      toast.success(next === "premium" ? `${nombre} ahora es Premium` : `${nombre} ahora es Gratis`);
      logActivity({
        type: next === "premium" ? "premium_activado" : "premium_desactivado",
        description: next === "premium" ? `${nombre} pasó a plan Premium` : `${nombre} pasó a plan Gratis`,
        specialistId: id,
        specialistName: nombre,
      });
    } catch (e) {
      setDoctors(prev => prev.map(d => d.id === id ? { ...d, plan_slug: currentPlan, premium_activated_at: prevActivatedAt } : d));
      toast.error("No se pudo actualizar: " + e.message);
    }
  };

  // Activar/desactivar el perfil directamente desde la lista (por ejemplo,
  // mientras un doctor Premium no ha pagado). Deja de verse en el directorio
  // hasta que se reactive.
  const toggleActive = async (doc) => {
    const isActive = doc.active !== false;
    const next = !isActive;
    if (!next && !confirm(`¿Desactivar el perfil de ${doc.full_name}? Dejará de verse en el directorio hasta que lo reactives.`)) return;
    setDoctors(prev => prev.map(d => d.id === doc.id ? { ...d, active: next } : d));
    try {
      await base44.entities.Specialist.update(doc.id, { active: next });
      toast.success(next ? `${doc.full_name} reactivado` : `${doc.full_name} desactivado`);
      logActivity({
        type: next ? "perfil_activado" : "perfil_desactivado",
        description: next ? `Se reactivó el perfil de ${doc.full_name}` : `Se desactivó el perfil de ${doc.full_name}`,
        specialistId: doc.id,
        specialistName: doc.full_name,
      });
    } catch (e) {
      setDoctors(prev => prev.map(d => d.id === doc.id ? { ...d, active: isActive } : d));
      toast.error("No se pudo actualizar: " + e.message);
    }
  };

  // Perfiles registrados vía /registro-medico: pendientes de revisión o borradores con dueño asignado
  // (se excluye lo que está en la papelera de las 3 pestañas operativas).
  const pendientes = useMemo(
    () => doctors.filter(s => !s.deleted_at && (s.publication_status === "pending_review" || (s.publication_status === "draft" && s.owner_user_id))),
    [doctors]
  );

  // Borradores anónimos: el wizard de /registro-medico va guardando el
  // progreso paso a paso desde antes de que exista una cuenta. Si la persona
  // abandona el registro, el perfil queda aquí (sin dueño todavía) para que
  // se pueda dar seguimiento manualmente.
  const enProgreso = useMemo(
    () => doctors.filter(s => !s.deleted_at && s.publication_status === "draft" && !s.owner_user_id),
    [doctors]
  );

  // "Todos" muestra los perfiles reales (publicados o en revisión formal);
  // los borradores anónimos viven solo en la pestaña "En progreso", y lo
  // eliminado vive solo en "Papelera".
  const doctoresReales = useMemo(
    () => doctors.filter(s => !s.deleted_at && !(s.publication_status === "draft" && !s.owner_user_id)),
    [doctors]
  );

  // Perfiles movidos a la papelera: dejaron de verse en el sitio pero se
  // pueden restaurar, o eliminar de forma permanente y en cascada.
  const enPapelera = useMemo(() => doctors.filter(s => !!s.deleted_at), [doctors]);

  const specialtyOptions = useMemo(() => {
    const set = new Set(doctoresReales.map(d => d.specialty).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [doctoresReales]);

  // Citas generadas por doctor (total histórico y este mes), para dar
  // contexto rápido en la lista sin tener que ir a /admin/solicitudes.
  const requestCountsByDoctor = useMemo(() => {
    const now = new Date();
    const mStart = startOfMonth(now);
    const mEnd = endOfMonth(now);
    const map = {};
    requests.forEach(r => {
      if (!r.specialist_id) return;
      if (!map[r.specialist_id]) map[r.specialist_id] = { total: 0, thisMonth: 0 };
      map[r.specialist_id].total += 1;
      if (r.created_date && isWithinInterval(parseISO(r.created_date), { start: mStart, end: mEnd })) {
        map[r.specialist_id].thisMonth += 1;
      }
    });
    return map;
  }, [requests]);

  // Lista "Todos" filtrada por búsqueda/especialidad/estado y ordenada.
  const visibleDoctors = useMemo(() => {
    let list = doctoresReales;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(d =>
        (d.full_name || "").toLowerCase().includes(q) ||
        (d.professional_license_number || "").toLowerCase().includes(q)
      );
    }
    if (specialtyFilter) list = list.filter(d => d.specialty === specialtyFilter);
    if (statusFilter === "activos") list = list.filter(d => d.active !== false);
    if (statusFilter === "inactivos") list = list.filter(d => d.active === false);

    const withCounts = list.map(d => ({
      ...d,
      totalCitas: requestCountsByDoctor[d.id]?.total || 0,
      citasMes: requestCountsByDoctor[d.id]?.thisMonth || 0,
    }));

    if (sortOrder === "citas") withCounts.sort((a, b) => b.totalCitas - a.totalCitas);
    else if (sortOrder === "nombre") withCounts.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "", "es"));
    // "recientes" ya viene ordenado por created_date desc desde el fetch inicial

    return withCounts;
  }, [doctoresReales, search, specialtyFilter, statusFilter, sortOrder, requestCountsByDoctor]);

  const {
    pageItems: pagedDoctors, page: doctorsPage, setPage: setDoctorsPage, totalPages: doctorsTotalPages,
  } = usePaginatedList(visibleDoctors, { pageSize: 20, resetKey: `${search}|${specialtyFilter}|${statusFilter}|${sortOrder}` });

  const STEP_LABELS = {
    datos: "Datos básicos",
    ubicacion: "Ubicación",
    fotos: "Datos completos (falta crear cuenta)",
  };

  const waLink = (whatsapp) => {
    const digits = (whatsapp || "").replace(/\D/g, "");
    return digits ? `https://wa.me/52${digits.replace(/^52/, "")}` : null;
  };

  const handleDeleteDraft = async (id, nombre) => {
    if (!confirm(`¿Mover a la papelera el registro en progreso de "${nombre}"?`)) return;
    const deletedAt = new Date().toISOString();
    try {
      await base44.entities.Specialist.update(id, { active: false, deleted_at: deletedAt });
      setDoctors(prev => prev.map(d => (d.id === id ? { ...d, active: false, deleted_at: deletedAt } : d)));
      toast.success("Registro movido a la papelera");
      logActivity({ type: "registro_papelera", description: `Se movió a la papelera el registro en progreso de ${nombre}`, specialistName: nombre });
      refreshBadges();
    } catch (e) {
      toast.error("No se pudo mover a la papelera: " + e.message);
    }
  };

  const featuredCount = useMemo(() => doctors.filter(d => d.featured).length, [doctors]);
  const premiumCount = useMemo(() => doctors.filter(d => d.plan_slug === "premium").length, [doctors]);

  const togglePendingSelected = (id) => {
    setSelectedPending(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAllPending = () => {
    setSelectedPending(prev => (prev.size === pendientes.length ? new Set() : new Set(pendientes.map(d => d.id))));
  };

  const handleBulkApprove = async (ids) => {
    if (ids.length === 0) return;
    try {
      await Promise.all(ids.map(id => base44.entities.Specialist.update(id, { publication_status: "published" })));
      setDoctors(prev => prev.map(d => (ids.includes(d.id) ? { ...d, publication_status: "published" } : d)));
      const approvedDocs = doctors.filter(d => ids.includes(d.id));
      approvedDocs.forEach(d => {
        logActivity({ type: "doctor_aprobado", description: `Se aprobó y publicó el perfil de ${d.full_name}`, specialistId: d.id, specialistName: d.full_name });
        notifyProfileApproved(d);
      });
      setSelectedPending(new Set());
      toast.success(`${ids.length} perfil${ids.length !== 1 ? "es" : ""} aprobado${ids.length !== 1 ? "s" : ""} y publicado${ids.length !== 1 ? "s" : ""}`);
      refreshBadges();
    } catch (e) {
      toast.error("No se pudo aprobar: " + e.message);
    }
  };

  const openRejectDialog = (ids) => setRejectDialog({ open: true, ids, motivo: "" });

  const confirmReject = async () => {
    if (!rejectDialog.motivo.trim()) { toast.error("Debes ingresar un motivo de rechazo"); return; }
    setRejecting(true);
    try {
      await Promise.all(rejectDialog.ids.map(id => base44.entities.Specialist.update(id, { publication_status: "rejected" })));
      setDoctors(prev => prev.map(d => (rejectDialog.ids.includes(d.id) ? { ...d, publication_status: "rejected" } : d)));
      const rejectedDocs = doctors.filter(d => rejectDialog.ids.includes(d.id));
      rejectedDocs.forEach(d => {
        logActivity({
          type: "doctor_rechazado",
          description: `Se rechazó el perfil de ${d.full_name}. Motivo: ${rejectDialog.motivo.trim()}`,
          specialistId: d.id,
          specialistName: d.full_name,
        });
        notifyProfileRejected(d, rejectDialog.motivo.trim());
      });
      setSelectedPending(new Set());
      toast.success(`${rejectDialog.ids.length} perfil${rejectDialog.ids.length !== 1 ? "es" : ""} rechazado${rejectDialog.ids.length !== 1 ? "s" : ""}`);
      setRejectDialog({ open: false, ids: [], motivo: "" });
      refreshBadges();
    } catch (e) {
      toast.error("No se pudo rechazar: " + e.message);
    }
    setRejecting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-3">
        <h1 className="font-heading font-bold text-2xl text-foreground">Doctores</h1>
        <Button asChild className="rounded-xl gap-2">
          <Link to="/admin/doctores/nuevo">
            <Plus className="w-4 h-4" />
            Nuevo doctor
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-amber-500 rounded-xl px-4 py-2.5 w-fit">
          <Star className="w-4 h-4 text-white flex-shrink-0" fill="currentColor" />
          <p className="text-sm text-white">
            <span className="font-semibold">{featuredCount}</span> destacado{featuredCount !== 1 ? "s" : ""} para la página principal
            {featuredCount > 6 && <span className="text-white/80"> — solo se muestran los primeros 6</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-purple-500 rounded-xl px-4 py-2.5 w-fit">
          <Crown className="w-4 h-4 text-white flex-shrink-0" fill="currentColor" />
          <p className="text-sm text-white">
            <span className="font-semibold">{premiumCount}</span> doctor{premiumCount !== 1 ? "es" : ""} en plan Premium
          </p>
        </div>
      </div>

      {/* Pestañas */}
      <div className="flex items-center gap-1 mb-6 border-b border-border/50">
        <button
          onClick={() => setTab("todos")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === "todos" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Todos
        </button>
        <button
          onClick={() => setTab("pendientes")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${tab === "pendientes" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Pendientes de revisión
          {pendientes.length > 0 && (
            <span className="text-xs bg-amber-500 text-white rounded-full px-1.5 min-w-[18px] text-center">{pendientes.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab("progreso")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${tab === "progreso" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Registros en progreso
          {enProgreso.length > 0 && (
            <span className="text-xs bg-blue-500 text-white rounded-full px-1.5 min-w-[18px] text-center">{enProgreso.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab("papelera")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${tab === "papelera" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Papelera
          {enPapelera.length > 0 && (
            <span className="text-xs bg-red-500 text-white rounded-full px-1.5 min-w-[18px] text-center">{enPapelera.length}</span>
          )}
        </button>
      </div>

      {/* Listado general: perfiles reales (publicados o en revisión formal) */}
      {tab === "todos" && (
        <>
          {doctoresReales.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o cédula..."
                  className="rounded-xl pl-9"
                />
              </div>
              <select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="">Todas las especialidades</option>
                {specialtyOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="todos">Todos los estados</option>
                <option value="activos">Activos</option>
                <option value="inactivos">Inactivos</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder(prev => (prev === "recientes" ? "citas" : prev === "citas" ? "nombre" : "recientes"))}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm flex items-center gap-1.5 text-muted-foreground hover:text-foreground flex-shrink-0"
                title="Cambiar orden"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                {sortOrder === "recientes" ? "Más recientes" : sortOrder === "citas" ? "Más citas" : "Nombre A-Z"}
              </button>
            </div>
          )}

          {doctoresReales.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="mb-4">No hay doctores registrados todavía.</p>
              <Button asChild className="rounded-xl gap-2">
                <Link to="/admin/doctores/nuevo"><Plus className="w-4 h-4" /> Agregar el primero</Link>
              </Button>
            </div>
          ) : visibleDoctors.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Ningún doctor coincide con la búsqueda o los filtros.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pagedDoctors.map(doc => {
                const verification = VERIFICATION_LABELS[doc.license_verification_status] || VERIFICATION_LABELS.pending;
                const VerificationIcon = verification.icon;
                const isActive = doc.active !== false;
                return (
                  <div key={doc.id} className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-4 flex-wrap">
                    {doc.profile_photo ? (
                      <img src={doc.profile_photo} alt={doc.full_name} loading="lazy" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex-shrink-0 flex items-center justify-center text-muted-foreground text-lg font-bold">
                        {(doc.full_name || "D")[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{doc.full_name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {doc.specialty} {doc.city ? `· ${doc.city}` : ""} {doc.professional_license_number ? `· Céd. ${doc.professional_license_number}` : ""}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${verification.cls}`}>
                          <VerificationIcon className="w-3 h-3" /> {verification.label}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-brand-bluePale text-brand-navy flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {doc.totalCitas} cita{doc.totalCitas !== 1 ? "s" : ""} total{doc.totalCitas !== 1 ? "es" : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleFeatured(doc.id, doc.full_name, !!doc.featured)}
                        title={doc.featured ? "Quitar de la página principal" : "Mostrar en la página principal"}
                        aria-label={doc.featured ? "Quitar de la página principal" : "Mostrar en la página principal"}
                        className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors flex-shrink-0 ${
                          doc.featured
                            ? "bg-amber-100 border-amber-200 text-amber-500 hover:bg-amber-200"
                            : "bg-transparent border-border text-muted-foreground hover:border-amber-300 hover:text-amber-400"
                        }`}
                      >
                        <Star className="w-4 h-4" fill={doc.featured ? "currentColor" : "none"} />
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePremium(doc)}
                        title={doc.plan_slug === "premium" ? "Cambiar a plan Gratis" : "Marcar como Premium (cobro manual)"}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 transition-colors flex-shrink-0 ${
                          doc.plan_slug === "premium"
                            ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                            : "bg-muted text-muted-foreground hover:bg-purple-50 hover:text-purple-600"
                        }`}
                      >
                        <Crown className="w-3 h-3" fill={doc.plan_slug === "premium" ? "currentColor" : "none"} />
                        {doc.plan_slug === "premium" ? "Premium" : "Gratis"}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(doc)}
                        title={isActive ? "Desactivar perfil" : "Reactivar perfil"}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors flex-shrink-0 ${
                          isActive
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-600"
                        }`}
                      >
                        {isActive ? "Activo" : "Inactivo"}
                      </button>
                      <Link to={`/admin/doctores/editar/${doc.id}`}>
                        <Button variant="ghost" size="icon" aria-label="Editar doctor" className="rounded-xl h-8 w-8">
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" aria-label="Mover a la papelera" title="Mover a la papelera" className="rounded-xl h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(doc.id, doc.full_name)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Pagination
            page={doctorsPage}
            totalPages={doctorsTotalPages}
            onPageChange={setDoctorsPage}
            total={visibleDoctors.length}
            pageSize={20}
          />
        </>
      )}

      {/* Registros en progreso: borradores anónimos guardados paso a paso */}
      {tab === "progreso" && (
        enProgreso.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No hay registros en progreso por ahora.</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">WhatsApp</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Llegó hasta</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Fecha</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {enProgreso.map(doc => (
                    <tr key={doc.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {doc.full_name}
                        {doc.specialty && <span className="block text-xs text-muted-foreground font-normal">{doc.specialty}</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{doc.whatsapp || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-100 text-blue-700">
                          {STEP_LABELS[doc.registration_step] || doc.registration_step || "Sin datos de registro"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {doc.created_date ? new Date(doc.created_date).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {waLink(doc.whatsapp) && (
                            <Button size="sm" variant="outline" className="rounded-lg h-8 gap-1 text-green-600 border-green-200 hover:bg-green-50" asChild>
                              <a href={waLink(doc.whatsapp)} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="w-4 h-4" /> Contactar
                              </a>
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="rounded-lg h-8 gap-1 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => handleDeleteDraft(doc.id, doc.full_name)}>
                            <Trash2 className="w-4 h-4" /> Papelera
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Papelera: perfiles movidos aquí desde "Eliminar", restaurables o borrables definitivamente */}
      {tab === "papelera" && (
        enPapelera.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Trash2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>La papelera está vacía.</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Movido a papelera</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {enPapelera.map(doc => (
                    <tr key={doc.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {doc.full_name}
                        {doc.specialty && <span className="block text-xs text-muted-foreground font-normal">{doc.specialty}</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {doc.deleted_at ? new Date(doc.deleted_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" className="rounded-lg h-8 gap-1 text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleRestore(doc.id, doc.full_name)}>
                            <RotateCcw className="w-4 h-4" /> Restaurar
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-lg h-8 gap-1 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => handlePermanentDelete(doc.id, doc.full_name)}>
                            <Trash2 className="w-4 h-4" /> Eliminar definitivamente
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Perfiles pendientes de revisión */}
      {tab === "pendientes" && (
        pendientes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No hay perfiles pendientes de revisión.</p>
          </div>
        ) : (
          <div>
            {selectedPending.size > 0 && (
              <div className="flex items-center gap-2 mb-3 bg-brand-bluePale rounded-xl px-4 py-2.5 flex-wrap">
                <span className="text-sm text-brand-navy font-medium flex-1">
                  {selectedPending.size} seleccionado{selectedPending.size !== 1 ? "s" : ""}
                </span>
                <Button size="sm" className="rounded-lg gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleBulkApprove(Array.from(selectedPending))}>
                  <BadgeCheck className="w-4 h-4" /> Aprobar seleccionados
                </Button>
                <Button size="sm" variant="outline" className="rounded-lg gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => openRejectDialog(Array.from(selectedPending))}>
                  <XCircle className="w-4 h-4" /> Rechazar seleccionados
                </Button>
              </div>
            )}
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/50">
                      <th className="text-left px-4 py-3 w-10">
                        <button type="button" onClick={toggleSelectAllPending} aria-label="Seleccionar todos" className="text-muted-foreground hover:text-foreground">
                          {selectedPending.size === pendientes.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Cédula</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Registro</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendientes.map(doc => (
                      <tr key={doc.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => togglePendingSelected(doc.id)} aria-label="Seleccionar" className="text-muted-foreground hover:text-foreground">
                            {selectedPending.has(doc.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {doc.full_name}
                          {doc.specialty && <span className="block text-xs text-muted-foreground font-normal">{doc.specialty}</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{doc.professional_license_number || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                          {doc.created_date ? new Date(doc.created_date).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-100 text-amber-700">
                            {doc.publication_status === "pending_review" ? "Pendiente" : "Borrador"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" className="rounded-lg h-8 gap-1 text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleBulkApprove([doc.id])}>
                              <BadgeCheck className="w-4 h-4" /> Aprobar
                            </Button>
                            <Button size="sm" variant="outline" className="rounded-lg h-8 gap-1 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => openRejectDialog([doc.id])}>
                              <XCircle className="w-4 h-4" /> Rechazar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">
              Rechazar {rejectDialog.ids.length > 1 ? `${rejectDialog.ids.length} perfiles` : "perfil"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Motivo de rechazo *</label>
              <Input
                value={rejectDialog.motivo}
                onChange={(e) => setRejectDialog(prev => ({ ...prev, motivo: e.target.value }))}
                placeholder="Ej: Cédula no coincide con el nombre registrado"
                className="rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setRejectDialog({ open: false, ids: [], motivo: "" })} className="rounded-xl">Cancelar</Button>
              <Button variant="destructive" onClick={confirmReject} disabled={rejecting} className="rounded-xl">
                {rejecting && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                Rechazar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
