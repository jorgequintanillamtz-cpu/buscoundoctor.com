import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Star, CheckCircle2, Clock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ESTADO_BADGE = {
  borrador:    "bg-muted text-muted-foreground",
  en_revision: "bg-amber-100 text-amber-700",
  publicado:   "bg-green-100 text-green-700",
};

const ESTADO_LABEL = {
  borrador: "Borrador",
  en_revision: "En revisión",
  publicado: "Publicado",
};

export default function AdminDoctores() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Doctor.list("-created_date").then(d => { setDoctors(d); setLoading(false); });
  }, []);

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar al doctor "${nombre}"?`)) return;
    await base44.entities.Doctor.delete(id);
    setDoctors(prev => prev.filter(d => d.id !== id));
    toast.success("Doctor eliminado");
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

      {doctors.length === 0 ? (
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
              {doc.foto_perfil ? (
                <img src={doc.foto_perfil} alt={doc.nombre_completo} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-muted flex-shrink-0 flex items-center justify-center text-muted-foreground text-lg font-bold">
                  {(doc.nombre_completo || "D")[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-foreground truncate">{doc.nombre_completo}</p>
                  {doc.destacado && <Star className="w-4 h-4 text-amber-400 flex-shrink-0" fill="currentColor" />}
                </div>
                <p className="text-sm text-muted-foreground">{doc.especialidad} {doc.ciudad ? `· ${doc.ciudad}` : ""}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ESTADO_BADGE[doc.estado_perfil] || "bg-muted text-muted-foreground"}`}>
                  {ESTADO_LABEL[doc.estado_perfil] || doc.estado_perfil}
                </span>
                <Link to={`/admin/doctores/editar/${doc.id}`}>
                  <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8">
                    <Pencil className="w-4 h-4" />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(doc.id, doc.nombre_completo)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}