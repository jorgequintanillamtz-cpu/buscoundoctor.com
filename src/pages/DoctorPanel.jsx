import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Eye, Save, Clock, Stethoscope, FileText, Home, ArrowLeft, LogOut, Sparkles, Calendar, Star, Globe, Menu, X, MessageCircle, UserCog, ChevronLeft, Settings } from "lucide-react";
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
import OfficeManager from "@/components/admin/OfficeManager";
import DocumentManager from "@/components/admin/DocumentManager";
import DoctorDashboardHome from "@/components/admin/DoctorDashboardHome";
import DoctorAppointmentRequests from "@/components/admin/DoctorAppointmentRequests";
import DoctorReviews from "@/components/admin/DoctorReviews";
import DoctorPremiumStatus from "@/components/admin/DoctorPremiumStatus";
import CasesManager from "@/components/admin/CasesManager";
import PostsManager from "@/components/admin/PostsManager";
import DoctorBlogSubmit from "@/components/admin/DoctorBlogSubmit";
import ProfileChecklist from "@/components/admin/ProfileChecklist";
import GuidedStepBar from "@/components/admin/GuidedStepBar";
import NotificationBell from "@/components/admin/NotificationBell";
import DoctorNotifications from "@/components/admin/DoctorNotifications";
import { useDoctorNotifications } from "@/hooks/useDoctorNotifications";
import { PROFILE_CHECKLIST_ITEMS } from "@/lib/profileChecklistItems";
import ProfileHub, { PROFILE_SUB_KEYS } from "@/components/admin/ProfileHub";
import { supportWhatsAppLink } from "@/components/DoctorSupportWhatsApp";
import DoctorSettings from "@/components/admin/settings/DoctorSettings";
import WelcomeTourModal from "@/components/admin/WelcomeTourModal";
import { useSpecialistForm, useRecalculateScore, useAutoSaveSpecialist, trackContactChanges, EMPTY_SPECIALIST_FORM, DOCTOR_RESTRICTED_FIELDS } from "@/api/specialistForm";

// El estado del formulario (campos vacíos, generar slug, armar payload,
// autoguardado, recalcular score) vive en src/api/specialistForm.js,
// compartido con AdminDoctorEditor.jsx. Aquí solo se agrega `stripFields`
// para que un doctor nunca pueda tocar desde su propio panel los campos
// que controla el admin (verificación, visibilidad, destacado).

// Menú del panel: corto a propósito (7 opciones). Todo lo que el médico llena de
// su perfil (datos, formación, idiomas, consultorios, servicios, seguros y lo
// opcional) vive dentro de "Mi perfil" (ProfileHub); esas pantallas se abren
// con su propia clave (ver PROFILE_SUB_KEYS) y "Mi perfil" queda resaltado.
//
// Funciones ocultas por ahora (no están en el menú, pero su código sigue
// aquí para reactivarlas): "Tu plan" (section "plan"), "Escribir blog"
// (section "blog"), "Productos digitales" (/panel-medico/productos),
// "Configuración de pagos" (/panel-medico/pagos) y "Resumen de consulta"
// (/panel-medico/resumen). Para volver a mostrar una, agrégala aquí o a
// SIDE_LINKS.
const SECTION_GROUPS = [
  { group: "Mi actividad", items: [
    { key: "resumen", label: "Inicio", icon: Home },
    { key: "solicitudes", label: "Solicitudes de cita", icon: Calendar },
    { key: "resenas", label: "Reseñas", icon: Star },
  ]},
  { group: "Mi perfil", items: [
    { key: "completar", label: "Llena tu perfil", icon: Sparkles },
    { key: "mi-perfil", label: "Mi perfil", icon: UserCog },
    { key: "documentos", label: "Mi cédula y documentos", icon: FileText },
  ]},
];

// Enlaces que abren otra página, debajo del menú.
const SIDE_LINKS = [
  { to: "/panel-medico/storefront", label: "Mi página pública", icon: Globe },
];

