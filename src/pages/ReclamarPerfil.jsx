import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, Mail, CheckCircle2, BadgeCheck, MapPin, Stethoscope, ShieldCheck, Camera, AlertTriangle,
} from "lucide-react";
import Logo from "@/components/Logo";
import OAuthButtons from "@/components/OAuthButtons";
import useOAuthProviders from "@/hooks/useOAuthProviders";
import PasswordInput from "@/components/PasswordInput";
import PasswordChecklist from "@/components/PasswordChecklist";
import { checkPassword, passwordProblem } from "@/lib/passwordRules";
import { supportWhatsAppLink } from "@/components/DoctorSupportWhatsApp";
import { formErrorMessage } from "@/lib/formErrors";
import { notifyWelcome } from "@/api/doctorNotify";

// /reclamar/:token -- el doctor reclama un perfil que armó el equipo (CLAUDE.md §8o).
// El perfil es privado hasta que se reclama; el token del enlace es la única llave
// (y para perfiles con cédula, el doctor además debe escribirla completa).
const CLAIM_ERRORS = {
  cedula: "Esa cédula no coincide con la del perfil. Revísala e inténtalo de nuevo.",
  expired: "Este enlace ya venció. Escríbenos y te mandamos uno nuevo.",
  invalid: "Este enlace no es válido o el perfil ya fue reclamado.",
  demasiados_intentos: "Demasiados intentos con este enlace. Espera una hora o escríbenos por WhatsApp.",
  admin: "Esta cuenta es del equipo de BuscoUnDoctor. Entra con la cuenta personal del doctor.",
};

