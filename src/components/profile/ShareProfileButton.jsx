import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { toast } from "sonner";

export default function ShareProfileButton({ specialist, className = "" }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: `${specialist.full_name} — ${specialist.specialty}`,
      text: `Encontré a ${specialist.full_name} en BuscoUnDoctor`,
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // El usuario canceló el share nativo; no es un error.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Enlace copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`inline-flex items-center justify-center gap-2 text-sm font-medium rounded-full border border-border/60 bg-white text-foreground hover:border-brand-blue/40 px-4 py-2.5 min-h-[44px] transition-colors ${className}`}
    >
      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
      {copied ? "Copiado" : "Compartir"}
    </button>
  );
}
