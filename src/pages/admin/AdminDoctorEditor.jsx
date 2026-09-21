import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Eye, Save, Clock, User, Stethoscope, GraduationCap, Languages, MapPin, ShieldCheck, FileText, Globe, Lock, Home, Check, ListChecks, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DoctorEditorPerfil from "@/components/admin/DoctorEditorPerfil";
import DoctorDetailsManager from "@/components/admin/DoctorDetailsManager";
import EducationManager from "@/components/admin/EducationManager";
import LanguagesManager from "@/components/admin/LanguagesManager";
import InsurersManager from "@/components/admin/InsurersManager";
import ConditionsManager from "@/components/admin/ConditionsManager";
import HighlightsManager from "@/components/admin/HighlightsManager";
import SubspecialtiesManager from "@/components/admin/SubspecialtiesManager";
import DoctorEditorSidebar from "@/components/admin/DoctorEditorSidebar";
import OfficeManager from "@/components/admin/OfficeManager";
import DocumentManager from "@/components/admin/DocumentManager";
import DoctorDashboardHome from "@/components/admin/DoctorDashboardHome";
import { useSpecialistForm, useRecalculateScore, useAutoSaveSpecialist, trackContactChanges, EMPTY_SPECIALIST_FORM } from "@/api/specialistForm";
import { notifyProfileApproved } from "@/api/doctorNotify";

// Este editor ahora es exclusivo del panel de administración (/admin/doctores/editar/:id),
// protegido por RequireAdmin. Los médicos administran su propio perfil en /panel-medico
// (ver src/pages/DoctorPanel.jsx), que es una página completamente separada.
// El estado del formulario (campos vacíos, generar slug, armar payload, autoguardado,
// recalcular score) vive en src/api/specialistForm.js, compartido con DoctorPanel.jsx.

