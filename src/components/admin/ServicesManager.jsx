import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Pencil, DollarSign, Stethoscope } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const FIRST_CONSULT_NAME = "Consulta por primera vez";
const emptyService = () => ({ name: "", price: "", details: "" });

function ServiceForm({ initial, onCancel, onSave, saving }) {
  const [item, setItem] = useState(initial || emptyService());

  const submit = () => {
    if (!item.name.trim()) { toast.error("El nombre del servicio es obligatorio"); return; }
    if (!item.price || Number(item.price) <= 0) { toast.error("Ingresa un precio válido"); return; }
    onSave(item);
  };

  return (
    <div className="border border-primary/30 rounded-xl p-4 bg-accent/20 space-y-3">
      <div>
        <label className="text-xs font-medium mb-1 block">Nombre del servicio *</label>
        <Input value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} className="rounded-xl text-sm" placeholder="Ej: Primera visita Pediatría" />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block">Precio (MXN) *</label>
        <div className="relative">
          <span className="absolute left-3 top-2 text-sm text-muted-foreground">$</span>
          <Input type="number" value={item.price} onChange={(e) => setItem({ ...item, price: e.target.value })} className="rounded-xl text-sm pl-6" placeholder="600" min={0} />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block">Detalles (opcional)</label>
        <textarea
          value={item.details || ""}
          onChange={(e) => { if (e.target.value.length <= 500) setItem({ ...item, details: e.target.value }); }}
          className="w-full min-h-[60px] px-3 py-2 text-sm border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          placeholder="Ej: Incluye revisión general y orientación a los padres"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} className="rounded-xl">Cancelar</Button>
        <Button size="sm" onClick={submit} disabled={saving} className="rounded-xl">{saving ? "Guardando…" : "Guardar"}</Button>
      </div>
    </div>
  );
}

export default function ServicesManager({ specialistId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    if (!specialistId) { setLoading(false); return; }
    setLoading(true);
    try {
      const list = await base44.entities.SpecialistService.filter({ specialist_id: specialistId });
      setItems(list.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
    } catch {
      toast.error("Error al cargar servicios");
    }
    setLoading(false);
  }, [specialistId]);

  useEffect(() => { load(); }, [load]);

  const save = async (data) => {
    setSaving(true);
    try {
      const payload = { name: data.name, price: Number(data.price), details: data.details || "" };
      if (data.id) {
        await base44.entities.SpecialistService.update(data.id, payload);
      } else {
        await base44.entities.SpecialistService.create({ ...payload, specialist_id: specialistId, display_order: items.length });
      }
      toast.success(data.id ? "Servicio actualizado" : "Servicio agregado");
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
      await base44.entities.SpecialistService.delete(id);
      toast.success("Servicio eliminado");
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
          <DollarSign className="w-4 h-4 text-primary" /> Servicios y precios
        </h2>
        {editingId === null && (
          <Button size="sm" variant="outline" onClick={() => setEditingId("new")} className="rounded-xl gap-1.5">
            <Plus className="w-4 h-4" /> Agregar servicio
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground -mt-2">Esto se muestra en tu perfil público de forma informativa — no crea citas ni cobros automáticos.</p>

      {loading ? (
        <div className="flex justify-center py-6">
          <Stethoscope className="w-9 h-9 text-primary animate-bounce" strokeWidth={1.75} />
        </div>
      ) : (
        <div className="space-y-3">
          {editingId === "new" && <ServiceForm onCancel={() => setEditingId(null)} onSave={save} saving={saving} />}
          {items.length === 0 && editingId !== "new" && (
            <div className="border border-dashed border-primary/40 rounded-xl p-4 bg-accent/10 text-center space-y-2">
              <p className="text-sm text-foreground font-medium">Empieza con tu "{FIRST_CONSULT_NAME}"</p>
              <p className="text-xs text-muted-foreground">Este precio es el que se muestra en tu tarjeta cuando los pacientes navegan el directorio.</p>
              <Button
                size="sm"
                onClick={() => setEditingId("new-first")}
                className="rounded-xl gap-1.5"
              >
                <Plus className="w-4 h-4" /> Agregar "{FIRST_CONSULT_NAME}"
              </Button>
            </div>
          )}
          {editingId === "new-first" && (
            <ServiceForm initial={{ name: FIRST_CONSULT_NAME, price: "", details: "" }} onCancel={() => setEditingId(null)} onSave={save} saving={saving} />
          )}
          {items.map((s) => (
            <div key={s.id} className="border border-border/60 rounded-xl p-4 space-y-2">
              {editingId === s.id ? (
                <ServiceForm initial={{ ...s }} onCancel={() => setEditingId(null)} onSave={save} saving={saving} />
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">${s.price?.toLocaleString("es-MX")} MXN</p>
                    {s.details && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{s.details}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => setEditingId(s.id)} className="h-8 w-8"><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setConfirmId(s.id)} className="h-8 w-8 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              )}
              {confirmId === s.id && (
                <div className="flex items-center gap-2 bg-destructive/10 rounded-lg p-2 mt-2">
                  <span className="text-xs text-destructive flex-1">¿Eliminar este servicio?</span>
                  <Button size="sm" variant="destructive" onClick={() => remove(s.id)} className="h-7 text-xs">Sí, eliminar</Button>
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