export default function DoctorPanel() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading | ready | no-profile | wrong-role
  const [specialistId, setSpecialistId] = useState(null);
  const { form, setForm, formRef, update, buildData } = useSpecialistForm({ stripFields: DOCTOR_RESTRICTED_FIELDS });
  const originalContactRef = useRef({ email: "", whatsapp: "" });
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [section, setSection] = useState("resumen");
  const [completenessChecklist, setCompletenessChecklist] = useState(null);
  // Modo "paso a paso": recorre, una por una, las pantallas de lo que le falta
  // al médico. { steps: [{ target, labels, keys }], index } o null.
  const [guided, setGuided] = useState(null);
  const [showWelcomeTour, setShowWelcomeTour] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const recalcScoreShared = useRecalculateScore(setForm);
  const { notifications, unread, unreadBySection, markRead } = useDoctorNotifications(specialistId);

  const recalculateScore = async (idOverride) => {
    const id = idOverride || specialistId;
    if (!id) return;
    const checklist = await recalcScoreShared(id);
    if (checklist) setCompletenessChecklist(checklist);
  };

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
      originalContactRef.current = { email: specialist.email || "", whatsapp: specialist.whatsapp || "" };
      setForm({
        ...EMPTY_SPECIALIST_FORM,
        ...specialist,
        services: specialist.services || [],
        insurers_relation: specialist.insurers_relation || [],
        conditions_relation: specialist.conditions_relation || [],
        gallery: specialist.gallery || [],
      });
      setStatus("ready");
      if (!specialist.has_seen_welcome_tour) setShowWelcomeTour(true);
      // Calcula el porcentaje y la lista de "Llena tu perfil" desde el primer momento, no solo tras guardar.
      recalculateScore(specialist.id);
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileNavOpen]);

  useAutoSaveSpecialist({
    enabled: status === "ready",
    specialistId,
    formRef,
    buildData,
    contactRef: originalContactRef,
    onSaved: () => { setLastSaved(new Date()); recalculateScore(); },
  });

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      await base44.entities.Specialist.update(specialistId, buildData(formRef.current));
      trackContactChanges(originalContactRef, formRef.current, { specialistId });
      toast.success("Cambios guardados");
      recalculateScore();
      setLastSaved(new Date());
    } catch (e) {
      toast.error("Error al guardar: " + e.message);
    }
    setSaving(false);
  };

  // Junta lo pendiente de "Llena tu perfil" por pantalla (varios puntos viven
  // en la misma, como foto y presentación) y arranca el paso a paso.
  const startGuided = () => {
    if (!completenessChecklist) { setSection("completar"); return; }
    const steps = [];
    for (const item of PROFILE_CHECKLIST_ITEMS) {
      if (completenessChecklist[item.key]) continue;
      const existing = steps.find((st) => st.target === item.target);
      if (existing) { existing.labels.push(item.label); existing.keys.push(item.key); }
      else steps.push({ target: item.target, labels: [item.label], keys: [item.key] });
    }
    if (steps.length === 0) { toast.success("¡Tu perfil ya está completo!"); return; }
    setGuided({ steps, index: 0 });
    setSection(steps[0].target);
  };

  const goGuided = async (nextIndex) => {
    await handleSaveChanges();
    if (nextIndex >= guided.steps.length) {
      setGuided(null);
      setSection("completar");
      return;
    }
    setGuided({ ...guided, index: nextIndex });
    setSection(guided.steps[nextIndex].target);
  };

  // Si el médico se va a otra pantalla desde el menú, se sale del paso a paso.
  useEffect(() => {
    if (guided && section !== guided.steps[guided.index].target) setGuided(null);
  }, [section, guided]);

  const joinLabels = (labels) =>
    labels.map((l, i) => (i === 0 ? l : l.charAt(0).toLowerCase() + l.slice(1))).join(" y ");

  // Se guarda directo en la base de datos para que quede marcado de
  // inmediato, sin depender de que el doctor llegue a guardar cambios en
  // algún otro momento -- pero TAMBIÉN hay que actualizar el form local
  // (update), porque el autoguardado de useAutoSaveSpecialist manda el
  // form COMPLETO cada 30s (buildData hace spread de todos los campos) --
  // si no se actualiza aquí, ese autoguardado reescribe el campo de vuelta
  // a `false` en cuanto corre, y el popup vuelve a aparecer la próxima vez.
  const finishWelcomeTour = async (goToChecklist = true) => {
    setShowWelcomeTour(false);
    if (goToChecklist) startGuided();
    update("has_seen_welcome_tour", true);
    try {
      await base44.entities.Specialist.update(specialistId, { has_seen_welcome_tour: true });
    } catch {
      // Silencioso: en el peor caso vuelve a aparecer la próxima vez, no es grave.
    }
  };

  // Abrir un aviso: se marca como leído y lleva a la pantalla donde se atiende.
  const openNotification = (n) => {
    if (!n.read_at) markRead([n.id]);
    setSection(n.section || "resumen");
  };

  // Al entrar a una pantalla que tiene avisos propios (citas, reseñas, documentos),
  // esos avisos se marcan como leídos: ya los está viendo.
  useEffect(() => {
    if (!["solicitudes", "resenas", "documentos"].includes(section)) return;
    const ids = unread.filter((n) => n.section === section).map((n) => n.id);
    if (ids.length > 0) markRead(ids);
  }, [section, notifications]);

  // Menú (mismos elementos en escritorio y en el menú de celular).
  const isActive = (key) => section === key || (key === "mi-perfil" && PROFILE_SUB_KEYS.includes(section));
  const renderNavGroups = (afterPick) => SECTION_GROUPS.map((g) => (
    <div key={g.group} className="flex flex-col gap-0.5 mb-3">
      <p className="text-[10px] font-heading font-semibold uppercase tracking-wide px-3 mb-1 text-white/40">{g.group}</p>
      {g.items.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => { setSection(s.key); afterPick?.(); }}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors ${
            isActive(s.key) ? "bg-brand-blue text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
          }`}
        >
          <s.icon className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{s.label}</span>
          {unreadBySection[s.key] > 0 && !isActive(s.key) && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {unreadBySection[s.key] > 9 ? "9+" : unreadBySection[s.key]}
            </span>
          )}
        </button>
      ))}
    </div>
  ));

  // Botón "Ajustes" (cuenta, correos y ayuda), debajo del menú.
  const renderSettingsButton = (afterPick) => (
    <button
      type="button"
      onClick={() => { setSection("ajustes"); afterPick?.(); }}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors ${
        section === "ajustes" ? "bg-brand-blue text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Settings className="w-4 h-4 flex-shrink-0" />
      Ajustes
    </button>
  );

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
          <button
            type="button"
            onClick={() => base44.auth.logout(false).then(() => navigate("/"))}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Salir del panel
          </button>
        </div>
      </aside>
      <div className="flex-1 min-w-0 min-h-screen">
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
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
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

  // ---- Panel listo: la barra lateral incluye TODA la navegación ----
  return (
    <div className="min-h-screen bg-background flex">
      <WelcomeTourModal open={showWelcomeTour} name={form.full_name} onFinish={finishWelcomeTour} />

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
              <span className="font-medium text-white/50">Tu perfil está completo al</span>
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

        <nav className="flex-1 p-3 overflow-y-auto">{renderNavGroups()}</nav>

        <div className="px-3 pb-2 space-y-0.5">
          {renderSettingsButton()}
          {SIDE_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors">
              <l.icon className="w-4 h-4 flex-shrink-0" />
              {l.label}
            </Link>
          ))}
          <a href={supportWhatsAppLink()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-emerald-300 hover:bg-white/5 hover:text-emerald-200 transition-colors">
            <MessageCircle className="w-4 h-4 flex-shrink-0" />
            ¿Necesitas ayuda? Escríbenos
          </a>
        </div>

        <div className="p-3 border-t border-white/10">
          <button
            type="button"
            onClick={() => base44.auth.logout(false).then(() => navigate("/"))}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Salir del panel
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 min-h-screen">
        {/* Barra superior en móvil: título + botón de hamburguesa que despliega el mismo menú lateral que en escritorio */}
        <div className="lg:hidden sticky top-0 z-40 bg-brand-navy px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-white/70">
            <ArrowLeft className="w-4 h-4" />
            Sitio
          </Link>
          <h2 className="font-heading font-bold text-white">Panel de Médico</h2>
          <div className="flex items-center -mr-2">
            <NotificationBell
              tone="dark"
              notifications={notifications}
              unread={unread}
              onOpenItem={openNotification}
              onMarkAllRead={() => markRead()}
              onViewAll={() => setSection("notificaciones")}
            />
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Abrir menú"
              className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Menú lateral en móvil: mismas secciones que la barra lateral de escritorio */}
        <div
          className={`lg:hidden fixed inset-0 z-[60] bg-brand-navy flex flex-col transform transition-transform duration-300 ease-in-out will-change-transform ${
            mobileNavOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
          }`}
          aria-hidden={!mobileNavOpen}
        >
          <div className="p-5 border-b border-white/10 flex items-start justify-between flex-shrink-0">
            <div>
              <Link to="/" className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors mb-4" onClick={() => setMobileNavOpen(false)}>
                <ArrowLeft className="w-4 h-4" />
                Volver al sitio
              </Link>
              <h2 className="font-heading font-bold text-lg text-white">Panel de Médico</h2>
              <p className="text-xs text-white/50 mt-1">Administra tu perfil en BuscoUnDoctor.</p>
            </div>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Cerrar menú"
              className="p-2 -mt-2 -mr-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-5 pt-4 flex-shrink-0">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-medium text-white/50">Tu perfil está completo al</span>
              <span className={`font-semibold ${completitud >= 80 ? "text-emerald-400" : completitud >= 50 ? "text-amber-400" : "text-red-400"}`}>{completitud}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${completitud >= 80 ? "bg-emerald-400" : completitud >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                style={{ width: `${completitud}%` }}
              />
            </div>
          </div>

          <nav className="flex-1 p-3 overflow-y-auto">{renderNavGroups(() => setMobileNavOpen(false))}</nav>

          <div className="px-3 pb-2 space-y-0.5 flex-shrink-0">
            {renderSettingsButton(() => setMobileNavOpen(false))}
            {SIDE_LINKS.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setMobileNavOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors">
                <l.icon className="w-4 h-4 flex-shrink-0" />
                {l.label}
              </Link>
            ))}
            <a href={supportWhatsAppLink()} target="_blank" rel="noopener noreferrer" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-emerald-300 hover:bg-white/5 hover:text-emerald-200 transition-colors">
              <MessageCircle className="w-4 h-4 flex-shrink-0" />
              ¿Necesitas ayuda? Escríbenos
            </a>
          </div>

          <div className="p-3 border-t border-white/10 flex-shrink-0">
            <button
              type="button"
              onClick={() => base44.auth.logout(false).then(() => navigate("/"))}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Salir del panel
            </button>
          </div>
        </div>

        <div className={`p-4 sm:p-6 lg:p-8 ${guided ? "pb-36" : ""}`}>
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
                <div className="hidden lg:block">
                  <NotificationBell
                    notifications={notifications}
                    unread={unread}
                    onOpenItem={openNotification}
                    onMarkAllRead={() => markRead()}
                    onViewAll={() => setSection("notificaciones")}
                  />
                </div>
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

            {section === "resumen" && <DoctorDashboardHome specialist={{ ...form, id: specialistId }} isOwnProfile={true} onNavigate={setSection} checklist={completenessChecklist} onStatusChange={(fields) => Object.entries(fields).forEach(([k, v]) => update(k, v))} />}
            {section === "notificaciones" && (
              <DoctorNotifications notifications={notifications} unread={unread} onOpenItem={openNotification} onMarkAllRead={() => markRead()} />
            )}
            {section === "ajustes" && (
              <DoctorSettings specialist={{ ...form, id: specialistId }} onStatusChange={(fields) => Object.entries(fields).forEach(([k, v]) => update(k, v))} />
            )}
            {section === "mi-perfil" && <ProfileHub checklist={completenessChecklist} onNavigate={setSection} />}
            {PROFILE_SUB_KEYS.includes(section) && !guided && (
              <button type="button" onClick={() => setSection("mi-perfil")} className="flex items-center gap-1 text-sm font-medium text-brand-blue hover:underline mb-4 min-h-[44px]">
                <ChevronLeft className="w-4 h-4" />
                Volver a Mi perfil
              </button>
            )}
            {section === "completar" && <ProfileChecklist score={form.completeness_score || 0} checklist={completenessChecklist} onNavigate={setSection} onStartGuided={startGuided} />}
            {section === "perfil" && <DoctorEditorPerfil form={form} update={update} simple />}
            {section === "plan" && <DoctorPremiumStatus specialistId={specialistId} specialistName={form.full_name} />}
            {section === "solicitudes" && <DoctorAppointmentRequests specialistId={specialistId} />}
            {section === "resenas" && <DoctorReviews specialistId={specialistId} />}
            {section === "detalles" && <DoctorDetailsManager form={form} update={update} specialistId={specialistId} />}
            {section === "formacion" && <EducationManager specialistId={specialistId} />}
            {section === "idiomas" && <LanguagesManager specialistId={specialistId} />}
            {section === "consultorios" && <OfficeManager specialistId={specialistId} />}
            {section === "aseguradoras" && <InsurersManager form={form} update={update} />}
            {section === "enfermedades" && <ConditionsManager form={form} update={update} />}
            {section === "subespecialidades" && <SubspecialtiesManager form={form} update={update} />}
            {section === "tecnologia" && <HighlightsManager specialistId={specialistId} />}
            {section === "documentos" && <DocumentManager specialistId={specialistId} />}
            {section === "casos" && <CasesManager specialistId={specialistId} />}
            {section === "publicaciones" && <PostsManager specialistId={specialistId} />}
            {section === "blog" && <DoctorBlogSubmit specialistId={specialistId} specialistName={form.full_name} specialty={form.specialty} />}
          </div>
        </div>

        {guided && (() => {
          const step = guided.steps[guided.index];
          return (
            <GuidedStepBar
              stepNumber={guided.index + 1}
              total={guided.steps.length}
              title={joinLabels(step.labels)}
              done={step.keys.every((k) => completenessChecklist?.[k])}
              isLast={guided.index === guided.steps.length - 1}
              onBack={() => goGuided(guided.index - 1)}
              onNext={() => goGuided(guided.index + 1)}
              onExit={() => setGuided(null)}
            />
          );
        })()}
      </div>
    </div>
  );
}