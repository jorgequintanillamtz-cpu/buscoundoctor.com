import { useEffect, useState } from "react";
import { Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getEmailPreferences, saveEmailPreferences } from "@/api/doctorSettings";

const OPTIONS = [
  {
    key: "citas",
    label: "Nuevas solicitudes de cita",
    desc: "Un correo cada vez que un paciente pide una cita contigo.",
  },
  {
    key: "resenas",
    label: "Reseñas nuevas",
    desc: "Un correo cada vez que un paciente deja una reseña, antes de que la revisemos y publiquemos.",
  },
  {
    key: "estado",
    label: "Estado de mi perfil y documentos",
    desc: "Correos cuando aprobamos tu perfil, verificamos tu cédula o necesitamos que corrijas algo. Te recomendamos dejarlo activado.",
  },
];

const EMAIL_RE = /^[^@\s,;]+@[^@\s,;]+\.[^@\s,;]+$/;

export default function EmailPreferences({ specialistId }) {
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(null);
  const [notice, setNotice] = useState("");
  const [noticeError, setNoticeError] = useState("");

  useEffect(() => {
    let active = true;
    getEmailPreferences(specialistId)
      .then((p) => { if (active) { setPrefs(p); setNotice(p.aviso_email || ""); } })
      .catch(() => { if (active) setPrefs({ citas: true, resenas: true, estado: true, aviso_email: "" }); });
    return () => { active = false; };
  }, [specialistId]);

  const toggle = async (key, value) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(key);
    try {
      await saveEmailPreferences(specialistId, next);
      toast.success("Preferencia guardada");
    } catch {
      setPrefs(prefs);
      toast.error("No se pudo guardar. Intenta de nuevo.");
    }
    setSaving(null);
  };

  const saveNotice = async () => {
    const value = notice.trim().toLowerCase();
    setNoticeError("");
    if (value && !EMAIL_RE.test(value)) { setNoticeError("Escribe un correo válido, por ejemplo asistente@correo.com"); return; }
    const next = { ...prefs, aviso_email: value };
    setSaving("aviso_email");
    try {
      await saveEmailPreferences(specialistId, next);
      setPrefs(next);
      setNotice(value);
      toast.success(value ? "Guardamos ese correo para tus avisos" : "Quitamos el correo adicional");
    } catch {
      toast.error("No se pudo guardar. Intenta de nuevo.");
    }
    setSaving(null);
  };

  if (!prefs) {
    return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-card rounded-2xl border border-border/50 divide-y divide-border/50">
        {OPTIONS.map((o) => (
          <div key={o.key} className="flex items-start justify-between gap-4 p-5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{o.label}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{o.desc}</p>
            </div>
            <Switch checked={!!prefs[o.key]} disabled={saving === o.key} onCheckedChange={(v) => toggle(o.key, v)} aria-label={o.label} />
          </div>
        ))}
      </div>
      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <UserRound className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Correo de tu asistente (opcional)</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Las solicitudes de cita también llegarán a este correo, además de al tuyo. Sirve si alguien más agenda tus citas. Los correos sobre tu perfil y tus documentos solo llegan a ti.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            type="email"
            inputMode="email"
            value={notice}
            onChange={(e) => setNotice(e.target.value)}
            placeholder="asistente@correo.com"
            className="rounded-xl flex-1 min-w-[200px]"
            aria-label="Correo de tu asistente"
          />
          <Button
            variant="outline"
            className="rounded-xl min-h-[44px]"
            disabled={saving === "aviso_email" || notice.trim().toLowerCase() === (prefs.aviso_email || "")}
            onClick={saveNotice}
          >
            {saving === "aviso_email" && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
            Guardar
          </Button>
        </div>
        {noticeError && <p className="text-sm text-destructive" role="alert">{noticeError}</p>}
      </div>

      <p className="text-xs text-muted-foreground px-1">
        Estas opciones solo cambian los correos. Las notificaciones de la campana dentro de tu panel siempre se muestran.
      </p>
    </div>
  );
}
