import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Lock, User, CheckCircle2, ArrowLeft, ArrowRight, Camera, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import { generateSlug } from "@/api/specialistForm";
import Logo from "@/components/Logo";
import StepShell from "@/components/registro/StepShell";
import StepDatos from "@/components/registro/StepDatos";
import StepUbicacion from "@/components/registro/StepUbicacion";
import StepFotos from "@/components/registro/StepFotos";

// Convierte una imagen a WebP (más liviana) y la renombra antes de subirla,
// usando canvas en el navegador. Si algo falla (formato no soportado, etc.),
// se sube el archivo original tal cual en vez de bloquear el registro.
function fileToWebP(file, filename) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const maxDim = 1600;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) { resolve(file); return; }
        resolve(new File([blob], filename, { type: "image/webp" }));
      }, "image/webp", 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

const PENDING_KEY = "buscoundoctor_pending_registro";
const DRAFT_ID_KEY = "buscoundoctor_draft_specialist_id";
// Misma clave que escribe LandingMedicos.jsx (página /para-medicos) cuando
// alguien llena el paso 1 embebido ahí y da clic en "Continuar".
const LANDING_PREFILL_KEY = "buscoundoctor_landing_prefill";

function GoogleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.87-3c-1.08.72-2.46 1.15-4.08 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38l4-3.1z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.62l4 3.1c.95-2.85 3.6-4.97 6.73-4.97z" />
    </svg>
  );
}

const STEP_KEYS = ["datos", "ubicacion", "fotos", "cuenta"];

const EMPTY_DATA = {
  title: "",
  full_name: "",
  whatsapp: "",
  specialty: "",
  subspecialty: "",
  cedula: "",
  years_experience: "",
  service_price: "",
  modality: "presencial",
  zone: "",
  address_street: "",
  address_neighborhood: "",
  address_ext_number: "",
  address_int_number: "",
  address_floor: "",
  address_postal_code: "",
  profile_photo: "",
  gallery: [],
};

