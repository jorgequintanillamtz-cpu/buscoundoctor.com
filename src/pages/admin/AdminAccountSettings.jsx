import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserRound, Mail, KeyRound, MonitorSmartphone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { changePassword, hasPasswordLogin, signOutEverywhere } from "@/api/doctorSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function Card({ icon: Icon, title, children }) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
      <h3 className="font-heading font-semibold text-base text-foreground flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        {title}
      </h3>
      {children}
    </div>
  );
}

// Cuenta propia de un dueño (Jorge o David) dentro del admin de dueños.
// Antes esto no existía de verdad: había un archivo MiPerfil.jsx pensado
// para esto pero la ruta real (/admin/mi-perfil) solo redirigía al panel
// del doctor, así que quedó como código muerto -- ningún dueño tenía, desde
// el sitio, dónde cambiar su contraseña. Reusa las mismas funciones
// genéricas de src/api/doctorSettings.js que ya usa el panel del doctor
// (no tienen nada específico de "doctor": operan sobre la sesión actual,
// sea quien sea). No incluye "Tu asistente" / "Descargar mis datos" / "Dar
// de baja" -- esas son cosas de un perfil de médico, no de una cuenta de
// dueño.
export default function AdminAccountSettings() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [passwordLogin, setPasswordLogin] = useState(true);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [askingSignOutAll, setAskingSignOutAll] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => setEmail(u.email || "")).catch(() => {});
    hasPasswordLogin().then(setPasswordLogin).catch(() => {});
  }, []);

  const submitPassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    if (!current) { setPasswordError("Escribe tu contraseña actual"); return; }
    if (next.length < 8) { setPasswordError("La nueva contraseña debe tener al menos 8 caracteres"); return; }
    if (next !== confirm) { setPasswordError("Las contraseñas nuevas no coinciden"); return; }
    if (next === current) { setPasswordError("La nueva contraseña debe ser distinta a la actual"); return; }
    setSavingPassword(true);
    try {
      await changePassword(email, current, next);
      toast.success("Tu contraseña se cambió");
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err) {
      setPasswordError(err.message || "No se pudo cambiar la contraseña");
    }
    setSavingPassword(false);
  };

  const signOutAll = async () => {
    setSigningOutAll(true);
    try {
      await signOutEverywhere();
      navigate("/");
    } catch (e) {
      toast.error("No se pudo cerrar sesión en todos lados: " + e.message);
      setSigningOutAll(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-1">
        <UserRound className="w-6 h-6 text-primary" />
        <h1 className="font-heading font-bold text-2xl text-foreground">Mi cuenta</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Tu acceso al panel de administración.</p>

      <div className="space-y-4">
        <Card icon={Mail} title="Tu acceso">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Correo con el que entras</p>
            <p className="text-sm text-foreground">{email || "…"}</p>
          </div>
        </Card>

        <Card icon={KeyRound} title="Cambiar contraseña">
          {passwordLogin ? (
            <form onSubmit={submitPassword} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Contraseña actual</label>
                <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className="rounded-xl" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Contraseña nueva</label>
                  <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Mínimo 8 caracteres" className="rounded-xl" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Repite la nueva</label>
                  <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="rounded-xl" />
                </div>
              </div>
              {passwordError && <p className="text-sm text-destructive" role="alert">{passwordError}</p>}
              <Button type="submit" className="rounded-xl gap-1.5 min-h-[44px]" disabled={savingPassword}>
                {savingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                Cambiar contraseña
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">Entras con tu cuenta de Google o Microsoft, así que no tienes una contraseña de BuscoUnDoctor que cambiar.</p>
          )}
        </Card>

        <Card icon={MonitorSmartphone} title="Sesiones abiertas">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Si dejaste tu sesión abierta en un celular o computadora que ya no usas, puedes cerrarla ahí sin necesitar ese aparato.
            Esto también cierra tu sesión aquí mismo.
          </p>
          <Button
            variant="outline"
            className="rounded-xl gap-1.5 min-h-[44px] text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={() => setAskingSignOutAll(true)}
          >
            <MonitorSmartphone className="w-4 h-4" />
            Cerrar sesión en todos los dispositivos
          </Button>
        </Card>
      </div>

      <AlertDialog open={askingSignOutAll} onOpenChange={setAskingSignOutAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar sesión en todos los dispositivos?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a salir de tu cuenta aquí y en cualquier otro celular o computadora donde hayas iniciado sesión. Tendrás que volver a entrar con tu correo y contraseña.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive hover:bg-destructive/90" disabled={signingOutAll} onClick={(e) => { e.preventDefault(); signOutAll(); }}>
              {signingOutAll && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Sí, cerrar todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
