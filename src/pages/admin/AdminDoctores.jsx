import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Star, ShieldCheck, BadgeCheck, XCircle, MessageCircle, Clock, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminDoctores() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("todos");

  useEffect(() => {
    base44.entities.Specialist.list("-created_date").then(d => { setDoctors(d); setLoading(false); });
  }, []);

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar al doctor "${nombre}"? Esto también borra sus reseñas, consultorios, servicios, documentos y estadísticas.`)) return;
    try {
      await base44.functions.invoke("deleteDoctorProfile", { specialist_id: id });
      setDoctors(prev => prev.filter(d => d.id !== id));
      toast.success("Doctor eliminado por completo");
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
    } catch (e) {
      setDoctors(prev => prev.map(d => d.id === id ? { ...d, featured: current } : d));
      toast.error("No se pudo actualizar: " + e.message);
    }
  };

  // Perfiles registrados vía /registro-medico: pendientes de revisión o borradores con dueño asignado
  const pendientes = useMemo(
    () => doctors.filter(s => s.publication_status === "pending_review" || (s.publication_status === "draft" && s.owner_user_id)),
    [doctors]
  );

  // Borradores anónimos: el wizard de /registro-medico va guardando el
  // progreso paso a paso desde antes de que exista una cuenta. Si la persona
  // abandona el registro, el perfil queda aquí (sin dueño todavía) para que
  // se pueda dar seguimiento manualmente.
  const enProgreso = useMemo(
    () => doctors.filter(s => s.publication_status === "draft" && !s.owner_user_id && s.registration_step),
    [doctors]
  );

  // "Todos" muestra los perfiles reales (publicados o en revisión formal);
  // los borradores anónimos viven solo en la pestaña "En progreso".
  const doctoresReales = useMemo(
    () => doctors.filter(s => !(s.publication_status === "draft" && !s.owner_user_id)),
    [doctors]
  );

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
    if (!confirm(`¿Eliminar el registro en progreso de "${nombre}"?`)) return;
    try {
      await base44.functions.invoke("deleteDoctorProfile", { specialist_id: id });
      setDoctors(prev => prev.filter(d => d.id !== id));
      toast.success("Registro eliminado por completo");
    } catch (e) {
      toast.error("No se pudo eliminar: " + e.message);
    }
  };

  const featuredCount = useMemo(() => doctors.filter(d => d.featured).length, [doctors]);

  const handleApprove = async (id, nombre) => {
    await base44.entities.Specialist.update(id, { publication_status: "published" });
    setDoctors(prev => prev.map(d => d.id === id ? { ...d, publication_status: "published" } : d));
    toast.success(`Perfil de ${nombre} aprobado y publicado`);
  };

  const handleReject = async (id, nombre) => {
    const motivo = prompt(`Motivo de rechazo para "${nombre}":`);
    if (motivo === null) return; // canceló
    if (!motivo.trim()) { toast.error("Debes ingresar un motivo de rechazo"); return; }
    await base44.entities.Specialist.update(id, { publication_status: "rejected" });
    setDoctors(prev => prev.map(d => d.id === id ? { ...d, publication_status: "rejected" } : d));
    toast.success(`Perfil de ${nombre} rechazado`);
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

      <div className="flex items-center gap-2 mb-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 w-fit">
        <Star className="w-4 h-4 text-amber-500 flex-shrink-0" fill="currentColor" />
        <p className="text-sm text-amber-800">
          <span className="font-semibold">{featuredCount}</span> destacado{featuredCount !== 1 ? "s" : ""} para la página principal
          {featuredCount > 6 && <span className="text-amber-600"> — solo se muestran los primeros 6</span>}
        </p>
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
      </div>

      {/* Listado general: perfiles reales (publicados o en revisión formal) */}
      {tab === "todos" && (
        doctoresReales.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="mb-4">No hay doctores registrados todavía.</p>
            <Button asChild className="rounded-xl gap-2">
              <Link to="/admin/doctores/nuevo"><Plus className="w-4 h-4" /> Agregar el primero</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {doctoresReales.map(doc => (
              <div key={doc.id} className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-4">
                {doc.profile_photo ? (
                  <img src={doc.profile_photo} alt={doc.full_name} loading="lazy" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex-shrink-0 flex items-center justify-center text-muted-foreground text-lg font-bold">
                    {(doc.full_name || "D")[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground truncate">{doc.full_name}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{doc.specialty} {doc.city ? `· ${doc.city}` : ""}</p>
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
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${doc.active !== false ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                    {doc.active !== false ? "Activo" : "Inactivo"}
                  </span>
                  <Link to={`/admin/doctores/editar/${doc.id}`}>
                    <Button variant="ghost" size="icon" aria-label="Editar doctor" className="rounded-xl h-8 w-8">
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" aria-label="Eliminar doctor" className="rounded-xl h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(doc.id, doc.full_name)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
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
                          {STEP_LABELS[doc.registration_step] || doc.registration_step}
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
                            <Trash2 className="w-4 h-4" /> Eliminar
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
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/50">
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
                          <Button size="sm" variant="outline" className="rounded-lg h-8 gap-1 text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleApprove(doc.id, doc.full_name)}>
                            <BadgeCheck className="w-4 h-4" /> Aprobar
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-lg h-8 gap-1 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => handleReject(doc.id, doc.full_name)}>
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
        )
      )}
    </div>
  );
}