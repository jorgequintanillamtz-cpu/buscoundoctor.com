import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Copy, Check, ExternalLink, Camera, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { fileToWebP } from "@/lib/fileToWebP";
import { buildWhatsAppLink, normalizePhone } from "@/lib/storefrontUtils";

export default function StorefrontSettingsForm({ storefront, specialist, onChange }) {
  const [copied, setCopied] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  // Si ya hay un mensaje guardado, arranca visible (para no dar la
  // impresión de que se perdió); si no, arranca oculto detrás del botón.
  const [showMessage, setShowMessage] = useState(!!storefront.whatsapp_message);
  const doctorName = specialist?.full_name || "";
  const publicUrl = `${window.location.origin}/dr/${storefront.slug}`;
  const previewLink = buildWhatsAppLink(
    storefront.whatsapp_phone,
    storefront.whatsapp_message,
    doctorName
  );
  const normalized = normalizePhone(storefront.whatsapp_phone);
  const coverPhoto = storefront.cover_photo || specialist?.profile_photo || "";

  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const uploadCoverPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const optimized = await fileToWebP(file);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: optimized });
      onChange({ cover_photo: file_url });
      toast.success("Foto de portada cargada");
    } catch {
      toast.error("Error al subir la foto");
    }
    setUploadingPhoto(false);
  };

  return (
    <div className="space-y-5">
      {/* Identidad: foto de portada propia (editable) + nombre y cédula del
          directorio (solo lectura -- se editan desde "Mi perfil", no aquí). */}
      <div className="flex items-center gap-4">
        <label className="relative group cursor-pointer flex-shrink-0">
          {coverPhoto ? (
            <img src={coverPhoto} alt="Portada" className="w-20 h-20 rounded-2xl object-cover border-2 border-border" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center border-2 border-dashed border-border">
              <Camera className="w-6 h-6 text-muted-foreground/50" />
            </div>
          )}
          <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            {uploadingPhoto ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Camera className="w-5 h-5 text-white" />
            )}
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={uploadCoverPhoto} disabled={uploadingPhoto} />
        </label>
        <div className="min-w-0">
          <p className="font-heading font-bold text-foreground truncate">{doctorName || "Sin nombre"}</p>
          {specialist?.professional_license_number && (
            <p className="text-xs text-muted-foreground mt-0.5">Cédula {specialist.professional_license_number}</p>
          )}
          <p className="text-[11px] text-muted-foreground mt-1">
            La foto de portada es solo para esta página — no cambia tu foto del directorio. Nombre y cédula se editan desde "Mi perfil".
          </p>
        </div>
      </div>

      <div className="border-t border-border/30" />

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

      {/* Mensaje: oculto detrás de un botón por default, para no abrumar. */}
      <div>
        <button
          type="button"
          onClick={() => setShowMessage((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-brand-blue transition-colors"
        >
          {showMessage ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          Personalizar mensaje de WhatsApp
        </button>
        {showMessage && (
          <div className="mt-2">
            <Textarea
              value={storefront.whatsapp_message || ""}
              onChange={(e) => onChange({ whatsapp_message: e.target.value })}
              placeholder={`Hola, quiero agendar una cita con el/la Dr. ${doctorName}`}
              rows={2}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Si lo dejas vacío, se usa el mensaje default con tu nombre.
            </p>
          </div>
        )}
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