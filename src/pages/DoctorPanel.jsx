import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Eye, Save, Clock, User, Stethoscope, GraduationCap, Languages, MapPin, ShieldCheck, FileText, Home, Lock, ArrowLeft, LogOut, Sparkles, Image as ImageIcon, PenLine, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DoctorEditorPerfil from "@/components/admin/DoctorEditorPerfil";
import DoctorDetailsManager from "@/components/admin/DoctorDetailsManager";
import EducationManager from "@/components/admin/EducationManager";
import LanguagesManager from "@/components/admin/LanguagesManager";
import InsurersManager from "@/components/admin/InsurersManager";
import OfficeManager from "@/components/admin/OfficeManager";
import DocumentManager from "@/components/admin/DocumentManager";
import DoctorDashboardHome from "@/components/admin/DoctorDashboardHome";
import CasesManager from "@/components/admin/CasesManager";
import PostsManager from "@/components/admin/PostsManager";
import DoctorBlogSubmit from "@/components/admin/DoctorBlogSubmit";
import { EMPTY_FORM, generateSlug } from "@/pages/admin/AdminDoctorEditor";

const SECTION_GROUPS = [
  { group: "Inicio", items: [
    { key: "resumen", label: "Inicio", icon: Home, requiresSaved: true },
  ]},
  { group: "Mi perfil", items: [
    { key: "perfil", label: "Datos y biografía", icon: User, requiresSaved: false },
    { key: "formacion", label: "Formación académica", icon: GraduationCap, requiresSaved: true },
    { key: "idiomas", label: "Idiomas", icon: Languages, requiresSaved: true },
    { key: "consultorios", label: "Zona de cobertura", icon: MapPin, requiresSaved: true },
  ]},
  { group: "Negocio", items: [
    { key: "detalles", label: "Detalles y servicios", icon: Stethoscope, requiresSaved: false },
    { key: "aseguradoras", label: "Aseguradoras aceptadas", icon: ShieldCheck, requiresSaved: false },
    { key: "documentos", label: "Documentos y cédula", icon: FileText, requiresSaved: true },
  ]},
  { group: "Contenido", items: [
    { key: "casos", label: "Casos de éxito", icon: Sparkles, requiresSaved: true },
    { key: "publicaciones", label: "Publicaciones", icon: ImageIcon, requiresSaved: true },
    { key: "blog", label: "Escribir blog", icon: PenLine, requiresSaved: true },
  ]},
];
const SECTIONS = SECTION_GROUPS.flatMap((g) => g.items);

