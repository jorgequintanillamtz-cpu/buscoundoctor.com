import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldCheck, Mail, Lock, User, FileText, CheckCircle2, ArrowLeft } from "lucide-react";

export default function RegistroMedico() {
  const navigate = useNavigate();
  const [step, setStep] = useState("form"); // form | otp | done
  const [form, setForm] = useState({ full_name: "", email: "", password: "", cedula: "" });
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submitForm = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.full_name || !form.email || !form.password || !form.cedula) {
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
      const { user } = await base44.auth.loginViaEmailPassword(form.email, form.password);
      // Crear el perfil Specialist (draft, en revisión) vía función backend segura
      await base44.functions.invoke("createDoctorProfile", {
        full_name: form.full_name,
        professional_license_number: form.cedula,
      });
      // Asignar rol doctor (best-effort; el control de acceso no depende solo de esto)
      try { await base44.auth.updateMe({ role: "doctor" }); } catch {}
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

        {step === "form" && (
          <form onSubmit={submitForm} className="bg-card border border-border/50 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="text-center mb-2">
              <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <h1 className="font-heading font-bold text-xl text-foreground">Registro médico</h1>
              <p className="text-sm text-muted-foreground">Crea tu cuenta de especialista</p>
            </div>

            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Nombre completo"
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
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                value={form.cedula}
                onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                placeholder="Número de cédula profesional"
                className="rounded-xl pl-9"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full min-h-[44px] rounded-xl gap-1.5">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear cuenta
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Te enviaremos un código de verificación a tu correo.
            </p>
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
            <h1 className="font-heading font-bold text-xl text-foreground">Cuenta creada</h1>
            <p className="text-sm text-muted-foreground">
              Tu cuenta fue creada. Tu perfil está en revisión y será publicado una vez verificada tu cédula profesional.
            </p>
            <Button onClick={() => navigate("/admin/doctores")} className="min-h-[44px] rounded-xl">
              Ir a mi perfil
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}