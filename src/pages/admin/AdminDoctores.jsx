import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Star, ShieldCheck, BadgeCheck, XCircle } from "lucide-react";
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
    if (!confirm(`¿Eliminar al doctor "${nombre}"?`)) return;
    await base44.entities.Specialist.delete(id);
    setDoctors(prev => prev.filter(d => d.id !== id));
    toast.success("Doctor eliminado");
  };

  // Perfiles registrados vía /registro-medico: pendientes de revisión o borradores con dueño asignado
  const pendientes = useMemo(
    () => doctors.filter(s => s.publication_status === "pending_review" || (s.publication_status === "draft" && s.owner_user_id)),
    [doctors]
  );

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
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-bold text-2xl text-foreground">Doctores</h1>
        <Button asChild className="rounded-xl gap-2">
          <Link to="/admin/doctores/nuevo">
            <Plus className="w-4 h-4" />
            Nuevo doctor
          </Link>
        </Button>
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
      </div>

      {/* Listado general (sin cambios) */}
      {tab === "todos" && (
        doctors.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="mb-4">No hay doctores registrados todavía.</p>
            <Button asChild className="rounded-xl gap-2">
              <Link to="/admin/doctores/nuevo"><Plus className="w-4 h-4" /> Agregar el primero</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {doctors.map(doc => (
              <div key={doc.id} className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-4">
                {doc.profile_photo ? (
                  <img src={doc.profile_photo} alt={doc.full_name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex-shrink-0 flex items-center justify-center text-muted-foreground text-lg font-bold">
                    {(doc.full_name || "D")[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground truncate">{doc.full_name}</p>
                    {doc.featured && <Star className="w-4 h-4 text-amber-400 flex-shrink-0" fill="currentColor" />}
                  </div>
                  <p className="text-sm text-muted-foreground">{doc.specialty} {doc.city ? `· ${doc.city}` : ""}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${doc.active !== false ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                    {doc.active !== false ? "Activo" : "Inactivo"}
                  </span>
                  <Link to={`/admin/doctores/editar/${doc.id}`}>
                    <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8">
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(doc.id, doc.full_name)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
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