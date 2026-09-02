import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_META = {
  pending: {
    label: "Pendiente",
    color: "amber",
    icon: AlertCircle,
    desc: "Iniciaste el registro en Stripe pero aún no lo completas.",
    bg: "bg-amber-50",
    text: "text-amber-600",
  },
  complete: {
    label: "Completo",
    color: "emerald",
    icon: CheckCircle2,
    desc: "Tu cuenta de Stripe está conectada y lista para recibir pagos.",
    bg: "bg-emerald-50",
    text: "text-emerald-600",
  },
  rejected: {
    label: "Rechazado",
    color: "red",
    icon: AlertCircle,
    desc: "Stripe rechazó tu cuenta. Revisa los requisitos en tu dashboard de Stripe.",
    bg: "bg-red-50",
    text: "text-red-600",
  },
};

export default function DoctorPayments() {
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get("status");
  const [status, setStatus] = useState("loading"); // loading | no-profile | ready
  const [account, setAccount] = useState(null);
  const [starting, setStarting] = useState(false);

  const loadAccount = async () => {
    const u = await base44.auth.me().catch(() => null);
    if (!u) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }
    const own = await base44.entities.Specialist.filter({ owner_user_id: u.id }).catch(() => []);
    if (!own || own.length === 0) {
      setStatus("no-profile");
      return;
    }
    const accts = await base44.entities.DoctorStripeAccount.filter({ doctor_id: own[0].id }).catch(() => []);
    setAccount(accts && accts.length > 0 ? accts[0] : null);
    setStatus("ready");
  };

  useEffect(() => {
    loadAccount();
  }, []);

  // Manejar el regreso de Stripe
  useEffect(() => {
    if (returnUrl === "return") {
      toast.success("Regresaste de Stripe. Verificando tu cuenta...");
      loadAccount();
    } else if (returnUrl === "refresh") {
      toast.error("El link de Stripe expiró. Vuelve a iniciar el proceso.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnUrl]);

  const startOnboarding = async () => {
    setStarting(true);
    try {
      const res = await base44.functions.invoke("createStripeConnectOnboarding", {});
      const url = res?.data?.url || res?.url;
      if (url) {
        window.location.href = url;
      } else {
        toast.error("No se pudo obtener el link de Stripe");
        setStarting(false);
      }
    } catch (e) {
      toast.error("Error: " + (e.message || "No se pudo iniciar el proceso"));
      setStarting(false);
    }
  };

  const shell = (content) => (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-brand-navy px-4 py-3 flex items-center justify-between">
        <Link to="/panel-medico" className="flex items-center gap-2 text-sm text-white/70 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
          Volver al panel
        </Link>
        <h1 className="font-heading font-bold text-white text-sm flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Configuración de pagos
        </h1>
        <div className="w-20" />
      </div>
      <div className="p-4 sm:p-6 lg:p-8">{content}</div>
    </div>
  );

  if (status === "loading") {
    return shell(
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "no-profile") {
    return shell(
      <div className="max-w-md mx-auto text-center py-16">
        <h1 className="font-heading font-bold text-xl text-foreground">Aún no tienes un perfil de médico</h1>
        <p className="text-sm text-muted-foreground mt-2">Regístrate primero para poder configurar tus pagos.</p>
        <Button className="mt-5 rounded-xl" asChild>
          <Link to="/registro-medico">Registrarme como médico</Link>
        </Button>
      </div>
    );
  }

  const meta = account ? STATUS_META[account.onboarding_status] || STATUS_META.pending : null;
  const Icon = meta?.icon;

  return shell(
    <div className="max-w-xl mx-auto space-y-6">
      {/* Tarjeta de estado */}
      <div className="bg-card rounded-2xl border border-border/50 p-6">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${account ? meta.bg : "bg-muted"}`}>
            {account ? (
              <Icon className={`w-6 h-6 ${meta.text}`} />
            ) : (
              <CreditCard className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading font-bold text-lg text-foreground">
              {account ? `Cuenta ${meta.label.toLowerCase()}` : "Sin cuenta conectada"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {account
                ? meta.desc
                : "Conecta tu cuenta de Stripe para recibir pagos de tus productos digitales."}
            </p>
            {account?.stripe_account_id && (
              <p className="text-xs text-muted-foreground mt-2 font-mono break-all">
                {account.stripe_account_id}
              </p>
            )}
            {account?.connected_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Conectada el {new Date(account.connected_at).toLocaleDateString("es-MX")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Acción */}
      <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold text-foreground">
            {account?.onboarding_status === "complete"
              ? "Cuenta verificada"
              : account
              ? "Continuar registro"
              : "Conectar con Stripe"}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {account?.onboarding_status === "complete"
            ? "Tu cuenta está lista. Cuando lancemos los pagos (Fase 5) podrás vender tus guías directamente desde tu storefront."
            : account
            ? "Tu registro en Stripe quedó incompleto. Continúa para terminar de configurar tu cuenta."
            : "Stripe Connect te permite recibir pagos de forma segura. Te redirigiremos a Stripe para completar tu registro."}
        </p>
        <Button className="w-full rounded-xl" onClick={startOnboarding} disabled={starting}>
          {starting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Redirigiendo a Stripe...
            </>
          ) : account?.onboarding_status === "complete" ? (
            <>
              <RefreshCw className="w-4 h-4" />
              Actualizar información
            </>
          ) : account ? (
            <>
              <RefreshCw className="w-4 h-4" />
              Continuar registro
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              Conectar con Stripe
            </>
          )}
        </Button>
      </div>

      {/* Info */}
      <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
        <p className="text-xs text-blue-900/70 leading-relaxed">
          Stripe Connect (tipo Express) es la forma estándar de que cada médico
          reciba pagos directamente en su propia cuenta bancaria. Tus datos
          bancarios se manejan directamente en Stripe — BuscoUnDoctor no los
          almacena. Esta conexión es necesaria para la próxima Fase 5 (checkout
          de productos digitales).
        </p>
      </div>
    </div>
  );
}