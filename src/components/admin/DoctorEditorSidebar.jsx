import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star, BadgeCheck, Clock, PauseCircle, Globe, Mail, Check, X, AlertTriangle, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { setDoctorState } from "@/api/doctorReview";
import { notifyProfileApproved } from "@/api/doctorNotify";
import VerifiedSeal from "@/components/profile/VerifiedSeal";

// Sección "Estado y visibilidad" del editor del admin (solo se renderiza para
// administradores). Un solo control de estado con tres opciones claras en vez
// de varios interruptores que se pisaban:
//   En revisión  -> pending_review, no visible
//   Publicado    -> published + active (visible en el directorio)
//   En pausa     -> published + active = false (oculto por ahora)
// El estado se aplica al momento (no espera a "Guardar cambios") y también
// actualiza el formulario, para que el autoguardado no lo revierta.
const STATES = [
  { key: "review", label: "En revisión", desc: "Todavía no se ve en el directorio.", icon: Clock, tone: "border-amber-300 bg-amber-50" },
  { key: "published", label: "Publicado", desc: "Se ve en el directorio. Le avisamos al doctor por correo.", icon: Globe, tone: "border-green-300 bg-green-50" },
  { key: "paused", label: "En pausa", desc: "Se oculta del directorio por ahora.", icon: PauseCircle, tone: "border-slate-300 bg-slate-50" },
];

function currentState(form) {
  if (form.publication_status === "published" && form.active === true) return "published";
  if (form.publication_status === "published" || form.publication_status === "suspended") return "paused";
  if (form.publication_status === "rejected") return "changes";
  return "review";
}

