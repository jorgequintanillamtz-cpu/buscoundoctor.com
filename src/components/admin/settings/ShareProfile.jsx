import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Share2, Copy, Check, Download, MessageCircle, Star, Gift, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

const SITE_URL = "https://buscoundoctor.com";

// Ayuda al médico a mandar pacientes a su propio perfil: el enlace, un texto
// listo para WhatsApp, y un código QR (para imprimir en el consultorio, una
// tarjeta de presentación, etc.). El QR se genera en el navegador del
// médico, no se manda a ningún servidor externo.
export default function ShareProfile({ specialist }) {
  const profileUrl = specialist?.slug ? `${SITE_URL}/especialista/${specialist.slug}` : "";
  const shareText = `Te recomiendo a ${specialist?.full_name || "este especialista"} en BuscoUnDoctor`;
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [referrals, setReferrals] = useState(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [premiumPrice, setPremiumPrice] = useState(1999);

  useEffect(() => {
    base44.functions.invoke("listMyReferrals").then((res) => setReferrals(res?.data || [])).catch(() => setReferrals([]));
  }, []);

  useEffect(() => {
    base44.entities.Plan.filter({ slug: "premium", active: true })
      .then((plans) => { if (plans[0]?.price_monthly) setPremiumPrice(Number(plans[0].price_monthly)); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!profileUrl) return;
    QRCode.toDataURL(profileUrl, { width: 480, margin: 1, color: { dark: "#0B1E4D", light: "#FFFFFF" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [profileUrl]);

  if (!profileUrl) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 p-5">
        <p className="text-sm text-muted-foreground">
          Todavía no tienes tu página pública lista. Termina de llenar tu perfil para poder compartirlo.
        </p>
      </div>
    );
  }

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: specialist.full_name, text: shareText, url: profileUrl });
      } catch {
        // Canceló el share nativo; no es un error.
      }
      return;
    }
    copyLink();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success("Enlace copiado");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("No se pudo copiar. Selecciona el enlace a mano.");
    }
  };

  const downloadQr = () => {
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `codigo-qr-${specialist.slug}.png`;
    a.click();
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${shareText}: ${profileUrl}`)}`;

  const inviteUrl = specialist?.referral_code ? `${SITE_URL}/registro-medico?ref=${specialist.referral_code}` : "";
  const inviteText = `Únete a BuscoUnDoctor, el directorio de médicos de Monterrey y San Pedro. Regístrate con mi enlace y cuando tu perfil quede publicado, a mí me regalan un mes de Premium: ${inviteUrl}`;
  const inviteWhatsappHref = `https://wa.me/?text=${encodeURIComponent(inviteText)}`;

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedInvite(true);
      toast.success("Enlace de invitación copiado");
      setTimeout(() => setCopiedInvite(false), 2500);
    } catch {
      toast.error("No se pudo copiar. Selecciona el enlace a mano.");
    }
  };

  const shareInvite = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Invita a un colega a BuscoUnDoctor", text: inviteText });
      } catch {
        // Canceló el share nativo; no es un error.
      }
      return;
    }
    copyInviteLink();
  };

  const reviewUrl = `${profileUrl}#opiniones`;
  const reviewText = `Hola, ¿me ayudarías dejando una reseña de tu consulta conmigo en BuscoUnDoctor? Se hace en un minuto, sin necesidad de crear una cuenta: ${reviewUrl}`;
  const reviewWhatsappHref = `https://wa.me/?text=${encodeURIComponent(reviewText)}`;

  const shareReview = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Pide una reseña", text: reviewText });
      } catch {
        // Canceló el share nativo; no es un error.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(reviewText);
      toast.success("Mensaje copiado");
    } catch {
      toast.error("No se pudo copiar. Selecciona el enlace a mano.");
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-foreground">El enlace de tu perfil</p>
          <div className="flex items-center gap-2 mt-2">
            <code className="flex-1 min-w-0 truncate text-xs sm:text-sm bg-muted rounded-xl px-3 py-2.5 text-foreground">{profileUrl}</code>
            <Button variant="outline" size="icon" className="rounded-xl flex-shrink-0" onClick={copyLink} aria-label="Copiar enlace">
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button className="rounded-xl gap-1.5 min-h-[44px]" onClick={share}>
            <Share2 className="w-4 h-4" />
            Compartir
          </Button>
          <Button variant="outline" className="rounded-xl gap-1.5 min-h-[44px] text-emerald-700 border-emerald-200 hover:bg-emerald-50" asChild>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-4 h-4" />
              Enviar por WhatsApp
            </a>
          </Button>
        </div>
      </div>

      {inviteUrl && (
        <div className="bg-card rounded-2xl border border-violet-200 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <Gift className="w-4 h-4 text-violet-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Invita a un colega</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Cuando un médico se registre con tu código y su perfil quede publicado, te regalamos <span className="font-semibold text-foreground">1 mes de Premium</span>. Puedes invitar a varios colegas, y los meses se van sumando.
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Tu código</p>
            <div className="flex items-center gap-2">
              <code className="text-base font-heading font-bold tracking-widest bg-violet-50 text-violet-700 rounded-xl px-3.5 py-2">{specialist.referral_code}</code>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Tu enlace de invitación</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 truncate text-xs sm:text-sm bg-muted rounded-xl px-3 py-2.5 text-foreground">{inviteUrl}</code>
              <Button variant="outline" size="icon" className="rounded-xl flex-shrink-0" onClick={copyInviteLink} aria-label="Copiar enlace de invitación">
                {copiedInvite ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl gap-1.5 min-h-[44px] text-emerald-700 border-emerald-200 hover:bg-emerald-50" asChild>
              <a href={inviteWhatsappHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4" />
                Invitar por WhatsApp
              </a>
            </Button>
            <Button variant="outline" className="rounded-xl gap-1.5 min-h-[44px]" onClick={shareInvite}>
              <Share2 className="w-4 h-4" />
              Compartir de otra forma
            </Button>
          </div>

          {referrals && referrals.length > 0 && (
            <div className="pt-3 border-t border-border/50 space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-violet-50 rounded-xl px-3.5 py-2.5">
                  <p className="text-[11px] font-medium text-violet-700/80">Colegas invitados</p>
                  <p className="font-heading font-extrabold text-xl text-violet-900">{referrals.length}</p>
                </div>
                <div className="bg-violet-50 rounded-xl px-3.5 py-2.5">
                  <p className="text-[11px] font-medium text-violet-700/80">Llevas ahorrado</p>
                  <p className="font-heading font-extrabold text-xl text-violet-900">
                    ${(referrals.filter((r) => r.rewarded).length * premiumPrice).toLocaleString("es-MX")}
                  </p>
                </div>
              </div>
              <p className="text-xs font-medium text-muted-foreground">Detalle</p>
              <ul className="space-y-1.5">
                {referrals.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-foreground truncate">{r.full_name}</span>
                    {r.rewarded ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> Premio acreditado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full flex-shrink-0">
                        <Clock className="w-3 h-3" /> Esperando aprobación
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <Star className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Pide una reseña</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Manda este mensaje a un paciente después de su consulta. El enlace lo lleva directo a la sección de reseñas de tu perfil, listo para escribir la suya.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl gap-1.5 min-h-[44px] text-emerald-700 border-emerald-200 hover:bg-emerald-50" asChild>
            <a href={reviewWhatsappHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-4 h-4" />
              Enviar por WhatsApp
            </a>
          </Button>
          <Button variant="outline" className="rounded-xl gap-1.5 min-h-[44px]" onClick={shareReview}>
            <Share2 className="w-4 h-4" />
            Compartir de otra forma
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 p-5">
        <p className="text-sm font-semibold text-foreground mb-1">Código QR</p>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          Ponlo en tu consultorio, tu tarjeta de presentación o tus redes. Cualquiera que lo escanee con su celular llega directo a tu perfil.
        </p>
        {qrDataUrl ? (
          <div className="flex flex-col items-center gap-3">
            <img src={qrDataUrl} alt="Código QR de tu perfil" className="w-48 h-48 rounded-xl border border-border/50" />
            <Button variant="outline" className="rounded-xl gap-1.5 min-h-[44px]" onClick={downloadQr}>
              <Download className="w-4 h-4" />
              Descargar código QR
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Generando…</p>
        )}
      </div>
    </div>
  );
}
