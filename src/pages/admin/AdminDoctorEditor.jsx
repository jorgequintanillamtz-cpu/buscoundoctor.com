import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Eye, Save, Clock, User, Stethoscope, GraduationCap, Languages, MapPin, ShieldCheck, FileText, Globe, Lock, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DoctorEditorPerfil from "@/components/admin/DoctorEditorPerfil";
import DoctorDetailsManager from "@/components/admin/DoctorDetailsManager";
import EducationManager from "@/components/admin/EducationManager";
import LanguagesManager from "@/components/admin/LanguagesManager";
import InsurersManager from "@/components/admin/InsurersManager";
import DoctorEditorSidebar from "@/components/admin/DoctorEditorSidebar";
import OfficeManager from "@/components/admin/OfficeManager";
import DocumentManager from "@/components/admin/DocumentManager";
import DoctorDashboardHome from "@/components/admin/DoctorDashboardHome";

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
  insurers_relation: [],
  gallery: [],
  video_url: "",
  certifications: "",
  profile_photo: "",
  featured: false,
  active: true,
  price_range: "$$",
  completeness_score: 0,
  seo_score: 0,
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
  const [currentUser, setCurrentUser] = useState(null);
  const [blocked, setBlocked] = useState(false);
  const [section, setSection] = useState(isEditing ? "resumen" : "perfil");

  const isAdmin = currentUser && (currentUser.role === "admin" || currentUser.role === "superadmin");
  const isDoctor = currentUser && !isAdmin;

  useEffect(() => { formRef.current = form; }, [form]);

  useEffect(() => {
    let active = true;
    (async () => {
      const u = await base44.auth.me().catch(() => null);
      if (!active) return;
      setCurrentUser(u);
      const admin = u && (u.role === "admin" || u.role === "superadmin");

      // Médico (no admin): solo puede editar su propio perfil
      if (!admin && u) {
        const own = await base44.entities.Specialist.filter({ owner_user_id: u.id });
        if (!active) return;
        if (isEditing) {
          const ownsThis = own.find(s => s.id === id);
          if (!ownsThis) {
            setBlocked(true);
            setLoading(false);
            return;
          }
          setForm({
            ...EMPTY_FORM,
            ...ownsThis,
            services: ownsThis.services || [],
            insurers_relation: ownsThis.insurers_relation || [],
            gallery: ownsThis.gallery || [],
          });
          setLoading(false);
        } else {
          if (own.length > 0) {
            navigate(`/admin/doctores/editar/${own[0].id}`, { replace: true });
          } else {
            setBlocked(true);
            setLoading(false);
          }
        }
        return;
      }

      // Admin: acceso total (como hoy)
      if (isEditing) {
        const list = await base44.entities.Specialist.list();
        if (!active) return;
        const item = list.find(d => d.id === id);
        if (item) {
          setForm({
            ...EMPTY_FORM,
            ...item,
            services: item.services || [],
            insurers_relation: item.insurers_relation || [],
            gallery: item.gallery || [],
          });
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id, isEditing, navigate]);

  // Auto-save every 30s
  useEffect(() => {
    if (!isEditing) return;
    autoSaveRef.current = setInterval(async () => {
      const f = formRef.current;
      if (!f.full_name) return;
      try {
        await base44.entities.Specialist.update(id, buildData(f));
        setLastSaved(new Date());
        recalculateScore(id);
      } catch {}
    }, 30000);
    return () => clearInterval(autoSaveRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditing, currentUser]);

  const update = useCallback((field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === "full_name" && !prev._slugManual) {
        next.slug = generateSlug(value);
      }
      return next;
    });
  }, []);

  const buildData = (f) => {
    const data = {
      ...f,
      years_experience: f.years_experience ? Number(f.years_experience) : undefined,
      rating: f.rating ? Number(f.rating) : undefined,
      slug: f.slug || generateSlug(f.full_name),
    };
    // Un médico (no admin) NUNCA puede cambiar estos campos, sin importar
    // desde qué pantalla se guarde. "active" es el campo real que controla
    // si el perfil es visible al público, así que es tan sensible como
    // publication_status y debe quedar fuera del alcance del médico.
    const admin = currentUser && (currentUser.role === "admin" || currentUser.role === "superadmin");
    if (!admin) {
      delete data.publication_status;
      delete data.license_verification_status;
      delete data.license_verified_at;
      delete data.license_verified_by;
      delete data.active;
      delete data.featured;
    }
    return data;
  };

  const recalculateScore = async (specialistId) => {
    try {
      const res = await base44.functions.invoke('recalculateSpecialistScore', { specialist_id: specialistId });
      const data = res.data || res;
      if (typeof data.completeness_score === 'number') {
        setForm(prev => ({ ...prev, completeness_score: data.completeness_score, seo_score: data.seo_score ?? prev.seo_score }));
      }
    } catch {}
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      const data = buildData(formRef.current);
      if (isEditing) {
        await base44.entities.Specialist.update(id, data);
        toast.success("Cambios guardados");
        recalculateScore(id);
      } else {
        if (!data.full_name) { toast.error("El nombre es obligatorio"); setSaving(false); return; }
        // Un médico creando su primer perfil no debe poder fijar active/featured (ya se filtran en buildData)
        const created = await base44.entities.Specialist.create(data);
        toast.success("Perfil creado");
        recalculateScore(created.id);
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
        recalculateScore(id);
      } else {
        const created = await base44.entities.Specialist.create(data);
        toast.success("Perfil publicado");
        recalculateScore(created.id);
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

  if (blocked) {
    return (
      <div className="max-w-2xl text-center py-16">
        <h1 className="font-heading font-bold text-2xl text-foreground">No tienes permiso para editar este perfil</h1>
        <p className="text-sm text-muted-foreground mt-2">Solo puedes editar tu propio perfil de especialista.</p>
        <Button variant="outline" className="mt-5 rounded-xl" onClick={() => navigate("/admin/doctores")}>Volver</Button>
      </div>
    );
  }

  const completitud = form.completeness_score || 0;

  // Menú agrupado por categorías, al estilo del panel de proveedor de referencia.
  const SECTION_GROUPS = [
    {
      group: "Inicio",
      items: [
        { key: "resumen", label: "Inicio", icon: Home, requiresSaved: true },
      ],
    },
    {
      group: "Mi perfil",
      items: [
        { key: "perfil", label: "Datos y biografía", icon: User, requiresSaved: false },
        { key: "formacion", label: "Formación académica", icon: GraduationCap, requiresSaved: true },
        { key: "idiomas", label: "Idiomas", icon: Languages, requiresSaved: true },
        { key: "consultorios", label: "Zona de cobertura", icon: MapPin, requiresSaved: true },
      ],
    },
    {
      group: "Negocio",
      items: [
        { key: "detalles", label: "Detalles y servicios", icon: Stethoscope, requiresSaved: false },
        { key: "aseguradoras", label: "Aseguradoras aceptadas", icon: ShieldCheck, requiresSaved: false },
        { key: "documentos", label: "Documentos y cédula", icon: FileText, requiresSaved: true },
      ],
    },
    ...(isAdmin ? [{
      group: "Cuenta",
      items: [
        { key: "publicacion", label: "Publicación (admin)", icon: Globe, requiresSaved: false },
      ],
    }] : []),
  ];

  const SECTIONS = SECTION_GROUPS.flatMap((g) => g.items);
  const activeSection = SECTIONS.find(s => s.key === section) || SECTIONS[0];

  return (
    <div className="max-w-7xl">
      <button onClick={() => navigate(isAdmin ? "/admin/doctores" : "/admin/mi-perfil")} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5">
        <ChevronLeft className="w-4 h-4" />
        {isAdmin ? "Volver a doctores" : "Volver"}
      </button>

      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground leading-tight">
            {form.full_name || (isEditing ? "Editar doctor" : "Completa tu perfil")}
          </h1>
          {lastSaved && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              Guardado a las {lastSaved.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {form.slug && isEditing && (
            <Button variant="outline" size="sm" className="rounded-xl gap-1.5" asChild>
              <a href={`/especialista/${form.slug}`} target="_blank" rel="noopener noreferrer">
                <Eye className="w-4 h-4" />
                Vista previa
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleSaveChanges} disabled={saving} className="rounded-xl gap-1.5">
            {saving ? <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar cambios
          </Button>
          {isAdmin && (
            <Button onClick={handlePublish} disabled={saving} className="rounded-xl gap-1.5">
              {saving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              {form.active ? "Actualizar y publicar" : "Publicar perfil"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
        {/* Menú lateral de secciones: oscuro y agrupado para médicos, claro para admin */}
        <div className="space-y-4 lg:sticky lg:top-4">
          <div className="bg-card rounded-2xl border border-border/50 p-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-medium text-muted-foreground">Completitud del perfil</span>
              <span className={`font-semibold ${completitud >= 80 ? "text-green-600" : completitud >= 50 ? "text-amber-600" : "text-red-500"}`}>{completitud}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${completitud >= 80 ? "bg-green-500" : completitud >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                style={{ width: `${completitud}%` }}
              />
            </div>
          </div>

          <nav className={`rounded-2xl p-3 flex flex-col gap-3 ${isDoctor ? "bg-brand-navy" : "bg-card border border-border/50"}`}>
            {SECTION_GROUPS.map((g) => (
              <div key={g.group} className="flex flex-col gap-0.5">
                <p className={`text-[10px] font-heading font-semibold uppercase tracking-wide px-3 mb-1 ${isDoctor ? "text-white/40" : "text-muted-foreground/70"}`}>
                  {g.group}
                </p>
                {g.items.map((s) => {
                  const locked = s.requiresSaved && !isEditing;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      disabled={locked}
                      onClick={() => setSection(s.key)}
                      title={locked ? "Guarda tu perfil primero para desbloquear esta sección" : undefined}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors ${
                        section === s.key
                          ? isDoctor
                            ? "bg-brand-blue text-white"
                            : "bg-primary text-primary-foreground"
                          : locked
                          ? isDoctor ? "text-white/25 cursor-not-allowed" : "text-muted-foreground/40 cursor-not-allowed"
                          : isDoctor
                          ? "text-white/70 hover:bg-white/5 hover:text-white"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <s.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{s.label}</span>
                      {locked && <Lock className="w-3 h-3 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Contenido de la sección activa */}
        <div>
          {activeSection.requiresSaved && !isEditing ? (
            <div className="bg-card rounded-2xl border border-border/50 p-8 text-center">
              <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Guarda primero tus datos básicos en "Datos y biografía" para desbloquear esta sección.
              </p>
            </div>
          ) : (
            <>
              {section === "resumen" && <DoctorDashboardHome specialist={{ ...form, id }} isOwnProfile={!isAdmin} />}
              {section === "perfil" && <DoctorEditorPerfil form={form} update={update} />}
              {section === "detalles" && <DoctorDetailsManager form={form} update={update} />}
              {section === "formacion" && <EducationManager specialistId={id} />}
              {section === "idiomas" && <LanguagesManager specialistId={id} />}
              {section === "consultorios" && <OfficeManager specialistId={id} />}
              {section === "aseguradoras" && <InsurersManager form={form} update={update} />}
              {section === "documentos" && <DocumentManager specialistId={id} />}
              {section === "publicacion" && isAdmin && (
                <DoctorEditorSidebar form={form} update={update} onSaveDraft={handleSaveChanges} saving={saving} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