export default function AdminDoctorEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { form, setForm, formRef, update, buildData } = useSpecialistForm();
  const originalContactRef = useRef({ email: "", whatsapp: "" });
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [justSaved, setJustSaved] = useState(false);
  const [justPublished, setJustPublished] = useState(false);
  const [section, setSection] = useState(isEditing ? "resumen" : "perfil");
  const recalculateScore = useRecalculateScore(setForm);

  useEffect(() => {
    let active = true;
    (async () => {
      if (isEditing) {
        const matches = await base44.entities.Specialist.filter({ id });
        if (!active) return;
        const item = matches[0];
        if (item) {
          originalContactRef.current = { email: item.email || "", whatsapp: item.whatsapp || "" };
          setForm({
            ...EMPTY_SPECIALIST_FORM,
            ...item,
            services: item.services || [],
            insurers_relation: item.insurers_relation || [],
            conditions_relation: item.conditions_relation || [],
            gallery: item.gallery || [],
          });
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id, isEditing]);

  useAutoSaveSpecialist({
    enabled: isEditing,
    specialistId: id,
    formRef,
    buildData,
    contactRef: originalContactRef,
    byAdmin: true,
    onSaved: () => { setLastSaved(new Date()); recalculateScore(id); },
  });

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      const data = buildData(formRef.current);
      if (isEditing) {
        await base44.entities.Specialist.update(id, data);
        trackContactChanges(originalContactRef, formRef.current, { specialistId: id, byAdmin: true });
        toast.success("Cambios guardados");
        recalculateScore(id);
      } else {
        if (!data.full_name) { toast.error("El nombre es obligatorio"); setSaving(false); return; }
        const created = await base44.entities.Specialist.create(data);
        toast.success("Perfil creado");
        recalculateScore(created.id);
        navigate(`/admin/doctores/editar/${created.id}`, { replace: true });
      }
      setLastSaved(new Date());
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
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
      const wasAlreadyActive = form.active;
      const data = { ...buildData(f), active: true, publication_status: "published" };
      if (isEditing) {
        await base44.entities.Specialist.update(id, data);
        trackContactChanges(originalContactRef, f, { specialistId: id, byAdmin: true });
        setForm(prev => ({ ...prev, active: true, publication_status: "published" }));
        if (!wasAlreadyActive) notifyProfileApproved({ ...f, ...data, id });
        toast.success("Perfil publicado");
        setJustPublished(true);
        setTimeout(() => setJustPublished(false), 3000);
        recalculateScore(id);
      } else {
        const created = await base44.entities.Specialist.create(data);
        toast.success("Perfil publicado");
        setJustPublished(true);
        setTimeout(() => setJustPublished(false), 3000);
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
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  const completitud = form.completeness_score || 0;

  const SECTION_GROUPS = [
    { group: "Inicio", items: [
      { key: "resumen", label: "Inicio", icon: Home, requiresSaved: true },
    ]},
    { group: "Perfil del médico", items: [
      { key: "perfil", label: "Datos y presentación", icon: User, requiresSaved: false },
      { key: "formacion", label: "Formación", icon: GraduationCap, requiresSaved: true },
      { key: "idiomas", label: "Idiomas", icon: Languages, requiresSaved: true },
      { key: "consultorios", label: "Consultorios y horarios", icon: MapPin, requiresSaved: true },
    ]},
    { group: "Servicios y más", items: [
      { key: "detalles", label: "Detalles y servicios", icon: Stethoscope, requiresSaved: false },
      { key: "aseguradoras", label: "Seguros que acepta", icon: ShieldCheck, requiresSaved: false },
      { key: "enfermedades", label: "Enfermedades que trata", icon: ListChecks, requiresSaved: false },
      { key: "subespecialidades", label: "Subespecialidades", icon: GraduationCap, requiresSaved: false },
      { key: "tecnologia", label: "Tecnología y tratamientos", icon: Cpu, requiresSaved: true },
      { key: "documentos", label: "Cédula y documentos", icon: FileText, requiresSaved: true },
    ]},
    { group: "Estado", items: [
      { key: "publicacion", label: "Estado y visibilidad", icon: Globe, requiresSaved: false },
    ]},
  ];

  const SECTIONS = SECTION_GROUPS.flatMap((g) => g.items);
  const activeSection = SECTIONS.find(s => s.key === section) || SECTIONS[0];

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
          {form.slug && isEditing && (
            <Button variant="outline" size="sm" className="rounded-xl gap-1.5" asChild>
              <a href={`/especialista/${form.slug}`} target="_blank" rel="noopener noreferrer">
                <Eye className="w-4 h-4" />
                Vista previa
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleSaveChanges} disabled={saving} className="rounded-xl gap-1.5">
            {saving ? (
              <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : justSaved ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {justSaved ? "¡Guardado!" : isEditing ? "Guardar cambios" : "Guardar como borrador"}
          </Button>
          {!isEditing && (
            <Button onClick={handlePublish} disabled={saving} className="rounded-xl gap-1.5">
              {saving ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : justPublished ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {justPublished ? "¡Publicado!" : "Crear y publicar"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
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

          <nav className="bg-card border border-border/50 rounded-2xl p-3 flex flex-col gap-3">
            {SECTION_GROUPS.map((g) => (
              <div key={g.group} className="flex flex-col gap-0.5">
                <p className="text-[10px] font-heading font-semibold uppercase tracking-wide px-3 mb-1 text-muted-foreground/70">{g.group}</p>
                {g.items.map((s) => {
                  const locked = s.requiresSaved && !isEditing;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      disabled={locked}
                      onClick={() => setSection(s.key)}
                      title={locked ? "Guarda el perfil primero para desbloquear esta sección" : undefined}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors ${
                        section === s.key
                          ? "bg-primary text-primary-foreground"
                          : locked
                          ? "text-muted-foreground/40 cursor-not-allowed"
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

        <div>
          {activeSection.requiresSaved && !isEditing ? (
            <div className="bg-card rounded-2xl border border-border/50 p-8 text-center">
              <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Guarda primero los datos básicos en "Datos y presentación" para desbloquear esta sección.
              </p>
            </div>
          ) : (
            <>
              {section === "resumen" && <DoctorDashboardHome specialist={{ ...form, id }} isOwnProfile={false} />}
              {section === "perfil" && <DoctorEditorPerfil form={form} update={update} simple />}
              {section === "detalles" && <DoctorDetailsManager form={form} update={update} specialistId={id} />}
              {section === "formacion" && <EducationManager specialistId={id} />}
              {section === "idiomas" && <LanguagesManager specialistId={id} />}
              {section === "consultorios" && <OfficeManager specialistId={id} />}
              {section === "aseguradoras" && <InsurersManager form={form} update={update} />}
              {section === "enfermedades" && <ConditionsManager form={form} update={update} />}
              {section === "subespecialidades" && <SubspecialtiesManager form={form} update={update} />}
              {section === "tecnologia" && <HighlightsManager specialistId={id} />}
              {section === "documentos" && <DocumentManager specialistId={id} />}
              {section === "publicacion" && (
                <DoctorEditorSidebar form={form} update={update} specialistId={id} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
