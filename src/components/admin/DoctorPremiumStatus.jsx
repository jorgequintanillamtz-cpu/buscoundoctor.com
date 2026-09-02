import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Crown, Check, Stethoscope, Hourglass, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { computeLateDoctors } from "@/api/premiumStatus";

// Mismo número de WhatsApp del negocio que se usa en /contacto y
// /para-medicos, para que "Actualizar a Premium" abra el mismo canal de
// contacto que ya conocen los doctores.
const WHATSAPP_NUMBER = "528117902740";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtMoney = (n) => `$${(n || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

// El plan Premium se cobra manualmente (no hay pasarela de pagos conectada
// todavía), así que "actualizar" es contactar al negocio por WhatsApp, el
// mismo canal que usan para todo lo demás en el sitio. El precio y los
// beneficios se leen del plan "premium" en la entidad Plan (la misma que
// alimenta /planes), para no duplicar ese contenido aquí.
export default function DoctorPremiumStatus({ specialistId, specialistName }) {
  const [status, setStatus] = useState(null);
  const [payments, setPayments] = useState([]);
  const [premiumPlan, setPremiumPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!specialistId) return;
    Promise.all([
      base44.entities.PremiumStatus.filter({ specialist_id: specialistId }),
      base44.entities.PremiumPayment.filter({ specialist_id: specialistId }),
      base44.entities.Plan.filter({ slug: "premium" }),
    ])
      .then(([statuses, pays, plans]) => {
        setStatus(statuses?.[0] || null);
        setPayments(pays || []);
        setPremiumPlan(plans?.[0] || null);
      })
      .finally(() => setLoading(false));
  }, [specialistId]);

  const isPremium = status?.plan_slug === "premium";
  const isTrial = !!(status?.trial_ends_at && new Date(status.trial_ends_at) >= new Date());

  const lateInfo = useMemo(() => {
    if (!status || status.plan_slug !== "premium") return null;
    const rows = computeLateDoctors([{ ...status, id: specialistId }], payments);
    return rows[0] || null;
  }, [status, payments, specialistId]);

  const waHref = useMemo(() => {
    const message = `Hola, soy ${specialistName || "un doctor"} de BuscoUnDoctor y quiero actualizar mi perfil al plan Premium.`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }, [specialistName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
          <Crown className="w-5 h-5 text-purple-500" fill="currentColor" />
          Tu plan
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
          {isPremium ? "Así está tu plan Premium en BuscoUnDoctor." : "Actualmente estás en el plan Gratis."}
        </p>
      </div>

      {lateInfo && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              Vas {lateInfo.daysLate} día{lateInfo.daysLate !== 1 ? "s" : ""} de retraso en tu pago Premium
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              Contáctanos por WhatsApp para regularizar tu pago y evitar que tu perfil pierda las funciones Premium.
            </p>
          </div>
        </div>
      )}

      {isPremium ? (
        <div className="bg-brand-navy rounded-3xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-purple-500/20 rounded-full pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-white/10 border-4 border-purple-400/40 flex-shrink-0">
              <Crown className="w-9 h-9 text-purple-300" fill="currentColor" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wide text-purple-200">Plan actual</span>
                {isTrial && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-white/10 text-purple-100 flex items-center gap-1">
                    <Hourglass className="w-3 h-3" /> En prueba
                  </span>
                )}
              </div>
              <h2 className="font-heading font-bold text-xl text-white leading-snug">Premium</h2>
              <p className="text-sm text-white/70 mt-1.5 max-w-lg">
                {isTrial
                  ? `Tu prueba gratuita de Premium termina el ${fmtDate(status.trial_ends_at)}.`
                  : status?.premium_activated_at
                  ? `Eres Premium desde el ${fmtDate(status.premium_activated_at)}.`
                  : "Eres Premium."}
                {!isTrial && status?.billing_day && (
                  <> Se cobra el día {status.billing_day} de cada mes · {fmtMoney(status.monthly_amount || 1999)} MXN.</>
                )}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border/50 rounded-2xl p-5 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <Crown className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-heading font-semibold text-foreground">Plan Gratis</p>
            <p className="text-sm text-muted-foreground">Tu perfil aparece en el directorio con las funciones básicas.</p>
          </div>
        </div>
      )}

      {!isPremium && (
        <div className="bg-card rounded-2xl border border-border/50 p-5 sm:p-6">
          <h2 className="font-heading font-semibold text-base text-foreground mb-1">Actualiza a Premium</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {premiumPlan?.tagline || "Destaca tu perfil, aparece primero en los resultados y accede a más herramientas."}
          </p>
          {premiumPlan?.features?.length > 0 && (
            <ul className="space-y-2 mb-5">
              {premiumPlan.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          )}
          {premiumPlan?.price_monthly > 0 && (
            <p className="font-heading font-bold text-2xl text-foreground mb-4">
              {fmtMoney(premiumPlan.price_monthly)} <span className="text-sm font-normal text-muted-foreground">MXN / mes</span>
            </p>
          )}
          <Button asChild size="lg" className="rounded-xl gap-2 bg-purple-600 hover:bg-purple-700">
            <a href={waHref} target="_blank" rel="noopener noreferrer">
              <Crown className="w-4 h-4" fill="currentColor" />
              Actualizar a Premium
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
