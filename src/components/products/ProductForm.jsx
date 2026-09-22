import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Save, Loader2, Upload, FileText, X, ArrowUp, ArrowDown, Star,
} from "lucide-react";

const MAX_PDF_MB = 20;
const MAX_PDF_BYTES = MAX_PDF_MB * 1024 * 1024;
const MAX_IMAGES = 6;

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
  const [images, setImages] = useState([]); // array de URLs
  const [fileUrl, setFileUrl] = useState("");
  const [status, setStatus] = useState("draft");
  const [saving, setSaving] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  useEffect(() => {
    if (product) {
      setTitle(product.title || "");
      setDescription(product.description || "");
      setPrice(product.price != null ? String(product.price) : "");
      // Migración: si tiene cover_image legacy y no images, úsalo como primera
      const imgs = Array.isArray(product.images) ? product.images : [];
      const cover = product.cover_image || "";
      setImages(imgs.length ? imgs : cover ? [cover] : []);
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
      // Bucket privado "doctor-products": la carpeta debe ser el id del
      // doctor (no el user.id) -- así lo exige la policy de RLS del bucket
      // (is_specialist_owner sobre el primer segmento de la ruta).
      const res = await base44.integrations.Core.UploadFile({ file, bucket: "doctor-products", folder: doctorId });
      setFileUrl(res.file_url);
      toast.success("PDF cargado");
    } catch (e) {
      toast.error("Error al subir el PDF: " + e.message);
    }
    setUploadingPdf(false);
  };

  const addImage = async (file) => {
    if (images.length >= MAX_IMAGES) {
      toast.error(`Máximo ${MAX_IMAGES} imágenes.`);
      return;
    }
    setUploadingImg(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file, bucket: "doctor-products", folder: doctorId });
      setImages((prev) => [...prev, res.file_url]);
    } catch (e) {
      toast.error("Error al subir la imagen: " + e.message);
    }
    setUploadingImg(false);
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveImage = (idx, dir) => {
    setImages((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
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
      const cover = images.length ? images[0] : null;
      const payload = {
        doctor_id: doctorId,
        title: title.trim(),
        description: description.trim(),
        price: price === "" ? null : Number(price),
        cover_image: cover, // se mantiene sincronizado con images[0]
        images,
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

      {/* Imágenes múltiples */}
      <div>
        <Label className="text-xs">
          Imágenes del producto (máx {MAX_IMAGES}) — la primera es la portada
        </Label>
        <div className="mt-1 flex items-center gap-3">
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border cursor-pointer text-xs font-medium text-muted-foreground hover:bg-accent">
            {uploadingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Subir imagen
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && addImage(e.target.files[0])}
            />
          </label>
          <span className="text-[11px] text-muted-foreground">
            La primera imagen se usa como portada en la tarjeta del storefront.
          </span>
        </div>

        {images.length > 0 && (
          <div className="mt-3 space-y-2">
            {images.map((img, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-lg border border-border/60 p-2"
              >
                <img src={img} alt="" className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {idx === 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      Portada
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Imagen {idx + 1}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveImage(idx, -1)}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-accent disabled:opacity-30"
                    aria-label="Subir"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(idx, 1)}
                    disabled={idx === images.length - 1}
                    className="p-1 rounded hover:bg-accent disabled:opacity-30"
                    aria-label="Bajar"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="p-1 rounded bg-destructive text-white"
                    aria-label="Quitar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
        <Button type="submit" disabled={saving || uploadingPdf || uploadingImg} className="rounded-xl">
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