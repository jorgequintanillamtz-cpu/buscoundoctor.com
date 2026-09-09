import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Lock, ArrowLeft } from "lucide-react";
import StepShell from "@/components/registro/StepShell";

// Página de inicio de sesión propia del sitio. Reemplaza la pantalla de
// login que antes hosteaba Base44 (el "login de la plataforma"), que ya no
// existe al auto-hospedar en Supabase. La usan tanto rutas de admin
// (RequireAdmin) como del panel de médico (DoctorPanel y afines) vía
// `base44.auth.redirectToLogin(returnUrl)`, que manda aquí con
// `?return_url=...`.
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

function MicrosoftIcon(props) {
  return (
    <svg viewBox="0 0 21 21" width="18" height="18" {...props}>
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

export default function IniciarSesion() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get("return_url") || "/panel-medico";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const continueWithProvider = (provider) => {
    base44.auth.loginWithProvider(provider, returnUrl);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Completa correo y contraseña"); return; }
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = returnUrl;
    } catch (err) {
      setError(err.message || "No se pudo iniciar sesión. Revisa tu correo y contraseña.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio
        </Link>

        <StepShell title="Inicia sesión" subtitle="Accede a tu panel de médico o de administración" error={error}>
          <Button type="button" onClick={() => continueWithProvider("google")} variant="outline" className="sm:col-span-2 w-full min-h-[44px] rounded-xl gap-2 border-border">
            <GoogleIcon />
            Continuar con Google
          </Button>
          <Button type="button" onClick={() => continueWithProvider("microsoft")} variant="outline" className="sm:col-span-2 w-full min-h-[44px] rounded-xl gap-2 border-border">
            <MicrosoftIcon />
            Continuar con Microsoft
          </Button>

          <div className="sm:col-span-2 flex items-center gap-3 py-1">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted-foreground">o con tu correo</span>
            <div className="h-px bg-border flex-1" />
          </div>

          <form onSubmit={submit} className="sm:col-span-2 grid gap-3">
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo electrónico" className="rounded-xl pl-9" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" className="rounded-xl pl-9" />
            </div>
            <Button type="submit" disabled={loading} className="w-full min-h-[44px] rounded-xl gap-1.5">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Iniciar sesión
            </Button>
          </form>

          <p className="sm:col-span-2 text-center text-xs text-muted-foreground">
            ¿Eres médico y aún no tienes cuenta?{" "}
            <Link to="/registro-medico" className="text-primary hover:underline">Regístrate aquí</Link>
          </p>
        </StepShell>
      </div>
    </div>
  );
}