export default function ReclamarPerfil() {
  const { token } = useParams();
  const navigate = useNavigate();
  const oauthProviders = useOAuthProviders();
  const [phase, setPhase] = useState("loading"); // loading | bad | intro | email-form | otp | done
  const [badReason, setBadReason] = useState("invalid");
  const [preview, setPreview] = useState(null);
  const [signedIn, setSignedIn] = useState(false);
  const [emailForm, setEmailForm] = useState({ email: "", password: "" });
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [otp, setOtp] = useState("");
  const [cedula, setCedula] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState("");
  const [error, setError] = useState("");
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    document.title = "Reclama tu perfil | BuscoUnDoctor";
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) { robots = document.createElement("meta"); robots.setAttribute("name", "robots"); document.head.appendChild(robots); }
    robots.setAttribute("content", "noindex, nofollow");
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await base44.functions.invoke("getClaimPreview", { token });
        if (!active) return;
        if (!data?.ok) { setBadReason(data?.reason || "invalid"); setPhase("bad"); return; }
        setPreview(data);
        const authed = await base44.auth.isAuthenticated().catch(() => false);
        if (!active) return;
        setSignedIn(authed);
        setPhase("intro");
      } catch (err) {
        if (!active) return;
        setError(formErrorMessage(err, ""));
        setBadReason("invalid");
        setPhase("bad");
      }
    })();
    return () => { active = false; };
  }, [token]);

  const returnHere = `/reclamar/${token}`;

  const startOAuth = async (provider) => {
    setError("");
    setOauthLoading(provider);
    try {
      await base44.auth.loginWithProvider(provider, `${window.location.origin}${returnHere}`);
    } catch (err) {
      setError(err.message || "No se pudo continuar con ese proveedor.");
      setOauthLoading("");
    }
  };

  const submitEmailForm = async (e) => {
    e.preventDefault();
    setError("");
    if (!emailForm.email || !emailForm.password) { setError("Completa correo y contraseña"); return; }
    const problem = passwordProblem(emailForm.password, emailForm.email);
    if (problem) { setError(problem); return; }
    if (emailForm.password !== passwordConfirm) { setError("Las contraseñas no coinciden"); return; }
    setLoading(true);
    try {
      await base44.auth.register({ email: emailForm.email, password: emailForm.password });
      setPhase("otp");
    } catch (err) {
      setError(err.message || "No se pudo crear la cuenta. ¿El correo ya está registrado? Entra con \"Ya tengo cuenta\".");
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
      setSignedIn(true);
      setPhase("intro");
    } catch (err) {
      setError(err.message || "No se pudo verificar el código");
    }
    setLoading(false);
  };

  const claim = async () => {
    setError("");
    if (preview?.has_cedula && !cedula.trim()) { setError("Escribe tu cédula profesional para confirmar que eres tú."); return; }
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke("claimProfile", { token, cedula: cedula.trim() });
      if (!data?.ok) {
        if (data?.reason === "ya_tienes_perfil") setHasProfile(true);
        setError(CLAIM_ERRORS[data?.reason] || "No se pudo reclamar el perfil.");
        setLoading(false);
        return;
      }
      try { notifyWelcome(data.specialist); } catch { /* el aviso nunca debe estorbar */ }
      setPhase("done");
    } catch (err) {
      setError(formErrorMessage(err, "No se pudo reclamar el perfil. Intenta de nuevo o escríbenos por WhatsApp."));
    }
    setLoading(false);
  };

  const wa = supportWhatsAppLink("Hola, tengo una duda con el enlace para reclamar mi perfil en BuscoUnDoctor");
  const firstOffice = preview?.offices?.[0];
  const services = (preview?.services || []).filter((s) => s?.name).slice(0, 4);

  return (
    <div className="min-h-[100dvh] flex items-start sm:items-center justify-center px-4 py-8 bg-background">
      <div className="w-full max-w-md">
        {phase === "loading" && (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        )}

        {phase === "bad" && (
          <div className="bg-card border border-border/50 rounded-3xl p-7 shadow-sm text-center space-y-3">
            <Logo to="/" className="h-9 mx-auto mb-2" />
            <AlertTriangle className="w-9 h-9 text-amber-500 mx-auto" />
            <h1 className="font-heading font-bold text-xl text-foreground">
              {badReason === "expired" ? "Este enlace ya venció" : "Enlace no válido"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {badReason === "expired"
                ? "Por seguridad los enlaces duran 30 días. Escríbenos y te mandamos uno nuevo."
                : "El enlace está incompleto, ya se usó o fue reemplazado por uno nuevo. Si crees que es un error, escríbenos."}
            </p>
            <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-block">
              <Button variant="outline" className="rounded-xl min-h-[44px]">Escribir por WhatsApp</Button>
            </a>
          </div>
        )}

        {phase === "intro" && preview && (
          <div className="bg-card border border-border/50 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
            <div className="text-center">
              <Logo to="/" className="h-9 mx-auto mb-3" />
              <h1 className="font-heading font-bold text-xl text-foreground">Tu perfil ya está listo para ti</h1>
              <p className="text-sm text-muted-foreground mt-1">Lo armamos con tu información. Resérvalo con tu cuenta y complétalo cuando quieras.</p>
            </div>

            <div className="bg-muted/40 border border-border/50 rounded-2xl p-4 space-y-2">
              <p className="font-heading font-semibold text-foreground flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" /> {preview.full_name}
              </p>
              {preview.specialty && (
                <p className="text-sm text-muted-foreground flex items-center gap-2"><Stethoscope className="w-4 h-4 flex-shrink-0" /> {preview.specialty}</p>
              )}
              {firstOffice && (
                <p className="text-sm text-muted-foreground flex items-start gap-2">
                  <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="min-w-0">{[firstOffice.name, firstOffice.address_line, firstOffice.suite].filter(Boolean).join(" · ")}</span>
                </p>
              )}
              {services.length > 0 && (
                <ul className="text-xs text-muted-foreground pt-1 space-y-0.5">
                  {services.map((s, i) => (
                    <li key={i}>• {s.name}{s.price ? ` — $${Number(s.price).toLocaleString("es-MX")}` : ""}</li>
                  ))}
                </ul>
              )}
            </div>

            <p className="text-xs text-muted-foreground flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
              Tu perfil no es público todavía. Pasa a revisión de nuestro equipo cuando lo reclamas.
            </p>

            {!signedIn ? (
              <div className="grid gap-2.5">
                <OAuthButtons providers={oauthProviders} loadingProvider={oauthLoading} onSelect={startOAuth} withDivider />
                <Button onClick={() => { setError(""); setPhase("email-form"); }} className="w-full min-h-[44px] rounded-xl gap-1.5">
                  <Mail className="w-4 h-4" /> Crear mi cuenta con correo
                </Button>
                <Link to={`/iniciar-sesion?return_url=${encodeURIComponent(returnHere)}`} className="text-xs text-center text-muted-foreground hover:text-foreground">
                  Ya tengo cuenta · Iniciar sesión
                </Link>
                {error && <p className="text-sm text-red-500 text-center">{error}</p>}
              </div>
            ) : (
              <div className="grid gap-3">
                {preview.has_cedula && (
                  <div>
                    <label className="text-sm font-medium text-foreground">Confirma tu cédula profesional</label>
                    <p className="text-xs text-muted-foreground mb-1.5">Escríbela completa para comprobar que eres tú (termina en {preview.cedula_hint}).</p>
                    <Input value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="Número de cédula" inputMode="text" autoComplete="off" className="rounded-xl" />
                  </div>
                )}
                {error && <p className="text-sm text-red-500">{error}</p>}
                {hasProfile ? (
                  <Button onClick={() => navigate("/panel-medico")} className="w-full min-h-[44px] rounded-xl">Ir a mi panel</Button>
                ) : (
                  <Button onClick={claim} disabled={loading} className="w-full min-h-[44px] rounded-xl gap-1.5">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />} Reclamar mi perfil
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {phase === "email-form" && (
          <form onSubmit={submitEmailForm} className="bg-card border border-border/50 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="text-center mb-2">
              <Logo to="/" className="h-9 mx-auto mb-3" />
              <h1 className="font-heading font-bold text-xl text-foreground">Crea tu cuenta</h1>
              <p className="text-sm text-muted-foreground">Para reclamar el perfil de {preview?.full_name}</p>
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input type="email" value={emailForm.email} onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })} placeholder="Correo electrónico" className="rounded-xl pl-9" />
            </div>
            <div className="space-y-2">
              <PasswordInput withLockIcon value={emailForm.password} onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })} placeholder="Crea tu contraseña" />
              <PasswordChecklist password={emailForm.password} email={emailForm.email} />
            </div>
            <PasswordInput withLockIcon value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder="Repite tu contraseña" />
            {passwordConfirm && emailForm.password !== passwordConfirm && (
              <p className="text-xs text-red-500 -mt-2">Las contraseñas no coinciden todavía.</p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={loading || !checkPassword(emailForm.password, emailForm.email).valid || emailForm.password !== passwordConfirm} className="w-full min-h-[44px] rounded-xl gap-1.5">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Crear cuenta
            </Button>
            <button type="button" onClick={() => { setError(""); setPhase("intro"); }} className="text-xs text-muted-foreground hover:text-foreground w-full text-center">← Volver</button>
          </form>
        )}

        {phase === "otp" && (
          <form onSubmit={submitOtp} className="bg-card border border-border/50 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="text-center mb-2">
              <Logo to="/" className="h-9 mx-auto mb-3" />
              <h1 className="font-heading font-bold text-xl text-foreground">Verifica tu correo</h1>
              <p className="text-sm text-muted-foreground">
                Ingresa el código que enviamos a <span className="font-medium text-foreground">{emailForm.email}</span>
              </p>
            </div>
            <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Código de verificación" className="rounded-xl text-center tracking-widest text-lg" />
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full min-h-[44px] rounded-xl gap-1.5">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Verificar
            </Button>
          </form>
        )}

        {phase === "done" && (
          <div className="bg-card border border-border/50 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h1 className="font-heading font-bold text-xl text-foreground">¡Es tu perfil!</h1>
            <p className="text-sm text-muted-foreground">
              Ya quedó a tu nombre y pasó a revisión de nuestro equipo. Sube tu cédula y tus fotos desde tu panel para acelerar la publicación.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate("/panel-medico?seccion=perfil")} className="min-h-[44px] rounded-xl gap-1.5">
                <Camera className="w-4 h-4" /> Subir mi foto de perfil
              </Button>
              <Button variant="ghost" onClick={() => navigate("/panel-medico")} className="min-h-[44px] rounded-xl text-muted-foreground">Ir a mi panel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
