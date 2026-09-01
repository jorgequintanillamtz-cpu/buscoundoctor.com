import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { buildWhatsAppLink, normalizePhone } from "@/lib/storefrontUtils";

export default function StorefrontSettingsForm({ storefront, specialist, onChange }) {
  const [copied, setCopied] = useState(false);
  const doctorName = specialist?.full_name || "";
  const publicUrl = `${window.location.origin}/dr/${storefront.slug}`;
  const previewLink = buildWhatsAppLink(
    storefront.whatsapp_phone,
    storefront.whatsapp_message,
    doctorName
  );
  const normalized = normalizePhone(storefront.whatsapp_phone);

  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Link público */}
      <div>
        <Label className="text-sm font-medium">Tu link público</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Pon este link en tu bio de Instagram u otras redes.
        </p>
        <div className="flex items-center gap-2">
          <Input readOnly value={publicUrl} className="flex-1 text-sm bg-muted/50" />
          <button
            type="button"
            onClick={copyUrl}
            className="px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* WhatsApp */}
      <div>
        <Label className="text-sm font-medium">Teléfono de WhatsApp para citas</Label>
        <Input
          value={storefront.whatsapp_phone || ""}
          onChange={(e) => onChange({ whatsapp_phone: e.target.value })}
          placeholder="Ej. 55 1234 5678 o +52 55 1234 5678"
          className="mt-1.5"
        />
        {storefront.whatsapp_phone && (
          <p className="text-xs text-muted-foreground mt-1.5">
            Link generado:{" "}
            <span className="font-mono text-[11px] break-all">{previewLink}</span>
          </p>
        )}
        {normalized && storefront.whatsapp_phone && normalized !== storefront.whatsapp_phone.replace(/\D/g, "") && (
          <p className="text-xs text-amber-600 mt-1">
            Se normalizará a: {normalized}
          </p>
        )}
      </div>

      {/* Mensaje */}
      <div>
        <Label className="text-sm font-medium">Mensaje prellenado (opcional)</Label>
        <Textarea
          value={storefront.whatsapp_message || ""}
          onChange={(e) => onChange({ whatsapp_message: e.target.value })}
          placeholder={`Hola, quiero agendar una cita con el/la Dr. ${doctorName}`}
          className="mt-1.5"
          rows={2}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Si lo dejas vacío, se usa el mensaje default con tu nombre.
        </p>
      </div>

      {/* Headline */}
      <div>
        <Label className="text-sm font-medium">Encabezado (opcional)</Label>
        <Input
          value={storefront.headline || ""}
          onChange={(e) => onChange({ headline: e.target.value })}
          placeholder="Ej. Cardiólogo · 15 años de experiencia"
          className="mt-1.5"
        />
      </div>

      {/* Status */}
      <div className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-3">
        <div>
          <Label className="text-sm font-medium">Página visible</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Si la apagas, nadie podrá ver tu link público.
          </p>
        </div>
        <Switch
          checked={storefront.status === "active"}
          onCheckedChange={(v) => onChange({ status: v ? "active" : "inactive" })}
        />
      </div>
    </div>
  );
}