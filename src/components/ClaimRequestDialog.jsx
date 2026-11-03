import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formErrorMessage } from "@/lib/formErrors";
import { trackEvent } from "@/lib/trackEvent";

// Solicitud para reclamar el perfil de un doctor recomendado por pacientes (CLAUDE.md §8r Paso 55).
// El doctor deja su cédula, correo y WhatsApp; el equipo revisa la cédula en la SEP y, si cuadra, le manda por correo
// el enlace para reclamar su perfil (/reclamar/<token>). Nada se publica ni se enlaza solo.
const REASONS = {
  no_disponible: "Esta página ya no está disponible.",
  ya_reclamado: "Este perfil ya fue reclamado. Si eres tú, inicia sesión; si no, escríbenos desde Contacto.",
};

export default function ClaimRequestDialog({ doc, open, onOpenChange }) {
  const [license, setLicense] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const digits = whatsapp.replace(/\D/g, "");
  const waOk = digits.length === 10 || (digits.length === 12 && digits.startsWith("52"));
  const licenseClean = license.replace(/[^a-zA-Z0-9]/g, "");
  const ready = licenseClean.length >= 6 && /^\S+@\S+\.\S+$/.test(email.trim()) && waOk && consent;

  const submit = async (e) => {
    e.preventDefault();
    if (busy || !ready) return;
    setBusy(true); setError("");
    try {
      const { data } = await base44.functions.invoke("submitProfileClaimRequest", {
        slug: doc.slug, license: licenseClean, email: email.trim(), whatsapp: digits, consent: true,
      });
      if (data?.ok) { setDone(true); trackEvent("rec_solicitud_perfil"); }
      else setError(REASONS[data?.reason] || "No pudimos enviar tu solicitud. Intenta de nuevo.");
    } catch (err) {
      setError(formErrorMessage(err, "No pudimos enviar tu solicitud. Intenta de nuevo."));
    }
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        {done ? (
          <div className="py-2 text-center">
            <span className="mx-auto w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center"><Check className="w-6 h-6" aria-hidden="true" /></span>
            <DialogTitle className="mt-4 font-heading text-xl">¡Recibimos tu solicitud!</DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-relaxed">
              Vamos a revisar tu cédula y, si todo cuadra, te mandamos a <strong className="text-foreground break-all">{email.trim()}</strong> el enlace para reclamar tu perfil.
              Normalmente tarda 1 o 2 días hábiles. Si no lo ves, revisa tu carpeta de correo no deseado.
            </DialogDescription>
            <button type="button" onClick={() => onOpenChange(false)} className="mt-5 h-11 px-6 rounded-full bg-brand-navy hover:bg-brand-navy/90 text-white text-sm font-semibold transition-colors">Entendido</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader className="text-left">
              <DialogTitle className="font-heading text-xl">Reclama tu perfil</DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">
                Para confirmar que eres {doc.full_name}, revisamos tu cédula profesional y te mandamos por correo el enlace para reclamar tu perfil.
              </DialogDescription>
            </DialogHeader>

            <div>
              <label htmlFor="claim-license" className="text-sm font-medium text-foreground">Cédula profesional</label>
              <Input id="claim-license" value={license} onChange={(e) => setLicense(e.target.value.slice(0, 14))} inputMode="text" autoComplete="off" placeholder="Ej: 12345678" className="mt-1 h-11 rounded-xl" />
            </div>
            <div>
              <label htmlFor="claim-email" className="text-sm font-medium text-foreground">Correo electrónico</label>
              <Input id="claim-email" type="email" value={email} onChange={(e) => setEmail(e.target.value.slice(0, 120))} autoComplete="email" placeholder="tu@correo.com" className="mt-1 h-11 rounded-xl" />
              <p className="text-xs text-muted-foreground mt-1">Aquí te mandamos el enlace.</p>
            </div>
            <div>
              <label htmlFor="claim-whatsapp" className="text-sm font-medium text-foreground">WhatsApp</label>
              <Input id="claim-whatsapp" type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value.slice(0, 20))} autoComplete="tel" placeholder="Ej: 8181234567" className="mt-1 h-11 rounded-xl" />
              <p className="text-xs text-muted-foreground mt-1">Por si necesitamos confirmar algo contigo.</p>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
              <span className="text-xs text-muted-foreground leading-relaxed">
                Acepto que BuscoUnDoctor use estos datos para verificar mi identidad y mandarme el enlace de mi perfil.{" "}
                <Link to="/aviso-de-privacidad" target="_blank" className="underline">Aviso de privacidad</Link>
              </span>
            </label>

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <button type="submit" disabled={busy || !ready}
              className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-brand-navy hover:bg-brand-navy/90 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShieldCheck className="w-4 h-4" aria-hidden="true" /> Enviar solicitud</>}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
