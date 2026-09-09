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
export default function IniciarSesion() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get("return_url") || "/panel-medico";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
