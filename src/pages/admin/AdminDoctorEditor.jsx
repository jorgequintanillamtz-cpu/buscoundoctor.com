import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Save, Eye, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DoctorEditorPerfil from "@/components/admin/DoctorEditorPerfil";
import DoctorEditorSidebar from "@/components/admin/DoctorEditorSidebar";

const EMPTY_FORM = {
  nombre_completo: "",
  cedula_profesional: "",
  especialidad: "",
  sub_especialidades: [],
  descripcion_profesional: "",
  hospital_o_consultorio: "",
  direccion: "",
  ciudad: "Monterrey",
  telefono: "",
  whatsapp: "",
  correo_contacto: "",
  sitio_web: "",
  foto_perfil: "",
  galeria_fotos: [],
  anos_experiencia: "",
  acepta_seguros: false,
  seguros_aceptados: [],
  idiomas: ["Español"],
  precio_consulta_aproximado: "",
  horarios: "",
  titulo_seo: "",
  descripcion_seo: "",
  slug: "",
  estado_perfil: "borrador",
  destacado: false,
};

function generateSlug(nombre) {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function AdminDoctorEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const autoSaveRef = useRef(null);
  const formRef = useRef(form);

  useEffect(() => { formRef.current = form; }, [form]);

  useEffect(() => {
    if (isEditing) {
      base44.entities.Doctor.list().then(docs => {
        const doc = docs.find(d => d.id === id);
        if (doc) {
          setForm({
            ...EMPTY_FORM,
            ...doc,
            galeria_fotos: doc.galeria_fotos || [],
            sub_especialidades: doc.sub_especialidades || [],
            seguros_aceptados: doc.seguros_aceptados || [],
            idiomas: doc.idiomas || ["Español"],
          });
        }
        setLoading(false);
      });
    }
  }, [id, isEditing]);

  // Auto-save every 30 seconds
  useEffect(() => {
    autoSaveRef.current = setInterval(async () => {
      if (!isEditing) return;
      const current = formRef.current;
      if (!current.nombre_completo) return;
      try {
        await base44.entities.Doctor.update(id, current);
        setLastSaved(new Date());
      } catch {}
    }, 30000);
    return () => clearInterval(autoSaveRef.current);
  }, [id, isEditing]);

  const update = useCallback((field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      // Auto-generate slug from nombre_completo
      if (field === "nombre_completo") {
        next.slug = generateSlug(value);
      }
      return next;
    });
  }, []);

  const handleSave = async () => {
    if (!form.nombre_completo || !form.cedula_profesional || !form.especialidad) {
      toast.error("Nombre, cédula y especialidad son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const data = { ...form, slug: form.slug || generateSlug(form.nombre_completo) };
      if (isEditing) {
        await base44.entities.Doctor.update(id, data);
        toast.success("Doctor actualizado");
      } else {
        const created = await base44.entities.Doctor.create(data);
        toast.success("Doctor creado");
        navigate(`/admin/doctores/editar/${created.id}`);
      }
      setLastSaved(new Date());
    } catch (e) {
      toast.error("Error al guardar: " + e.message);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/admin/doctores" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          Doctores
        </Link>
        {form.nombre_completo && (
          <>
            <span>/</span>
            <span className="text-foreground font-medium truncate max-w-[200px]">{form.nombre_completo}</span>
          </>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">
            {isEditing ? "Editar doctor" : "Nuevo doctor"}
          </h1>
          {lastSaved && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" />
              Guardado {lastSaved.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {form.slug && (
            <Button variant="outline" size="sm" className="rounded-xl gap-1" asChild>
              <a href={`/especialista/${form.slug}`} target="_blank" rel="noopener noreferrer">
                <Eye className="w-4 h-4" />
                Vista previa
              </a>
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2">
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear doctor"}
          </Button>
        </div>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DoctorEditorPerfil form={form} update={update} />
        </div>
        <div>
          <DoctorEditorSidebar form={form} update={update} onSave={handleSave} saving={saving} />
        </div>
      </div>
    </div>
  );
}