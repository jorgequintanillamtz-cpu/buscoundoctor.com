import { useState } from "react";
import { Link2, Copy, Check, Loader2, MessageCircle, Ban, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

// Perfiles que arma el equipo (CLAUDE.md §8o): el perfil es privado hasta que el doctor lo
// reclama con un enlace de un solo uso. El enlace en claro solo se ve al generarlo (en la base
// solo queda su huella), así que si se pierde se genera otro y el anterior deja de servir.
export default function ClaimLinkCard({ specialistId, form }) {
  const [link, setLink] = useState("");
  const [expires, setExpires] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revoked, setRevoked] = useState(false);

  if (form?.owner_user_id) {
    if (!form.claimed_at) return null; // doctor que se registró solo: no aplica
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 text-sm text-emerald-800 flex items-center gap-2">
        <BadgeCheck className="w-4 h-4 flex-shrink-0" />
        El doctor reclamó este perfil el {new Date(form.claimed_at).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}.
      </div>
    );
  }
  if (!form?.seeded_by_admin) return null;

  const generate = async () => {
    setBusy(true);
    try {
      const { data } = await base44.functions.invoke("generateClaimLink", { specialist_id: specialistId });
      setLink(`${window.location.origin}/reclamar/${data.token}`);
      setExpires(data.expires_at);
      setRevoked(false);
    } catch (e) {
      toast.error("No se pudo generar el enlace: " + (e.message || ""));
    }
    setBusy(false);
  };

  const revoke = async () => {
    setBusy(true);
    try {
      await base44.functions.invoke("revokeClaimLink", { specialist_id: specialistId });
      setLink(""); setRevoked(true);
      toast.success("El enlace ya no sirve");
    } catch (e) {
      toast.error("No se pudo desactivar: " + (e.message || ""));
    }
    setBusy(false);
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { toast.error("No se pudo copiar; selecciónalo y cópialo a mano."); }
  };

  const wa = `https://wa.me/?text=${encodeURIComponent(`Hola ${form.full_name || ""}, armamos tu perfil en BuscoUnDoctor. Reclámalo aquí (el enlace dura 30 días): ${link}`)}`;

  return (
    <div className="bg-violet-50/60 border border-violet-200 rounded-2xl p-5 space-y-3">
      <div>
        <h3 className="font-heading font-semibold text-base text-foreground flex items-center gap-2"><Link2 className="w-4 h-4 text-violet-700" /> Enlace para que el doctor reclame su perfil</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Este perfil lo armó el equipo y es privado. El doctor lo reclama con este enlace
          {form.professional_license_number ? " y confirmando su número de cédula" : " (este perfil no tiene cédula capturada: quien tenga el enlace puede reclamarlo, mándalo solo a él)"}.
          Al reclamarlo pasa a «En revisión».
        </p>
      </div>
      {link ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input readOnly value={link} onFocus={(e) => e.target.select()} className="flex-1 min-w-0 text-xs border border-border rounded-xl px-3 py-2 bg-white" />
            <Button type="button" size="sm" variant="outline" onClick={copy} className="rounded-xl gap-1.5 flex-shrink-0">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Vence el {new Date(expires).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}. Cópialo ahora: no se vuelve a mostrar.</p>
          <div className="flex gap-2 flex-wrap">
            <a href={wa} target="_blank" rel="noopener noreferrer">
              <Button type="button" size="sm" className="rounded-xl gap-1.5"><MessageCircle className="w-3.5 h-3.5" /> Mandar por WhatsApp</Button>
            </a>
            <Button type="button" size="sm" variant="ghost" onClick={revoke} disabled={busy} className="rounded-xl gap-1.5 text-red-600"><Ban className="w-3.5 h-3.5" /> Desactivar enlace</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Button type="button" size="sm" onClick={generate} disabled={busy} className="rounded-xl gap-1.5">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />} Generar enlace
          </Button>
          {revoked && <p className="text-[11px] text-muted-foreground">El enlace anterior ya no sirve. Genera uno nuevo cuando quieras.</p>}
          {!revoked && form.claim_token_expires_at && (
            <p className="text-[11px] text-muted-foreground">Ya hay un enlace generado (vence el {new Date(form.claim_token_expires_at).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}). Si generas otro, el anterior deja de servir.</p>
          )}
        </div>
      )}
    </div>
  );
}
