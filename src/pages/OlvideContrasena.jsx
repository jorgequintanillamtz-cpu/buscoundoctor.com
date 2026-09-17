import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Lock, ArrowLeft, CheckCircle2 } from "lucide-react";
import StepShell from "@/components/registro/StepShell";

// Recuperación de contraseña con código de 6 dígitos -- igual que la
// verificación de correo del registro (RegistroMedico.jsx) y por la misma
// razón: un enlace de un solo uso lo "gastan" solos los escáneres de
// seguridad de Gmail/Outlook antes de que la persona le dé clic, dejando el
// enlace real inservible. Un código que se escribe a mano no tiene ese
// problema.
export default function OlvideContrasena() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("email"); // email | otp | password | done
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submitEmail = async (e) => {
    e.preventDefault();
    setError("");
    if (!email) { setError("Escribe tu correo electrónico"); return; }
    setLoading(true);
    try {
      await base44.auth.requestPasswordReset(email);
    } catch {
      // Silencioso a propósito: no hay que confirmarle a nadie si un correo
      // SÍ tiene cuenta o no (eso ayudaría a adivinar cuentas existentes).
    }
    setPhase("otp");
    setLoading(false);
  };

  const submitOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (!otp) { setError("Ingresa el código de verificación"); return; }
    setLoading(true);
    try {
      await base44.auth.verifyPasswordResetOtp({ email, otpCode: otp });
      setPhase("password");
    } catch (err) {
      setError(err.message || "Código incorrecto o vencido");
    }
    setLoading(false);
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres"); return; }
    if (password !== confirmPassword) { setError("Las contraseñas no coinciden"); return; }
    setLoading(true);
    try {
      await base44.auth.updatePassword(password);
      setPhase("done");
    } catch (err) {
      setError(err.message || "No se pudo actualizar la contraseña");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/iniciar-sesion" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a iniciar sesión
        </Link>

        {phase === "email" && (
          <StepShell title="¿Olvidaste tu contraseña?" subtitle="Te mandamos un código a tu correo para crear una nueva" error={error}>
            <form onSubmit={submitEmail} className="sm:col-span-2 grid gap-3">
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo electrónico" className="rounded-xl pl-9" />
              </div>
              <Button type="submit" disabled={loading} className="w-full min-h-[44px] rounded-xl gap-1.5">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Mandar código de verificación
              </Button>
            </form>
          </StepShell>
        )}

        {phase === "otp" && (
          <StepShell title="Verifica tu correo" subtitle={`Ingresa el código de verificación que enviamos a ${email}`} error={error}>
            <form onSubmit={submitOtp} className="sm:col-span-2 grid gap-3">
              <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Código de verificación" className="rounded-xl text-center tracking-widest text-lg" />
              <Button type="submit" disabled={loading} className="w-full min-h-[44px] rounded-xl gap-1.5">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Verificar código
              </Button>
            </form>
          </StepShell>
        )}

        {phase === "password" && (
          <StepShell title="Crea tu nueva contraseña" error={error}>
            <form onSubmit={submitPassword} className="sm:col-span-2 grid gap-3">
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña nueva (mín. 8 caracteres)" className="rounded-xl pl-9" />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repite la contraseña" className="rounded-xl pl-9" />
              </div>
              <Button type="submit" disabled={loading} className="w-full min-h-[44px] rounded-xl gap-1.5">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar contraseña
              </Button>
            </form>
          </StepShell>
        )}

        {phase === "done" && (
          <StepShell title="¡Contraseña actualizada!">
            <div className="sm:col-span-2 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-sm text-muted-foreground">Ya puedes entrar a tu panel con tu contraseña nueva.</p>
              <Button onClick={() => navigate("/panel-medico")} className="min-h-[44px] rounded-xl">Ir a mi panel</Button>
            </div>
          </StepShell>
        )}
      </div>
    </div>
  );
}
