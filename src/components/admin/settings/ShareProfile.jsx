import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Share2, Copy, Check, Download, MessageCircle } from "lucide-react";
import { toast } from "sonner";
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
