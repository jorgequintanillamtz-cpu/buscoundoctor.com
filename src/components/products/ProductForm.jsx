import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, Loader2, Upload, FileText, X } from "lucide-react";

const MAX_PDF_MB = 20;
const MAX_PDF_BYTES = MAX_PDF_MB * 1024 * 1024;

function isPdf(file) {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

export default function ProductForm({ doctorId, product, onSaved, onCancel }) {
  const isEdit = !!product;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [status, setStatus] = useState("draft");
  const [saving, setSaving] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    if (product) {
      setTitle(product.title || "");
      setDescription(product.description || "");
      setPrice(product.price != null ? String(product.price) : "");
      setCoverImage(product.cover_image || "");
      setFileUrl(product.file_url || "");
      setStatus(product.status || "draft");
    }
  }, [product?.id]);

  const uploadPdf = async (file) => {
    if (!isPdf(file)) {
      toast.error("Solo se permiten archivos PDF.");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      toast.error(`El PDF pesa más de ${MAX_PDF_MB} MB.`);
      return;
    }
    setUploadingPdf(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setFileUrl(res.file_url);
      toast.success("PDF cargado");
    } catch (e) {
      toast.error("Error al subir el PDF: " + e.message);
    }
    setUploadingPdf(false);
  };

  const uploadCover = async (file) => {
    setUploadingCover(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setCoverImage(res.file_url);
    } catch (e) {
      toast.error("Error al subir la imagen: " + e.message);
    }
    setUploadingCover(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Falta el título");
      return;
    }
    if (!fileUrl) {
      toast.error("Sube el PDF del producto");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        doctor_id: doctorId,
        title: title.trim(),
        description: description.trim(),
        price: price === "" ? null : Number(price),
        cover_image: coverImage || null,
        file_url: fileUrl,
        status,
      };
      if (isEdit) {
        await base44.entities.DoctorProduct.update(product.id, payload);
        toast.success("Producto actualizado");
      } else {
        await base44.entities.DoctorProduct.create(payload);
        toast.success("Producto creado");
      }
      onSaved();
    } catch (e) {
      toast.error("Error al guardar: " + e.message);
    }
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label className="text-xs">Título *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Guía de alimentación para pacientes con diabetes" className="mt-1" />
      </div>

      <div>
        <Label className="text-xs">Descripción</Label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Qué incluye, para quién es, qué resuelve..."
          rows={3}
          className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Precio (MXN)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="199"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Estatus</Label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="draft">Borrador</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>
      </div>

      <div>
        <Label className="text-xs">Imagen de portada (opcional)</Label>
        <div className="mt-1 flex items-center gap-3">
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border cursor-pointer text-xs font-medium text-muted-foreground hover:bg-accent">
            {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Subir imagen
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
          </label>
          {coverImage && (
            <div className="relative">
              <img src={coverImage} alt="portada" className="w-14 h-14 rounded-lg object-cover" />
              <button type="button" onClick={() => setCoverImage("")} className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        <Label className="text-xs">Archivo PDF *</Label>
        <div className="mt-1 flex items-center gap-3">
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border cursor-pointer text-xs font-medium text-muted-foreground hover:bg-accent">
            {uploadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Subir PDF (máx {MAX_PDF_MB} MB)
            <input type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPdf(e.target.files[0])} />
          </label>
          {fileUrl && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <FileText className="w-4 h-4" />
              PDF cargado
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          El PDF queda privado. Cuando exista el checkout se entregará por link temporal firmado, no por esta URL directa.
        </p>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={saving || uploadingPdf || uploadingCover} className="rounded-xl">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isEdit ? "Guardar cambios" : "Crear producto"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">
          Cancelar
        </Button>
      </div>
    </form>
  );
}