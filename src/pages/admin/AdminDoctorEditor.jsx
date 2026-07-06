import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Eye, Save, FileEdit, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DoctorEditorPerfil from "@/components/admin/DoctorEditorPerfil";
import DoctorEditorSidebar from "@/components/admin/DoctorEditorSidebar";

export const EMPTY_FORM = {
  full_name: "",
  slug: "",
  professional_license_number: "",
  specialty: "",
  subspecialty: "",
  description: "",
  years_experience: "",
  rating: "",
  location: "",
  city: "Monterrey",
  zone: "",
  address: "",
  whatsapp: "",
  email: "",
  instagram: "",
  modality: "presencial",
  schedule: "",
  services: [],
  insurers: [],
  gallery: [],
  video_url: "",
  certifications: "",
  profile_photo: "",
  featured: false,
  active: true,
  price_range: "$$",
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
  const autoSaveRef = useRef(null);
  const formRef = useRef(form);

  useEffect(() => { formRef.current = form; }, [form]);

  useEffect(() => {
    if (isEditing) {
      base44.entities.Specialist.list().then(list => {
        const item = list.find(d => d.id === id);
        if (item) {
          setForm({
            ...EMPTY_FORM,
            ...item,
            services: item.services || [],
            insurers: item.insurers || [],
            gallery: item.gallery || [],
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
      if (!f.full_name) return;
      try {
        await base44.entities.Specialist.update(id, f);
        setLastSaved(new Date());
      } catch {}
    }, 30000);
    return () => clearInterval(autoSaveRef.current);
  }, [id, isEditing]);

  const update = useCallback((field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === "full_name" && !prev._slugManual) {
        next.slug = generateSlug(value);
      }
      return next;
    });
  }, []);

  const buildData = (f) => ({
    ...f,
    years_experience: f.years_experience ? Number(f.years_experience) : undefined,
    rating: f.rating ? Number(f.rating) : undefined,
    slug: f.slug || generateSlug(f.full_name),
  });

  const handleSaveDraft = async () => {
    if (!formRef.current.professional_license_number) { toast.error("La cédula profesional es obligatoria"); return; }
    setSaving(true);
    try {
      const data = buildData(formRef.current);
      if (isEditing) {
        await base44.entities.Specialist.update(id, data);
        toast.success("Borrador guardado");
      } else {
        if (!data.full_name) { toast.error("El nombre es obligatorio"); setSaving(false); return; }
        const created = await base44.entities.Specialist.create(data);
        toast.success("Especialista creado");
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
    if (!f.full_name) { toast.error("El nombre es obligatorio"); return; }
    if (!f.specialty) { toast.error("La especialidad es obligatoria"); return; }
    if (!f.whatsapp) { toast.error("El WhatsApp es obligatorio para publicar"); return; }
    if (!f.professional_license_number) { toast.error("La cédula profesional es obligatoria"); return; }
    setSaving(true);
    try {
      const data = { ...buildData(f), active: true };
      if (isEditing) {
        await base44.entities.Specialist.update(id, data);
        setForm(prev => ({ ...prev, active: true }));
        toast.success("Perfil publicado");
      } else {
        const created = await base44.entities.Specialist.create(data);
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
      <button onClick={() => navigate("/admin/doctores")} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5">
        <ChevronLeft className="w-4 h-4" />
        Volver a doctores
      </button>

      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground leading-tight">
            {form.full_name || (isEditing ? "Editar doctor" : "Nuevo doctor")}
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
            {form.active ? "Actualizar perfil" : "Publicar perfil"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 items-start">
        <DoctorEditorPerfil form={form} update={update} />
        <DoctorEditorSidebar form={form} update={update} onSaveDraft={handleSaveDraft} saving={saving} />
      </div>
    </div>
  );
}