export default function DoctorEditorSidebar({ form, update, specialistId }) {
  const [user, setUser] = useState(null);
  const [changing, setChanging] = useState(false);
  const [resend, setResend] = useState("idle"); // idle | sending | sent | error
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const state = currentState(form);
  const isVerified = form.license_verification_status === "verified";
  const canChange = !!specialistId;

  const applyState = async (next) => {
    if (!canChange || next === state) return;
    const message = next === "published"
      ? `Se va a publicar el perfil de ${form.full_name} y le llegará un correo de aviso. ¿Continuar?`
      : next === "paused"
      ? `El perfil de ${form.full_name} dejará de verse en el directorio hasta que lo publiques de nuevo. ¿Continuar?`
      : `El perfil de ${form.full_name} volverá a "En revisión" y dejará de verse en el directorio. ¿Continuar?`;
    if (!confirm(message)) return;
    setChanging(true);
    try {
      const fields = await setDoctorState({ ...form, id: specialistId }, next);
      update("publication_status", fields.publication_status);
      update("active", fields.active);
      toast.success(next === "published" ? "Perfil publicado" : next === "paused" ? "Perfil en pausa" : "Perfil en revisión");
    } catch (e) {
      toast.error("No se pudo cambiar el estado: " + e.message);
    }
    setChanging(false);
  };

  // Autoriza (o retira) el sello de verificado. Es independiente de la
  // aprobación de documentos (que también lo marca al aprobar la cédula): este
  // interruptor deja al dueño autorizarlo directo cuando ya confirmó la
  // identidad del médico por otro medio.
  const toggleVerified = (v) => {
    update("license_verification_status", v ? "verified" : "pending");
    update("license_verified_at", v ? new Date().toISOString() : null);
    if (v && user?.id) update("license_verified_by", user.id);
  };

  const resendNotice = async () => {
    setResend("sending");
    const sent = await notifyProfileApproved(form);
    setResend(sent ? "sent" : "error");
    toast[sent ? "success" : "error"](sent ? "Aviso reenviado" : "No se pudo enviar: este doctor no tiene un correo válido registrado");
    setTimeout(() => setResend("idle"), 4000);
  };

  return (
    <div className="space-y-4">
      {/* Estado del perfil */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
        <div>
          <h3 className="font-heading font-semibold text-base text-foreground">Estado del perfil</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Elige una opción. Se aplica al momento.</p>
        </div>

        {state === "changes" && (
          <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              Este perfil tiene cambios pendientes que debe corregir el doctor.
              {specialistId && <> <Link to={`/admin/doctores/revisar/${specialistId}`} className="underline font-medium">Ver la revisión</Link>.</>}
            </div>
          </div>
        )}

        {!canChange && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2.5">Guarda el perfil primero para poder cambiar su estado.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {STATES.map((s) => {
            const selected = state === s.key;
            return (
              <button
                key={s.key}
                type="button"
                disabled={!canChange || changing}
                onClick={() => applyState(s.key)}
                className={`text-left rounded-xl border-2 p-3 transition-all disabled:opacity-60 ${selected ? s.tone : "border-border/60 hover:border-border"}`}
              >
                <div className="flex items-center gap-2">
                  <s.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-semibold text-foreground">{s.label}</span>
                  {selected && <Check className="w-4 h-4 ml-auto text-foreground/70" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">{s.desc}</p>
              </button>
            );
          })}
        </div>

        {state === "published" && specialistId && (
          <button
            type="button"
            onClick={resendNotice}
            disabled={resend === "sending"}
            className={`inline-flex items-center gap-1.5 text-xs font-medium hover:underline ${resend === "sent" ? "text-green-600" : resend === "error" ? "text-destructive" : "text-brand-blue"}`}
          >
            {resend === "sent" ? <Check className="w-3.5 h-3.5" /> : resend === "error" ? <X className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
            {resend === "sending" ? "Enviando…" : resend === "sent" ? "Aviso reenviado" : resend === "error" ? "No se pudo enviar" : "Reenviar el correo de \"tu perfil ya está publicado\""}
          </button>
        )}
      </div>

      {/* Distintivos */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
        <h3 className="font-heading font-semibold text-base text-foreground">Distintivos</h3>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Star className="w-4 h-4 text-amber-400" />
            Perfil destacado
          </div>
          <Switch checked={!!form.featured} onCheckedChange={(v) => update("featured", v)} />
        </div>

        <div className="pt-3 border-t border-border/40 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <BadgeCheck className="w-4 h-4 text-brand-blue" />
              Sello de verificado
            </div>
            <Switch checked={isVerified} onCheckedChange={toggleVerified} />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Actívalo solo después de confirmar la cédula (aprobando su documento en "Cédula y documentos" o verificándola tú). El sello se ve en el perfil público y en las tarjetas de búsqueda.
          </p>
          {isVerified && (
            <div>
              <VerifiedSeal size="sm" />
              {form.license_verified_at && (
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Verificado el {new Date(form.license_verified_at).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Los distintivos se guardan con "Guardar cambios" (o solos, cada 30 segundos).</p>
      </div>

      {/* Avanzado: la dirección web casi nunca se toca */}
      <div className="bg-card rounded-2xl border border-border/50">
        <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-muted-foreground hover:text-foreground">
          Avanzado
          <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
        </button>
        {showAdvanced && (
          <div className="px-5 pb-5 space-y-2">
            <label className="text-xs font-medium block">Dirección web del perfil</label>
            <div className="flex items-center gap-2 text-sm text-muted-foreground border border-border/40 rounded-xl px-3 py-2 bg-muted/30">
              <span className="flex-shrink-0">/especialista/</span>
              <Input
                value={form.slug || ""}
                onChange={(e) => { update("_slugManual", true); update("slug", e.target.value.replace(/[^a-z0-9-]/g, "")); }}
                className="border-0 bg-transparent h-auto p-0 focus-visible:ring-0 text-foreground"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">Cambiarla rompe los enlaces que ya se hayan compartido de este perfil. Se genera sola a partir del nombre.</p>
          </div>
        )}
      </div>
    </div>
  );
}
