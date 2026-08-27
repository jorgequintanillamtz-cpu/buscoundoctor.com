import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { fileToWebP } from "@/lib/fileToWebP";
import { Plus, Trash2, Pencil, Cpu, Sparkles, Stethoscope, X, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const TYPES = [
  { v: "tecnologia", label: "Tecnología / equipo", icon: Cpu },
  { v: "tratamiento", label: "Tratamiento especial", icon: Sparkles },
];

const TYPE_META = (v) => TYPES.find((t) => t.v === v) || TYPES[0];

// El schema guarda "benefits" como un solo string (una línea por beneficio,
// igual que otros campos de listas en esta app, ej. symptoms/causes de
// Condition) -- pero en el formulario se edita como bullets individuales
// para que quede más claro qué es cada beneficio y sea fácil reordenar o
// borrar uno solo. splitBenefits/joinBenefits convierten entre ambos.
const splitBenefits = (s) => {
  const lines = (s || "").split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.length > 0 ? lines : [""];
};
const joinBenefits = (arr) => arr.map((l) => l.trim()).filter(Boolean).join("\n");

const emptyHighlight = () => ({
  type: "tecnologia",
  name: "",
  benefitsList: [""],
  photo_url: "",
});

function HighlightForm({ initial, onCancel, onSave, saving }) {
  const [item, setItem] = useState(
    initial ? { ...initial, benefitsList: splitBenefits(initial.benefits) } : emptyHighlight()
  );
  const [uploading, setUploading] = useState(false);

  const setBullet = (i, value) => {
    setItem((prev) => {
      const next = [...prev.benefitsList];
      next[i] = value;
      return { ...prev, benefitsList: next };
    });
  };

  const addBullet = () => setItem((prev) => ({ ...prev, benefitsList: [...prev.benefitsList, ""] }));

  const removeBullet = (i) => {
    setItem((prev) => {
      const next = prev.benefitsList.filter((_, idx) => idx !== i);
      return { ...prev, benefitsList: next.length > 0 ? next : [""] };
    });
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const optimized = await fileToWebP(file);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: optimized });
      setItem((prev) => ({ ...prev, photo_url: file_url }));
    } catch {
      toast.error("Error al subir la imagen");
    }
    setUploading(false);
    e.target.value = "";
  };

  const submit = () => {
    if (!item.name.trim()) { toast.error("El nombre es obligatorio"); return; }
    const benefits = joinBenefits(item.benefitsList);
    if (!benefits) { toast.error("Agrega al menos un beneficio"); return; }
    onSave({ ...item, benefits });
  };

  return (
    <div className="border border-primary/30 rounded-xl p-4 bg-accent/20 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-3">
        <div>
          <label className="text-xs font-medium mb-1 block">Tipo *</label>
          <select
            value={item.type}
            onChange={(e) => setItem({ ...item, type: e.target.value })}
            className="w-full h-9 px-3 text-sm bg-background border border-input rounded-xl"
          >
            {TYPES.map((t) => (
              <option key={t.v} value={t.v}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">
            {item.type === "tratamiento" ? "Nombre del tratamiento *" : "Nombre de la máquina/equipo *"}
          </label>
          <Input
            value={item.name}
            onChange={(e) => setItem({ ...item, name: e.target.value })}
            className="rounded-xl text-sm"
            placeholder={item.type === "tratamiento" ? "Ej: Terapia de ondas de choque" : "Ej: Láser CO2 fraccionado"}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
        <div>
          <label className="text-xs font-medium mb-1 block">Beneficios *</label>
          <div className="space-y-1.5">
            {item.benefitsList.map((b, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                <Input
                  value={b}
                  onChange={(e) => setBullet(i, e.target.value)}
                  className="rounded-xl text-sm h-8"
                  placeholder="Ej: Recuperación más rápida"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeBullet(i)}
                  disabled={item.benefitsList.length === 1 && !b}
                  className="h-8 w-8 flex-shrink-0 text-muted-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={addBullet} className="mt-1.5 gap-1.5 text-xs h-7 px-2">
            <Plus className="w-3.5 h-3.5" /> Agregar beneficio
          </Button>
        </div>

        <div>
          <label className="text-xs font-medium mb-1 block">Foto (opcional)</label>
          <label className="block w-28 h-28 rounded-xl border border-dashed border-border overflow-hidden cursor-pointer hover:bg-accent/30 transition-colors relative">
            {item.photo_url ? (
              <img src={item.photo_url} alt={item.name || "Foto"} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                <span className="text-[10px] text-center px-1">Subir foto</span>
              </div>
            )}
            <input type="file" accept="image/*" onChange={uploadPhoto} className="hidden" disabled={uploading} />
          </label>
          {item.photo_url && (
            <button type="button" onClick={() => setItem((prev) => ({ ...prev, photo_url: "" }))} className="text-[11px] text-muted-foreground hover:text-destructive mt-1">
              Quitar foto
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} className="rounded-xl">Cancelar</Button>
        <Button size="sm" onClick={submit} disabled={saving} className="rounded-xl">
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

// Deja que el doctor presuma en su perfil público equipos/tecnología de
// punta o tratamientos especiales que ofrece, cada uno con su nombre,
// beneficios (por bullets) y una foto opcional (ver SpecialistHighlights.jsx
// para cómo se muestra). Entidad separada de Specialist a propósito -- mismo
// patrón que SpecialistEducation/PremiumStatus (ver comentario en el schema).
export default function HighlightsManager({ specialistId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    if (!specialistId) { setLoading(false); return; }
    setLoading(true);
    try {
      const list = await base44.entities.SpecialistHighlight.filter({ specialist_id: specialistId });
      setItems(list.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
    } catch {
      toast.error("Error al cargar tecnología y tratamientos");
    }
    setLoading(false);
  }, [specialistId]);

  useEffect(() => { load(); }, [load]);

  const save = async (data) => {
    setSaving(true);
    try {
      const payload = {
        type: data.type,
        name: data.name.trim(),
        benefits: data.benefits,
        photo_url: data.photo_url || "",
      };
      if (data.id) {
        await base44.entities.SpecialistHighlight.update(data.id, payload);
      } else {
        await base44.entities.SpecialistHighlight.create({ ...payload, specialist_id: specialistId, display_order: items.length });
      }
      toast.success(data.id ? "Actualizado" : "Agregado");
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
      await base44.entities.SpecialistHighlight.delete(id);
      toast.success("Registro eliminado");
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
        <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">Tecnología y tratamientos</h2>
        {editingId === null && (
          <Button size="sm" variant="outline" onClick={() => setEditingId("new")} className="rounded-xl gap-1.5">
            <Plus className="w-4 h-4" /> Agregar
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Presume equipos, tecnología de punta o tratamientos especiales que ofreces. Aparecen en tu perfil público justo debajo de "Experiencia".
      </p>

      {loading ? (
        <div className="flex justify-center py-6">
          <Stethoscope className="w-9 h-9 text-primary animate-bounce" strokeWidth={1.75} />
        </div>
      ) : (
        <div className="space-y-3">
          {editingId === "new" && (
            <HighlightForm onCancel={() => setEditingId(null)} onSave={save} saving={saving} />
          )}

          {items.length === 0 && editingId !== "new" && (
            <p className="text-sm text-muted-foreground py-4 text-center">Todavía no has agregado ninguna. Agrega la primera.</p>
          )}

          {items.map((h) => {
            const meta = TYPE_META(h.type);
            const Icon = meta.icon;
            const benefits = (h.benefits || "").split("\n").map((b) => b.trim()).filter(Boolean);
            return (
              <div key={h.id} className="border border-border/60 rounded-xl p-4 space-y-2">
                {editingId === h.id ? (
                  <HighlightForm initial={{ ...h }} onCancel={() => setEditingId(null)} onSave={save} saving={saving} />
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {h.photo_url ? (
                        <img src={h.photo_url} alt={h.name} className="w-14 h-14 rounded-lg object-cover border border-border/50 flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg border border-border/50 bg-muted flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="w-5 h-5 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-sm font-medium truncate">{h.name}</span>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{meta.label}</span>
                        </div>
                        {benefits.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {benefits.map((b, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/80">
                                <span className="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => setEditingId(h.id)} className="h-8 w-8">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setConfirmId(h.id)} className="h-8 w-8 text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
                {confirmId === h.id && (
                  <div className="flex items-center gap-2 bg-destructive/10 rounded-lg p-2 mt-2">
                    <span className="text-xs text-destructive flex-1">¿Eliminar este registro?</span>
                    <Button size="sm" variant="destructive" onClick={() => remove(h.id)} className="h-7 text-xs">Sí, eliminar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)} className="h-7 text-xs">No</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
