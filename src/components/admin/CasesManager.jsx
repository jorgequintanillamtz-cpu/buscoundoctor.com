import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Pencil, Sparkles, Loader2, Upload, Stethoscope } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const emptyCase = () => ({ title: "", description: "", before_photo: "", after_photo: "" });

function PhotoSlot({ label, url, onUpload, uploading }) {
  return (
    <div>
      <label className="text-xs font-medium mb-1 block">{label}</label>
      <label className="block w-full aspect-square rounded-xl border border-dashed border-border overflow-hidden cursor-pointer hover:bg-accent/30 transition-colors relative">
        {url ? (
          <img src={url} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            <span className="text-xs">Subir foto</span>
          </div>
        )}
        <input type="file" accept="image/*" onChange={onUpload} className="hidden" disabled={uploading} />
      </label>
    </div>
  );
}

function CaseForm({ initial, onCancel, onSave, saving }) {
  const [item, setItem] = useState(initial || emptyCase());
  const [uploadingSlot, setUploadingSlot] = useState(null);

  const uploadTo = async (field, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSlot(field);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setItem((prev) => ({ ...prev, [field]: file_url }));
    } catch {
      toast.error("Error al subir la foto");
    }
    setUploadingSlot(null);
    e.target.value = "";
  };

  const submit = () => {
    if (!item.title.trim()) { toast.error("El título es obligatorio"); return; }
    if (!item.before_photo || !item.after_photo) { toast.error("Sube ambas fotos (antes y después)"); return; }
    onSave(item);
  };

  return (
    <div className="border border-primary/30 rounded-xl p-4 bg-accent/20 space-y-4">
      <div>
        <label className="text-xs font-medium mb-1 block">Título del caso *</label>
        <Input value={item.title} onChange={(e) => setItem({ ...item, title: e.target.value })} className="rounded-xl text-sm" placeholder="Ej: Tratamiento de ortodoncia, 8 meses" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <PhotoSlot label="Antes *" url={item.before_photo} onUpload={(e) => uploadTo("before_photo", e)} uploading={uploadingSlot === "before_photo"} />
        <PhotoSlot label="Después *" url={item.after_photo} onUpload={(e) => uploadTo("after_photo", e)} uploading={uploadingSlot === "after_photo"} />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block">Descripción (opcional)</label>
        <textarea
          value={item.description || ""}
          onChange={(e) => { if (e.target.value.length <= 800) setItem({ ...item, description: e.target.value }); }}
          className="w-full min-h-[70px] px-3 py-2 text-sm border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          placeholder="Cuéntale al paciente qué se hizo en este caso"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} className="rounded-xl">Cancelar</Button>
        <Button size="sm" onClick={submit} disabled={saving} className="rounded-xl">{saving ? "Guardando…" : "Guardar caso"}</Button>
      </div>
    </div>
  );
}

export default function CasesManager({ specialistId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    if (!specialistId) { setLoading(false); return; }
    setLoading(true);
    try {
      const list = await base44.entities.SpecialistCase.filter({ specialist_id: specialistId });
      setItems(list.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
    } catch {
      toast.error("Error al cargar casos de éxito");
    }
    setLoading(false);
  }, [specialistId]);

  useEffect(() => { load(); }, [load]);

  const save = async (data) => {
    setSaving(true);
    try {
      const payload = { title: data.title, description: data.description || "", before_photo: data.before_photo, after_photo: data.after_photo };
      if (data.id) {
        await base44.entities.SpecialistCase.update(data.id, payload);
      } else {
        await base44.entities.SpecialistCase.create({ ...payload, specialist_id: specialistId });
      }
      toast.success(data.id ? "Caso actualizado" : "Caso agregado");
      setEditingId(null);
      await load();
    } catch (e) {
      toast.error("Error al guardar: " + e.message);
    }
    setSaving(false);
  };

  const remove = async (id) => {
    setSaving(true);
    try {
      await base44.entities.SpecialistCase.delete(id);
      toast.success("Caso eliminado");
      setConfirmId(null);
      await load();
    } catch (e) {
      toast.error("Error al eliminar: " + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> Casos de éxito (antes / después)
        </h2>
        {editingId === null && (
          <Button size="sm" variant="outline" onClick={() => setEditingId("new")} className="rounded-xl gap-1.5">
            <Plus className="w-4 h-4" /> Agregar caso
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Stethoscope className="w-6 h-6 text-primary animate-bounce" strokeWidth={1.75} />
        </div>
      ) : (
        <div className="space-y-3">
          {editingId === "new" && <CaseForm onCancel={() => setEditingId(null)} onSave={save} saving={saving} />}
          {items.length === 0 && editingId !== "new" && (
            <p className="text-sm text-muted-foreground py-4 text-center">Sin casos de éxito. Agrega el primero.</p>
          )}
          {items.map((c) => (
            <div key={c.id} className="border border-border/60 rounded-xl p-4 space-y-2">
              {editingId === c.id ? (
                <CaseForm initial={{ ...c }} onCancel={() => setEditingId(null)} onSave={save} saving={saving} />
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex gap-1 flex-shrink-0">
                      <img src={c.before_photo} alt="Antes" className="w-12 h-12 rounded-lg object-cover border border-border/50" />
                      <img src={c.after_photo} alt="Después" className="w-12 h-12 rounded-lg object-cover border border-border/50" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.title}</p>
                      {c.description && <p className="text-xs text-muted-foreground line-clamp-1">{c.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => setEditingId(c.id)} className="h-8 w-8"><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setConfirmId(c.id)} className="h-8 w-8 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              )}
              {confirmId === c.id && (
                <div className="flex items-center gap-2 bg-destructive/10 rounded-lg p-2 mt-2">
                  <span className="text-xs text-destructive flex-1">¿Eliminar este caso?</span>
                  <Button size="sm" variant="destructive" onClick={() => remove(c.id)} className="h-7 text-xs">Sí, eliminar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)} className="h-7 text-xs">No</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
