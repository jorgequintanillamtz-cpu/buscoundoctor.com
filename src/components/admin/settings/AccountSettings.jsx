import { useEffect, useState } from "react";
import { Loader2, Mail, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { changePassword, hasPasswordLogin } from "@/api/doctorSettings";
import { supportWhatsAppLink } from "@/components/DoctorSupportWhatsApp";
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

export default function AccountSettings({ specialist, onStatusChange }) {
  const [email, setEmail] = useState("");
  const [passwordLogin, setPasswordLogin] = useState(true);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [askingDelete, setAskingDelete] = useState(false);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);

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

  const requestDeletion = async () => {
    setSending(true);
    try {
      const res = await base44.functions.invoke("requestProfileDeletion", { reason: reason.trim() });
      const data = res.data || res;
      onStatusChange?.({ deletion_requested_at: data.deletion_requested_at || new Date().toISOString() });
      toast.success("Recibimos tu solicitud. Nos pondremos en contacto contigo.");
      setAskingDelete(false);
      setReason("");
    } catch (e) {
      toast.error("No se pudo enviar: " + e.message);
    }
    setSending(false);
  };

  const cancelDeletion = async () => {
    setSending(true);
    try {
      await base44.functions.invoke("cancelProfileDeletion");
      onStatusChange?.({ deletion_requested_at: null });
      toast.success("Cancelamos tu solicitud de baja");
    } catch (e) {
      toast.error("No se pudo cancelar: " + e.message);
    }
    setSending(false);
  };

  const requestedAt = specialist?.deletion_requested_at;

  return (
    <div className="space-y-4 max-w-2xl">
      <Card icon={Mail} title="Tu acceso">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Correo con el que entras</p>
          <p className="text-sm text-foreground">{email || "…"}</p>
          <p className="text-xs text-muted-foreground mt-1.5">
            ¿Necesitas cambiarlo? <a href={supportWhatsAppLink("Hola, quiero cambiar el correo con el que entro a mi panel de BuscoUnDoctor")} target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline">Escríbenos por WhatsApp</a> y lo hacemos contigo.
          </p>
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

      <Card icon={Trash2} title="Dar de baja mi perfil">
        {requestedAt ? (
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              Ya recibimos tu solicitud el {new Date(requestedAt).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}. Nuestro equipo se pondrá en contacto contigo para confirmarla.
            </p>
            <Button variant="outline" className="rounded-xl min-h-[44px]" disabled={sending} onClick={cancelDeletion}>
              {sending && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Cancelar mi solicitud
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Si quieres que eliminemos tu perfil y tus datos de BuscoUnDoctor, puedes pedirlo aquí. No se borra nada al instante: nuestro equipo se pone en contacto contigo para confirmarlo, y puedes cancelar la solicitud cuando quieras.
            </p>
            <Button variant="outline" className="rounded-xl min-h-[44px] text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => setAskingDelete(true)}>
              Solicitar baja
            </Button>
          </div>
        )}
      </Card>

      <AlertDialog open={askingDelete} onOpenChange={setAskingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quieres dar de baja tu perfil?</AlertDialogTitle>
            <AlertDialogDescription>
              Le avisaremos a nuestro equipo y se pondrá en contacto contigo. Tu perfil no se elimina hasta que lo confirmemos juntos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">¿Nos cuentas por qué? (opcional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              className="w-full text-sm border border-input rounded-xl p-3 min-h-[80px]"
              placeholder="Tu comentario nos ayuda a mejorar"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Volver</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive hover:bg-destructive/90" disabled={sending} onClick={(e) => { e.preventDefault(); requestDeletion(); }}>
              {sending && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Enviar solicitud
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