export default function DoctorPanel() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading | ready | no-profile | wrong-role
  const [specialistId, setSpecialistId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [section, setSection] = useState("resumen");
  const autoSaveRef = useRef(null);
  const formRef = useRef(form);

  useEffect(() => { formRef.current = form; }, [form]);

  useEffect(() => {
    let active = true;
    (async () => {
      const u = await base44.auth.me().catch(() => null);
      if (!active) return;
      if (!u) {
        base44.auth.redirectToLogin(window.location.href);
        return;
      }
      if (u.role === "admin" || u.role === "superadmin") {
        setStatus("wrong-role");
        return;
      }
      const own = await base44.entities.Specialist.filter({ owner_user_id: u.id }).catch(() => []);
      if (!active) return;
      if (own.length === 0) {
        setStatus("no-profile");
        return;
      }
      const specialist = own[0];
      setSpecialistId(specialist.id);
      setForm({
        ...EMPTY_FORM,
        ...specialist,
        services: specialist.services || [],
        insurers_relation: specialist.insurers_relation || [],
        gallery: specialist.gallery || [],
      });
      setStatus("ready");
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    autoSaveRef.current = setInterval(async () => {
      const f = formRef.current;
      if (!f.full_name) return;
      try {
        await base44.entities.Specialist.update(specialistId, buildData(f));
        setLastSaved(new Date());
        recalculateScore();
      } catch {}
    }, 30000);
    return () => clearInterval(autoSaveRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, specialistId]);

  const update = useCallback((field, value) => {
    setForm((prev) => {
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
    delete data.publication_status;
    delete data.license_verification_status;
    delete data.license_verified_at;
    delete data.license_verified_by;
    delete data.active;
    delete data.featured;
    delete data._slugManual;
    return data;
  };

  const recalculateScore = async () => {
    try {
      const res = await base44.functions.invoke("recalculateSpecialistScore", { specialist_id: specialistId });
      const data = res.data || res;
      if (typeof data.completeness_score === "number") {
        setForm((prev) => ({ ...prev, completeness_score: data.completeness_score, seo_score: data.seo_score ?? prev.seo_score }));
      }
    } catch {}
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      await base44.entities.Specialist.update(specialistId, buildData(formRef.current));
      toast.success("Cambios guardados");
      recalculateScore();
      setLastSaved(new Date());
    } catch (e) {
      toast.error("Error al guardar: " + e.message);
    }
    setSaving(false);
  };

  // ---- Estados sin perfil listo: se muestran dentro del mismo shell oscuro ----
  const renderShell = (content) => (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex w-64 flex-col bg-brand-navy min-h-screen sticky top-0">
        <div className="p-5 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Volver al sitio
          </Link>
          <h2 className="font-heading font-bold text-lg text-white">Panel de Médico</h2>
          <p className="text-xs text-white/50 mt-1">Administra tu perfil en BuscoUnDoctor.</p>
        </div>
        <div className="flex-1" />
        <div className="p-3 border-t border-white/10">
          <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
            Salir del panel
          </Link>
        </div>
      </aside>
      <div className="flex-1 min-h-screen">
        <div className="lg:hidden sticky top-0 z-40 bg-brand-navy px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-white/70">
            <ArrowLeft className="w-4 h-4" />
            Sitio
          </Link>
          <h2 className="font-heading font-bold text-white">Panel de Médico</h2>
          <div className="w-10" />
        </div>
        <div className="p-4 sm:p-6 lg:p-8">{content}</div>
      </div>
    </div>
  );

  if (status === "loading") {
    return renderShell(
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "wrong-role") {
    return renderShell(
      <div className="max-w-md mx-auto text-center py-16">
        <h1 className="font-heading font-bold text-xl text-foreground">Este panel es para médicos</h1>
        <p className="text-sm text-muted-foreground mt-2">Tu cuenta es de administrador. Administra a los médicos desde el panel de administración.</p>
        <Button variant="outline" className="mt-5 rounded-xl" onClick={() => navigate("/admin/doctores")}>Ir al panel de administración</Button>
      </div>
    );
  }

  if (status === "no-profile") {
    return renderShell(
      <div className="max-w-md mx-auto text-center py-16">
        <h1 className="font-heading font-bold text-xl text-foreground">Aún no tienes un perfil de médico</h1>
        <p className="text-sm text-muted-foreground mt-2">Regístrate para crear tu perfil y aparecer en el directorio.</p>
        <Button className="mt-5 rounded-xl" asChild>
          <Link to="/registro-medico">Registrarme como médico</Link>
        </Button>
      </div>
    );
  }

  const completitud = form.completeness_score || 0;
  const isEditing = true;

  // ---- Panel listo: la barra lateral incluye TODA la navegación ----
  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex w-72 flex-col bg-brand-navy min-h-screen sticky top-0">
        <div className="p-5 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Volver al sitio
          </Link>
          <h2 className="font-heading font-bold text-lg text-white">Panel de Médico</h2>
          <p className="text-xs text-white/50 mt-1">Administra tu perfil en BuscoUnDoctor.</p>

          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-medium text-white/50">Completitud</span>
              <span className={`font-semibold ${completitud >= 80 ? "text-emerald-400" : completitud >= 50 ? "text-amber-400" : "text-red-400"}`}>{completitud}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${completitud >= 80 ? "bg-emerald-400" : completitud >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                style={{ width: `${completitud}%` }}
              />
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          {SECTION_GROUPS.map((g) => (
            <div key={g.group} className="flex flex-col gap-0.5 mb-3">
              <p className="text-[10px] font-heading font-semibold uppercase tracking-wide px-3 mb-1 text-white/40">{g.group}</p>
              {g.items.map((s) => {
                const locked = s.requiresSaved && !isEditing;
                return (
                  <button
                    key={s.key}
                    type="button"
                    disabled={locked}
                    onClick={() => setSection(s.key)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors ${
                      section === s.key
                        ? "bg-brand-blue text-white"
                        : locked
                        ? "text-white/25 cursor-not-allowed"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
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

        <div className="p-3 border-t border-white/10">
          <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
            Salir del panel
          </Link>
        </div>
      </aside>

      <div className="flex-1 min-h-screen">
        {/* Barra superior en móvil: título + navegación en píldoras horizontales */}
        <div className="lg:hidden sticky top-0 z-40 bg-brand-navy px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <Link to="/" className="flex items-center gap-2 text-sm text-white/70">
              <ArrowLeft className="w-4 h-4" />
              Sitio
            </Link>
            <h2 className="font-heading font-bold text-white">Panel de Médico</h2>
            <div className="w-10" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
            {SECTIONS.map((s) => {
              const locked = s.requiresSaved && !isEditing;
              return (
                <button
                  key={s.key}
                  disabled={locked}
                  onClick={() => setSection(s.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    section === s.key ? "bg-brand-blue text-white" : "bg-white/10 text-white/70"
                  }`}
                >
                  <s.icon className="w-3.5 h-3.5" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl">
            <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
              <div>
                <h1 className="font-heading font-bold text-2xl text-foreground leading-tight">{form.full_name}</h1>
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
                <Button variant="outline" size="sm" onClick={handleSaveChanges} disabled={saving} className="rounded-xl gap-1.5">
                  {saving ? <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar cambios
                </Button>
              </div>
            </div>

            {section === "resumen" && <DoctorDashboardHome specialist={{ ...form, id: specialistId }} isOwnProfile={true} />}
            {section === "perfil" && <DoctorEditorPerfil form={form} update={update} />}
            {section === "detalles" && <DoctorDetailsManager form={form} update={update} specialistId={specialistId} />}
            {section === "formacion" && <EducationManager specialistId={specialistId} />}
            {section === "idiomas" && <LanguagesManager specialistId={specialistId} />}
            {section === "consultorios" && <OfficeManager specialistId={specialistId} />}
            {section === "aseguradoras" && <InsurersManager form={form} update={update} />}
            {section === "documentos" && <DocumentManager specialistId={specialistId} />}
            {section === "casos" && <CasesManager specialistId={specialistId} />}
            {section === "publicaciones" && <PostsManager specialistId={specialistId} />}
            {section === "blog" && <DoctorBlogSubmit specialistId={specialistId} specialistName={form.full_name} specialty={form.specialty} />}
          </div>
        </div>
      </div>
    </div>
  );
}
