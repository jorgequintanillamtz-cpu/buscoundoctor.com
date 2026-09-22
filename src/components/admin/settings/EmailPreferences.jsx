import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { getEmailPreferences, saveEmailPreferences } from "@/api/doctorSettings";

const OPTIONS = [
  {
    key: "citas",
    label: "Nuevas solicitudes de cita",
    desc: "Un correo cada vez que un paciente pide una cita contigo.",
  },
  {
    key: "estado",
    label: "Estado de mi perfil y documentos",
    desc: "Correos cuando aprobamos tu perfil, verificamos tu cédula o necesitamos que corrijas algo. Te recomendamos dejarlo activado.",
  },
];

export default function EmailPreferences({ specialistId }) {
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    let active = true;
    getEmailPreferences(specialistId).then((p) => { if (active) setPrefs(p); }).catch(() => { if (active) setPrefs({ citas: true, estado: true }); });
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
      <p className="text-xs text-muted-foreground px-1">
        Estas opciones solo cambian los correos. Las notificaciones de la campana dentro de tu panel siempre se muestran.
      </p>
    </div>
  );
}
