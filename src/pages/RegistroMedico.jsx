import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Lock, CheckCircle2, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import GoogleIcon from "@/components/icons/GoogleIcon";
import MicrosoftIcon from "@/components/icons/MicrosoftIcon";
import { supabaseUrl, supabaseAnonKey } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { generateSlug } from "@/api/specialistForm";
import { fileToWebP } from "@/lib/fileToWebP";
import { EMPTY_REGISTRO_DATA } from "@/lib/registroDefaults";
import { buildPlaceMapsUrl } from "@/lib/googleMaps";
import { resolveOfficeCoords } from "@/lib/officeGeo";
import Logo from "@/components/Logo";
import StepShell from "@/components/registro/StepShell";
import StepDatos from "@/components/registro/StepDatos";
import StepUbicacion from "@/components/registro/StepUbicacion";
import StepFotos from "@/components/registro/StepFotos";

const PENDING_KEY = "buscoundoctor_pending_registro";
const DRAFT_ID_KEY = "buscoundoctor_draft_specialist_id";
// Misma clave que escribe LandingMedicos.jsx (página /para-medicos) cuando
// alguien llena el paso 1 embebido ahí y da clic en "Continuar".
const LANDING_PREFILL_KEY = "buscoundoctor_landing_prefill";

const STEP_KEYS = ["datos", "ubicacion", "fotos", "cuenta"];

