import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldCheck, Mail, Lock, User, CheckCircle2, ArrowLeft } from "lucide-react";

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

const stripTitle = (name) => (name || "").replace(/^(Dr\.|Dra\.)\s*/i, "").trim();

export default function RegistroMedico() {
  const navigate = useNavigate();
  // checking | choose | title | form | otp | done
  const [step, setStep] = useState("checking");
  const [form, setForm] = useState({ full_name: "", email: "", password: "", title: "" });
  const [pendingGoogleName, setPendingGoogleName] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const createProfile = async (full_name) => {
    await base44.functions.invoke("createDoctorProfile", { full_name });
    try { await base44.auth.updateMe({ role: "doctor" }); } catch {}
  };

  // Al cargar: si el usuario ya está autenticado (ej. acaba de volver de Google),
  // pide el título (Dr./Dra.) antes de crear el perfil, o lo manda a su editor si ya tiene uno.
  useEffect(() => {
    let active = true;
    (async () => {
      const isAuth = await base44.auth.isAuthenticated().catch(() => false);
      if (!active) return;
      if (!isAuth) {
        setStep("choose");
        return;
      }
      const u = await base44.auth.me().catch(() => null);
      if (!active || !u) { setStep("choose"); return; }
      const own = await base44.entities.Specialist.filter({ owner_user_id: u.id }).catch(() => []);
      if (!active) return;
      if (own.length > 0) {
        navigate("/panel-medico", { replace: true });
        return;
      }
      setPendingGoogleName(stripTitle(u.full_name) || "Médico sin nombre");
      setStep("title");
    })();
    return () => { active = false; };
  }, [navigate]);

  const continueWithGoogle = () => {
    base44.auth.loginWithProvider("google", window.location.href);
  };

  const selectGoogleTitle = async (title) => {
    setLoading(true);
    setError("");
    try {
      await createProfile(`${title} ${pendingGoogleName}`);
      setStep("done");
    } catch (err) {
      setError(err.message || "No se pudo crear tu perfil.");
    }
    setLoading(false);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.title) {
      setError("Selecciona Dr. o Dra.");
      return;
    }
    if (!form.full_name || !form.email || !form.password) {
      setError("Completa todos los campos");
      return;
    }
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email: form.email, password: form.password });
      setStep("otp");
    } catch (err) {
      setError(err.message || "No se pudo registrar la cuenta. ¿El correo ya está registrado?");
    }
    setLoading(false);
  };

  const submitOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (!otp) {
      setError("Ingresa el código de verificación");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.verifyOtp({ email: form.email, otpCode: otp });
      await base44.auth.loginViaEmailPassword(form.email, form.password);
      await createProfile(`${form.title} ${stripTitle(form.full_name)}`);
      setStep("done");
    } catch (err) {
      setError(err.message || "No se pudo verificar el código");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio
        </Link>

        {step === "checking" && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {step === "choose" && (
          <div className="bg-card border border-border/50 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="text-center mb-2">
              <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <h1 className="font-heading font-bold text-xl text-foreground">Registro médico</h1>
              <p className="text-sm text-muted-foreground">Crea tu cuenta en segundos. Completarás tu perfil (incluida tu cédula) después.</p>
            </div>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <Button
              type="button"
              onClick={continueWithGoogle}
              variant="outline"
              className="w-full min-h-[44px] rounded-xl gap-2 border-border"
            >
              <GoogleIcon />
              Continuar con Google
            </Button>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px bg-border flex-1" />
              <span className="text-xs text-muted-foreground">o con tu correo</span>
              <div className="h-px bg-border flex-1" />
            </div>

            <Button
              type="button"
              onClick={() => setStep("form")}
              className="w-full min-h-[44px] rounded-xl"
            >
              Registrarme con correo electrónico
            </Button>
          </div>
        )}

        {step === "title" && (
          <div className="bg-card border border-border/50 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="text-center mb-2">
              <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <h1 className="font-heading font-bold text-xl text-foreground">Un último detalle</h1>
              <p className="text-sm text-muted-foreground">
                ¿Cómo quieres que aparezca tu nombre, {pendingGoogleName}?
              </p>
            </div>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => selectGoogleTitle("Dr.")}
                className="min-h-[52px] rounded-xl text-base font-semibold"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Dr. ${pendingGoogleName}`}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => selectGoogleTitle("Dra.")}
                className="min-h-[52px] rounded-xl text-base font-semibold"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Dra. ${pendingGoogleName}`}
              </Button>
            </div>
          </div>
        )}

        {step === "form" && (
          <form onSubmit={submitForm} className="bg-card border border-border/50 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="text-center mb-2">
              <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <h1 className="font-heading font-bold text-xl text-foreground">Registro médico</h1>
              <p className="text-sm text-muted-foreground">Crea tu cuenta de especialista</p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Título</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, title: "Dr." })}
                  className={`h-10 rounded-xl border text-sm font-semibold transition-colors ${form.title === "Dr." ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-accent"}`}
                >
                  Dr.
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, title: "Dra." })}
                  className={`h-10 rounded-xl border text-sm font-semibold transition-colors ${form.title === "Dra." ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-accent"}`}
                >
                  Dra.
                </button>
              </div>
            </div>

            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Nombre completo (sin 'Dr.'/'Dra.')"
                className="rounded-xl pl-9"
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Correo electrónico"
                className="rounded-xl pl-9"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Contraseña (mín. 8 caracteres)"
                className="rounded-xl pl-9"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full min-h-[44px] rounded-xl gap-1.5">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear cuenta
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Te enviaremos un código de verificación a tu correo. Tu cédula profesional se agrega después, desde tu perfil.
            </p>
            <button type="button" onClick={() => setStep("choose")} className="text-xs text-muted-foreground hover:text-foreground w-full text-center">
              ← Volver
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={submitOtp} className="bg-card border border-border/50 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="text-center mb-2">
              <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h1 className="font-heading font-bold text-xl text-foreground">Verifica tu correo</h1>
              <p className="text-sm text-muted-foreground">
                Ingresa el código de 6 dígitos que enviamos a <span className="font-medium text-foreground">{form.email}</span>
              </p>
            </div>
            <Input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Código de verificación"
              className="rounded-xl text-center tracking-widest text-lg"
              maxLength={6}
            />
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full min-h-[44px] rounded-xl gap-1.5">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Verificar y crear perfil
            </Button>
            <button type="button" onClick={() => setStep("form")} className="text-xs text-muted-foreground hover:text-foreground w-full text-center">
              ← Volver
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="bg-card border border-border/50 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h1 className="font-heading font-bold text-xl text-foreground">¡Cuenta creada!</h1>
            <p className="text-sm text-muted-foreground">
              Ahora completa tu perfil — incluida tu cédula profesional — para que podamos verificarte y publicar tu perfil.
            </p>
            <Button onClick={() => navigate("/panel-medico")} className="min-h-[44px] rounded-xl">
              Completar mi perfil
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