// StepShell y los pasos "datos"/"ubicacion"/"fotos" vivían aquí antes, en
// línea. Se movieron a src/components/registro/ para que
// AdminVistaRegistro.jsx (vista de previsualización del admin) los importe
// del mismo lugar y se mantengan en sync solos: cualquier cambio a un paso
// se ve reflejado en ambos lados sin tocar nada aparte.
export default function RegistroMedico() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("loading"); // loading | wizard | email-form | otp | done
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState(EMPTY_DATA);
  const [emailForm, setEmailForm] = useState({ email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [specialties, setSpecialties] = useState([]);
  const [zones, setZones] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  // Id del perfil Specialist en borrador que se va guardando paso a paso,
  // antes incluso de que exista una cuenta. Persistido en localStorage para
  // sobrevivir el redirect de Google OAuth y recargas de página.
  const [draftId, setDraftId] = useState(() => localStorage.getItem(DRAFT_ID_KEY) || "");

  useEffect(() => {
    Promise.all([
      base44.entities.Specialty.filter({ active: true }).catch(() => []),
      base44.entities.Zone.filter({ active: true }).catch(() => []),
    ]).then(([specs, zoneList]) => {
      setSpecialties([...specs].sort((a, b) => a.name.localeCompare(b.name, "es")));
      setZones([...zoneList].sort((a, b) => a.name.localeCompare(b.name, "es")));
    });
  }, []);

  // Si viene de la landing "/para-medicos" con lo básico ya lleno (título,
  // nombre, WhatsApp y especialidad), lo precarga aquí. Se queda en el paso 1
  // (datos) porque aún faltan campos de ese mismo paso (cédula, precio, etc.)
  // que la landing no pide, para no hacerlo escribir su nombre dos veces.
  useEffect(() => {
    const raw = localStorage.getItem(LANDING_PREFILL_KEY);
    if (!raw) return;
    localStorage.removeItem(LANDING_PREFILL_KEY);
    try {
      const prefill = JSON.parse(raw);
      setData((prev) => ({ ...prev, ...prefill }));
    } catch {}
  }, []);

  const update = (field, value) => setData((prev) => ({ ...prev, [field]: value }));

  // Autoguardado progresivo: se llama al avanzar cada paso del wizard, antes
  // de que exista cuenta. Crea (o actualiza) un perfil Specialist en borrador
  // para que el registro quede visible en el panel de admin aunque la
  // persona abandone antes de terminar. Es best-effort: si falla, no bloquea
  // el avance del wizard.
  const saveProgress = async (stepJustCompleted, dataOverride) => {
    const payload = dataOverride || data;
    try {
      const res = await base44.functions.invoke("saveRegistrationDraft", {
        draft_id: draftId || undefined,
        title: payload.title,
        full_name: payload.full_name,
        whatsapp: payload.whatsapp,
        specialty: payload.specialty,
        subspecialty: payload.subspecialty,
        cedula: payload.cedula,
        years_experience: payload.years_experience,
        service_price: payload.service_price,
        modality: payload.modality,
        zone: payload.zone,
        address_street: payload.address_street,
        address_neighborhood: payload.address_neighborhood,
        address_ext_number: payload.address_ext_number,
        address_int_number: payload.address_int_number,
        address_floor: payload.address_floor,
        address_postal_code: payload.address_postal_code,
        profile_photo: payload.profile_photo,
        gallery: payload.gallery,
        step: stepJustCompleted,
      });
      const newId = res?.data?.id || res?.id;
      if (newId && newId !== draftId) {
        setDraftId(newId);
        localStorage.setItem(DRAFT_ID_KEY, newId);
      }
    } catch {
      // Autoguardado silencioso: un fallo aquí no debe interrumpir el registro.
    }
  };

  // Crea el perfil (Specialist) con toda la información recabada en el wizard
  // -o reclama el borrador que ya se había ido guardando paso a paso- y
  // marca el rol del usuario como "doctor".
  const createProfileFromData = async (finalData) => {
    await base44.functions.invoke("createDoctorProfile", {
      full_name: `${finalData.title} ${finalData.full_name.trim()}`.trim(),
      specialty: finalData.specialty,
      subspecialty: finalData.subspecialty,
      whatsapp: finalData.whatsapp,
      professional_license_number: finalData.cedula,
      modality: finalData.modality,
      zone: finalData.zone,
      draft_id: finalData.draft_id || draftId || undefined,
    });
    try { await base44.auth.updateMe({ role: "doctor" }); } catch {}
    localStorage.removeItem(DRAFT_ID_KEY);
  };

  // Al cargar: si ya viene autenticado (regres\u00f3 de Google), usa los datos guardados
  // en localStorage para crear el perfil de inmediato, sin volver a pedir nada.
  useEffect(() => {
    let active = true;
    (async () => {
      const isAuth = await base44.auth.isAuthenticated().catch(() => false);
      if (!active) return;
      if (!isAuth) {
        setPhase("wizard");
        return;
      }
      const u = await base44.auth.me().catch(() => null);
      if (!active || !u) { setPhase("wizard"); return; }

      const own = await base44.entities.Specialist.filter({ owner_user_id: u.id }).catch(() => []);
      if (!active) return;
      if (own.length > 0) {
        navigate("/panel-medico", { replace: true });
        return;
      }

      const pendingRaw = localStorage.getItem(PENDING_KEY);
      if (pendingRaw) {
        try {
          const pending = JSON.parse(pendingRaw);
          await createProfileFromData(pending);
          localStorage.removeItem(PENDING_KEY);
          if (active) setPhase("done");
        } catch (err) {
          localStorage.removeItem(PENDING_KEY);
          if (active) { setError(err.message || "No se pudo crear tu perfil."); setPhase("wizard"); }
        }
        return;
      }

      // Autenticado pero sin datos guardados (caso raro, ej. enlace directo):
      // arranca el wizard con lo que Google ya sabe.
      setData((prev) => ({ ...prev, full_name: u.full_name || prev.full_name }));
      setPhase("wizard");
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const stepKey = STEP_KEYS[stepIndex];

  const validateStep = () => {
    if (stepKey === "datos") {
      if (!data.title) return "Selecciona Dr. o Dra.";
      if (!data.full_name.trim()) return "Escribe tu nombre completo";
      if (data.whatsapp.replace(/\D/g, "").length < 10) return "Ingresa un número de WhatsApp válido (10 dígitos)";
      if (!data.specialty.trim()) return "Selecciona o escribe tu especialidad";
      if (!data.cedula.trim()) return "Ingresa tu número de cédula profesional";
      if (!data.service_price || Number(data.service_price) <= 0) return "Ingresa el precio de tu consulta de primera vez";
    }
    if (stepKey === "ubicacion") {
      if (!data.zone) return "Selecciona tu ciudad";
      if (!data.address_street.trim()) return "Escribe el nombre de la calle";
      if (!data.address_ext_number.trim()) return "Escribe el número exterior";
      if (!data.address_neighborhood.trim()) return "Escribe la colonia";
      if (!data.address_postal_code.trim()) return "Escribe el código postal";
    }
    return "";
  };

  const goNext = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError("");
    saveProgress(stepKey);
    setStepIndex((i) => Math.min(i + 1, STEP_KEYS.length - 1));
  };
  const goBack = () => {
    setError("");
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const continueWithGoogle = () => {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ ...data, draft_id: draftId || undefined }));
    base44.auth.loginWithProvider("google", window.location.href);
  };

  const submitEmailForm = async (e) => {
    e.preventDefault();
    setError("");
    if (!emailForm.email || !emailForm.password) { setError("Completa correo y contraseña"); return; }
    if (emailForm.password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres"); return; }
    setLoading(true);
    try {
      await base44.auth.register({ email: emailForm.email, password: emailForm.password });
      setPhase("otp");
    } catch (err) {
      setError(err.message || "No se pudo registrar la cuenta. ¿El correo ya está registrado?");
    }
    setLoading(false);
  };

  const submitOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (!otp) { setError("Ingresa el código de verificación"); return; }
    setLoading(true);
    try {
      await base44.auth.verifyOtp({ email: emailForm.email, otpCode: otp });
      await base44.auth.loginViaEmailPassword(emailForm.email, emailForm.password);
      await createProfileFromData(data);
      setPhase("done");
    } catch (err) {
      setError(err.message || "No se pudo verificar el código");
    }
    setLoading(false);
  };

  const handleProfilePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const slug = generateSlug(data.full_name) || "doctor";
      const webpFile = await fileToWebP(file, `${slug}-foto-perfil.webp`);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: webpFile });
      update("profile_photo", file_url);
    } catch { toast.error("Error al subir la foto"); }
    setUploadingPhoto(false);
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingGallery(true);
    try {
      const slug = generateSlug(data.full_name) || "doctor";
      const startIndex = (data.gallery || []).length;
      const webpFiles = await Promise.all(files.map((f, i) => fileToWebP(f, `${slug}-foto-${startIndex + i + 1}.webp`)));
      const urls = await Promise.all(webpFiles.map((f) => base44.integrations.Core.UploadFile({ file: f }).then((r) => r.file_url)));
      update("gallery", [...(data.gallery || []), ...urls]);
    } catch { toast.error("Error al subir las fotos"); }
    setUploadingGallery(false);
  };

  const progressPct = Math.round(((stepIndex + 1) / STEP_KEYS.length) * 100);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className={`w-full ${phase === "wizard" ? "max-w-md sm:max-w-xl lg:max-w-2xl" : "max-w-md"}`}>
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio
        </Link>

        {phase === "loading" && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {phase === "wizard" && (
          <div className="space-y-4">
            {/* Barra de progreso */}
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Paso {stepIndex + 1} de {STEP_KEYS.length}</span>
                <span>{progressPct}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div className="h-1.5 bg-brand-blue rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            {stepKey === "datos" && (
              <StepDatos data={data} update={update} error={error} specialties={specialties} />
            )}

            {stepKey === "ubicacion" && (
              <StepUbicacion data={data} update={update} error={error} zones={zones} />
            )}

            {stepKey === "fotos" && (
              <StepFotos
                data={data}
                update={update}
                error={error}
                uploadingPhoto={uploadingPhoto}
                uploadingGallery={uploadingGallery}
                handleProfilePhotoUpload={handleProfilePhotoUpload}
                handleGalleryUpload={handleGalleryUpload}
              />
            )}

            {stepKey === "cuenta" && (
              <StepShell title="Un último paso" subtitle="Crea tu cuenta para guardar tu perfil" error={error}>
                <Button type="button" onClick={continueWithGoogle} variant="outline" className="sm:col-span-2 w-full min-h-[44px] rounded-xl gap-2 border-border">
                  <GoogleIcon />
                  Continuar con Google
                </Button>
                <div className="sm:col-span-2 flex items-center gap-3 py-1">
                  <div className="h-px bg-border flex-1" />
                  <span className="text-xs text-muted-foreground">o con tu correo</span>
                  <div className="h-px bg-border flex-1" />
                </div>
                <Button type="button" onClick={() => setPhase("email-form")} className="sm:col-span-2 w-full min-h-[44px] rounded-xl">
                  Registrarme con correo electrónico
                </Button>
                <Link to="/planes" className="sm:col-span-2 block text-center text-xs text-muted-foreground hover:text-foreground">
                  Ver planes y precios
                </Link>
              </StepShell>
            )}

            {/* Navegación entre pasos */}
            {stepKey !== "cuenta" && (
              <div className="flex items-center justify-between gap-3">
                <Button type="button" variant="ghost" onClick={goBack} disabled={stepIndex === 0} className="rounded-xl gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> Atrás
                </Button>
                <Button type="button" onClick={goNext} className="rounded-xl gap-1.5">
                  Siguiente <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
            {stepKey === "cuenta" && stepIndex > 0 && (
              <button type="button" onClick={goBack} className="text-xs text-muted-foreground hover:text-foreground w-full text-center">
                ← Volver a editar mis datos
              </button>
            )}
          </div>
        )}

        {phase === "email-form" && (
          <form onSubmit={submitEmailForm} className="bg-card border border-border/50 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="text-center mb-2">
              <Logo to="/" className="h-9 mx-auto mb-3" />
              <h1 className="font-heading font-bold text-xl text-foreground">Crea tu contraseña</h1>
              <p className="text-sm text-muted-foreground">Ya casi termina, {data.title} {data.full_name}</p>
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input type="email" value={emailForm.email} onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })} placeholder="Correo electrónico" className="rounded-xl pl-9" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input type="password" value={emailForm.password} onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })} placeholder="Contraseña (mín. 8 caracteres)" className="rounded-xl pl-9" />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full min-h-[44px] rounded-xl gap-1.5">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear cuenta
            </Button>
            <button type="button" onClick={() => setPhase("wizard")} className="text-xs text-muted-foreground hover:text-foreground w-full text-center">
              ← Volver
            </button>
          </form>
        )}

        {phase === "otp" && (
          <form onSubmit={submitOtp} className="bg-card border border-border/50 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="text-center mb-2">
              <Logo to="/" className="h-9 mx-auto mb-3" />
              <h1 className="font-heading font-bold text-xl text-foreground">Verifica tu correo</h1>
              <p className="text-sm text-muted-foreground">
                Ingresa el código de 6 dígitos que enviamos a <span className="font-medium text-foreground">{emailForm.email}</span>
              </p>
            </div>
            <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Código de verificación" className="rounded-xl text-center tracking-widest text-lg" maxLength={6} />
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full min-h-[44px] rounded-xl gap-1.5">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Verificar y crear perfil
            </Button>
          </form>
        )}

        {phase === "done" && (
          <div className="bg-card border border-border/50 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h1 className="font-heading font-bold text-xl text-foreground">¡Cuenta creada!</h1>
            <p className="text-sm text-muted-foreground">
              Tu perfil ya tiene tu información básica y va a pasar a revisión. Esto apenas empieza.
            </p>
            <div className="bg-accent/40 border border-accent rounded-2xl p-4 text-left flex gap-3">
              <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">
                Aún puedes dar de alta muchas cosas más: formación académica, documentos y cédula, más servicios y precios, idiomas, aseguradoras que aceptas, y hasta publicaciones y casos de éxito. Entre más completo esté tu perfil, más confianza le genera a tus pacientes — y mejor te posiciona Google. Revisa tu “Score de SEO” en el panel para ver exactamente qué te falta.
              </p>
            </div>
            <Button onClick={() => navigate("/panel-medico")} className="min-h-[44px] rounded-xl">
              Ir a mi panel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