const EMPTY_DATA = EMPTY_REGISTRO_DATA;

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
  // "google" | "microsoft" | "" -- cuál de los dos botones está en curso,
  // para deshabilitar ambos y mostrar su propio spinner mientras se abre
  // la ventana del proveedor.
  const [oauthLoading, setOauthLoading] = useState("");
  // Qué botones de "Continuar con..." mostrar. Empieza en todo apagado
  // (comportamiento de hoy, sin cambio visible) y se prende solo si
  // Supabase confirma que esa llave ya está configurada -- ver el useEffect
  // de abajo. Así el botón puede quedar ya construido en el código sin
  // arriesgarse a que un doctor real lo vea antes de que funcione de verdad.
  const [oauthProviders, setOauthProviders] = useState({ google: false, microsoft: false });

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

  // ¿Ya están dadas de alta las llaves de Google/Microsoft en Supabase? Sin
  // esto, un doctor que le diera clic a un botón "Continuar con Google" sin
  // configurar caería en una pantalla de error en inglés de Supabase, fea y
  // confusa. Este endpoint es público (no necesita sesión) y ya lo expone
  // Supabase para exactamente este uso. Falla en silencio (se queda todo
  // apagado, como hoy) si no se puede consultar.
  useEffect(() => {
    let active = true;
    fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: supabaseAnonKey } })
      .then((r) => r.json())
      .then((settings) => {
        if (!active) return;
        setOauthProviders({
          google: !!settings?.external?.google,
          microsoft: !!settings?.external?.azure,
        });
      })
      .catch(() => {});
    return () => { active = false; };
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

  // Enlace de invitación de un colega: /registro-medico?ref=CODIGO precarga
  // el código para que no tenga que teclearlo (StepDatos igual lo valida y
  // lo puede editar a mano).
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) setData((prev) => (prev.referral_code ? prev : { ...prev, referral_code: ref.toUpperCase() }));
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
        email: payload.email,
        specialty: payload.specialty,
        subspecialty: payload.subspecialty,
        subspecialties_relation: payload.subspecialties_relation,
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
  // Crea el consultorio principal con la dirección del wizard, para que el
  // médico aparezca en el mapa desde el primer día. Es best-effort: si falla,
  // el registro sigue y el médico puede agregarlo desde su panel.
  const createOfficeFromData = async (specialistId, finalData) => {
    try {
      const zones = await base44.entities.Zone.list().catch(() => []);
      const zone = zones.find((z) => z.name === finalData.zone);
      const line = [
        [finalData.address_street, finalData.address_ext_number].filter(Boolean).join(" "),
        finalData.address_int_number && `Int. ${finalData.address_int_number}`,
        finalData.address_floor && `Piso ${finalData.address_floor}`,
        finalData.address_neighborhood && `Col. ${finalData.address_neighborhood}`,
        finalData.address_postal_code && `CP ${finalData.address_postal_code}`,
      ].filter(Boolean).join(", ");
      if (!line) return;

      const office = {
        specialist_id: specialistId,
        zone_id: zone?.id || null,
        address_line: line,
        is_primary: true,
      };
      if (finalData.address_lat != null && finalData.address_lng != null) {
        office.latitude = finalData.address_lat;
        office.longitude = finalData.address_lng;
        office.maps_url = buildPlaceMapsUrl({
          latitude: finalData.address_lat,
          longitude: finalData.address_lng,
          place_id: finalData.address_place_id,
        });
      } else {
        // Captura manual: se intenta ubicar la dirección al guardar.
        const coords = await resolveOfficeCoords(office, { zoneName: zone?.name, city: zone?.city, state: zone?.state });
        if (coords) { office.latitude = coords.latitude; office.longitude = coords.longitude; }
      }
      await base44.entities.Office.create(office);
    } catch (err) {
      console.warn("No se pudo crear el consultorio del registro:", err);
    }
  };

  const createProfileFromData = async (finalData) => {
    const res = await base44.functions.invoke("createDoctorProfile", {
      full_name: `${finalData.title} ${finalData.full_name.trim()}`.trim(),
      specialty: finalData.specialty,
      subspecialty: finalData.subspecialty,
      subspecialties_relation: finalData.subspecialties_relation,
      whatsapp: finalData.whatsapp,
      professional_license_number: finalData.cedula,
      modality: finalData.modality,
      zone: finalData.zone,
      referral_code: finalData.referral_code || undefined,
      draft_id: finalData.draft_id || draftId || undefined,
    });
    const created = res?.data;
    if (created?.specialist?.id && !created.already_existed) {
      await createOfficeFromData(created.specialist.id, finalData);
    }
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
        // Enlace de "Continuar registro" de un correo de recuperaci\u00f3n
        // (?draft=ID): rellena el formulario con lo que ya hab\u00eda escrito y
        // lo manda directo al paso donde se qued\u00f3, en vez de arrancar en
        // blanco. Si el id ya no existe o ya tiene cuenta, sigue igual que
        // siempre (formulario vac\u00edo) -- nunca bloquea el registro.
        const draftParam = new URLSearchParams(window.location.search).get("draft");
        if (draftParam) {
          try {
            const res = await base44.functions.invoke("getRegistrationDraft", { draft_id: draftParam });
            const draft = res?.data;
            if (active && draft?.id) {
              setData((prev) => ({
                ...prev,
                ...draft,
                subspecialties_relation: draft.subspecialties_relation || [],
                gallery: draft.gallery || [],
              }));
              setDraftId(draft.id);
              localStorage.setItem(DRAFT_ID_KEY, draft.id);
              const resumeIndex = STEP_KEYS.indexOf(draft.registration_step);
              setStepIndex(resumeIndex >= 0 ? Math.min(resumeIndex + 1, STEP_KEYS.length - 1) : 0);
            }
          } catch {
            // Silencioso: si falla, el registro sigue como si no hubiera venido de un enlace.
          }
        }
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
        let pending = null;
        try {
          pending = JSON.parse(pendingRaw);
          await createProfileFromData(pending);
          localStorage.removeItem(PENDING_KEY);
          if (active) setPhase("done");
        } catch (err) {
          localStorage.removeItem(PENDING_KEY);
          if (active) {
            // No perder lo que ya había llenado: si algo truena al crear el
            // perfil justo al volver de Google/Microsoft (ej. cédula
            // duplicada), regresa al último paso con todo relleno en vez de
            // mandarlo a un formulario en blanco.
            if (pending) setData((prev) => ({ ...prev, ...pending }));
            setStepIndex(STEP_KEYS.length - 1);
            setError(err.message || "No se pudo crear tu perfil.");
            setPhase("wizard");
          }
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
      if (!/^\S+@\S+\.\S+$/.test(data.email.trim())) return "Ingresa un correo electrónico válido";
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

  // Arranca el inicio de sesión con Google o Microsoft en el último paso del
  // registro. A diferencia del camino de correo+contraseña, aquí el
  // navegador se va al proveedor y regresa a esta misma página ya
  // autenticado -- por eso hay que guardar lo que se llevaba capturado en
  // localStorage (PENDING_KEY) antes de salir, para que el efecto de arriba
  // ("¿ya venimos autenticados?") lo recoja al volver y cree el perfil solo,
  // sin pedir nada de nuevo. Nunca hace falta correo/contraseña ni el paso
  // del código de verificación: Google/Microsoft ya confirmaron el correo.
  const startOAuth = async (provider) => {
    setError("");
    setOauthLoading(provider);
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify(data));
      await base44.auth.loginWithProvider(provider, `${window.location.origin}/registro-medico`);
    } catch (err) {
      localStorage.removeItem(PENDING_KEY);
      setError(err.message || `No se pudo continuar con ${provider === "google" ? "Google" : "Microsoft"}`);
      setOauthLoading("");
    }
  };

  const handleProfilePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const slug = generateSlug(data.full_name) || "doctor";
      const webpFile = await fileToWebP(file, `${slug}-foto-perfil.webp`);
      // Este paso del wizard va ANTES de crear la cuenta (datos -> ubicacion
      // -> fotos -> cuenta), así que todavía no hay sesión ni auth.uid().
      // "pending-registro" es una carpeta fija habilitada para subir sin
      // sesión -- ver migración allow_anon_photo_upload_during_registration.
      const { file_url } = await base44.integrations.Core.UploadFile({ file: webpFile, folder: "pending-registro" });
      update("profile_photo", file_url);
    } catch (err) { console.error(err); toast.error("Error al subir la foto"); }
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
      const urls = await Promise.all(webpFiles.map((f) => base44.integrations.Core.UploadFile({ file: f, folder: "pending-registro" }).then((r) => r.file_url)));
      update("gallery", [...(data.gallery || []), ...urls]);
    } catch (err) { console.error(err); toast.error("Error al subir las fotos"); }
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
                {oauthProviders.google && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => startOAuth("google")}
                    disabled={!!oauthLoading}
                    className="sm:col-span-2 w-full min-h-[44px] rounded-xl gap-2.5 bg-white hover:bg-muted/40"
                  >
                    {oauthLoading === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
                    Continuar con Google
                  </Button>
                )}
                {oauthProviders.microsoft && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => startOAuth("microsoft")}
                    disabled={!!oauthLoading}
                    className="sm:col-span-2 w-full min-h-[44px] rounded-xl gap-2.5 bg-white hover:bg-muted/40"
                  >
                    {oauthLoading === "microsoft" ? <Loader2 className="w-4 h-4 animate-spin" /> : <MicrosoftIcon />}
                    Continuar con Microsoft
                  </Button>
                )}
                {(oauthProviders.google || oauthProviders.microsoft) && (
                  <div className="sm:col-span-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="h-px flex-1 bg-border" /> o <div className="h-px flex-1 bg-border" />
                  </div>
                )}
                <Button
                  type="button"
                  onClick={() => {
                    // Precarga el correo que ya dio en el paso 1 -- no tiene
                    // que volver a escribirlo, y así el aviso de recuperación
                    // (si abandona) y el correo de acceso terminan siendo el
                    // mismo en la mayoría de los casos.
                    setEmailForm((f) => ({ ...f, email: f.email || data.email }));
                    setPhase("email-form");
                  }}
                  disabled={!!oauthLoading}
                  className="sm:col-span-2 w-full min-h-[44px] rounded-xl"
                >
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
                Ingresa el código de verificación que enviamos a <span className="font-medium text-foreground">{emailForm.email}</span>
              </p>
            </div>
            {/* Sin maxLength fijo: Supabase genera el código con la longitud
                que tenga configurada (hoy 8 dígitos, no los 6 "de siempre"),
                y cortar el valor capturado rompía la verificación porque el
                código que el usuario veía nunca coincidía con el real. */}
            <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Código de verificación" className="rounded-xl text-center tracking-widest text-lg" />
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
            <div className="bg-accent/40 border border-accent rounded-2xl p-4 text-left">
              <p className="text-sm font-medium text-foreground flex items-center gap-2 mb-2.5">
                <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                Esto apenas empieza — aún te falta subir:
              </p>
              <ul className="text-sm text-foreground space-y-1.5 mb-3">
                {[
                  "Formación académica",
                  "Documentos y cédula profesional",
                  "Más servicios y precios",
                  "Idiomas y aseguradoras que aceptas",
                  "Publicaciones y casos de éxito",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Un perfil completo les genera más confianza a tus pacientes. En tu panel, entra a "Llena tu perfil" para ver exactamente qué te falta.
              </p>
            </div>
            <Button onClick={() => navigate("/panel-medico")} className="min-h-[44px] rounded-xl">
              Terminar mi perfil
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
