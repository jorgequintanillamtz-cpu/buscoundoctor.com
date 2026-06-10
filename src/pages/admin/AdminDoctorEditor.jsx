import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Eye, Save, FileEdit, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DoctorEditorPerfil from "@/components/admin/DoctorEditorPerfil";
import DoctorEditorSidebar from "@/components/admin/DoctorEditorSidebar";

export const EMPTY_FORM = {
  nombre_completo: "",
  slug: "",
  especialidad: "",
  cedula_profesional: "",
  sub_especialidades: [],
  descripcion_profesional: "",
  extracto: "",
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
  keyword_principal: "",
  keywords_secundarias: "",
  estado_perfil: "borrador",
  destacado: false,
  indexable: true,
  schema_type: "Physician",
};

export function generateSlug(nombre) {
  return (nombre || "")
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
  const [showPreview, setShowPreview] = useState(false);
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
            idiomas: doc.idiomas?.length ? doc.idiomas : ["Español"],
          });
        }
        setLoading(false);
      });
    }
  }, [id, isEditing]);

  // Auto-save every 30s
  useEffect(() => {
    if (!isEditing) return;
    autoSaveRef.current = setInterval(async () => {
      const f = formRef.current;
      if (!f.nombre_completo) return;
      try {
        await base44.entities.Doctor.update(id, f);
        setLastSaved(new Date());
      } catch {}
    }, 30000);
    return () => clearInterval(autoSaveRef.current);
  }, [id, isEditing]);

  const update = useCallback((field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === "nombre_completo" && !prev._slugManual) {
        next.slug = generateSlug(value);
      }
      return next;
    });
  }, []);

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const data = { ...formRef.current, slug: formRef.current.slug || generateSlug(formRef.current.nombre_completo) };
      if (isEditing) {
        await base44.entities.Doctor.update(id, data);
        toast.success("Borrador guardado");
      } else {
        if (!data.nombre_completo) { toast.error("El nombre es obligatorio"); setSaving(false); return; }
        const created = await base44.entities.Doctor.create(data);
        toast.success("Doctor creado");
        navigate(`/admin/doctores/editar/${created.id}`, { replace: true });
      }
      setLastSaved(new Date());
    } catch (e) {
      toast.error("Error al guardar: " + e.message);
    }
    setSaving(false);
  };

  const handlePublish = async () => {
    const f = formRef.current;
    if (!f.cedula_profesional) { toast.error("La cédula profesional es obligatoria para publicar"); return; }
    const words = (f.descripcion_profesional || "").trim().split(/\s+/).filter(Boolean).length;
    if (words < 150) { toast.error("La descripción necesita al menos 150 palabras para publicar"); return; }
    setSaving(true);
    try {
      const data = { ...f, estado_perfil: "publicado", slug: f.slug || generateSlug(f.nombre_completo) };
      if (isEditing) {
        await base44.entities.Doctor.update(id, data);
        setForm(prev => ({ ...prev, estado_perfil: "publicado" }));
        toast.success("Perfil publicado");
      } else {
        const created = await base44.entities.Doctor.create(data);
        toast.success("Perfil publicado");
        navigate(`/admin/doctores/editar/${created.id}`, { replace: true });
      }
      setLastSaved(new Date());
    } catch (e) {
      toast.error("Error al publicar: " + e.message);
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
    <div className="max-w-7xl">
      {/* Breadcrumb */}
      <button onClick={() => navigate("/admin/doctores")} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5">
        <ChevronLeft className="w-4 h-4" />
        Volver a doctores
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground leading-tight">
            {form.nombre_completo || (isEditing ? "Editar doctor" : "Nuevo doctor")}
          </h1>
          {lastSaved && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              Guardado a las {lastSaved.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {form.slug && (
            <Button variant="outline" size="sm" className="rounded-xl gap-1.5" asChild>
              <a href={`/especialista/${form.slug}`} target="_blank" rel="noopener noreferrer">
                <Eye className="w-4 h-4" />
                Vista previa
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={saving} className="rounded-xl gap-1.5">
            {saving ? <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : <FileEdit className="w-4 h-4" />}
            Guardar borrador
          </Button>
          <Button onClick={handlePublish} disabled={saving} className="rounded-xl gap-1.5">
            {saving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            {form.estado_perfil === "publicado" ? "Actualizar perfil" : "Publicar perfil"}
          </Button>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 items-start">
        <DoctorEditorPerfil form={form} update={update} />
        <DoctorEditorSidebar form={form} update={update} onSaveDraft={handleSaveDraft} onPublish={handlePublish} saving={saving} />
      </div>
    </div>
  );
}