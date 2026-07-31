import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function AdminSpecialties() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", slug: "", icon: "", description: "", active: true });

  const load = async () => {
    const data = await base44.entities.Specialty.list("-created_date");
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (f, v) => setForm(prev => ({ ...prev, [f]: v }));

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", slug: "", icon: "", description: "", active: true });
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ name: item.name, slug: item.slug, icon: item.icon || "", description: item.description || "", active: item.active !== false });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const data = {
      ...form,
      slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/g, "-").replace(/(^-|-$)/g, ""),
    };
    if (editing) {
      await base44.entities.Specialty.update(editing.id, data);
      toast.success("Especialidad actualizada");
    } else {
      await base44.entities.Specialty.create(data);
      toast.success("Especialidad creada");
    }
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta especialidad?")) return;
    await base44.entities.Specialty.delete(id);
    toast.success("Especialidad eliminada");
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-8 h-8 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-bold text-2xl text-foreground">Especialidades</h1>
        <Button className="gap-2 rounded-xl" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Agregar
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.id} className="bg-card rounded-2xl border border-border/50 p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-heading font-semibold text-foreground">{item.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(item)} aria-label="Editar especialidad" className="p-1.5 rounded-lg hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                <button onClick={() => handleDelete(item.id)} aria-label="Eliminar especialidad" className="p-1.5 rounded-lg hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              <span>Ícono: {item.icon || "—"}</span>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${item.active !== false ? 'bg-green-500' : 'bg-red-400'}`} />
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? "Editar" : "Nueva"} Especialidad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Nombre *</label>
              <Input value={form.name} onChange={e => update("name", e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Slug</label>
              <Input value={form.slug} onChange={e => update("slug", e.target.value)} placeholder="auto-generado" className="rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Ícono (nombre Lucide)</label>
              <Input value={form.icon} onChange={e => update("icon", e.target.value)} placeholder="Heart, Brain, etc." className="rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Descripción</label>
              <Input value={form.description} onChange={e => update("description", e.target.value)} className="rounded-xl" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={v => update("active", v)} />
              <span className="text-sm">Activo</span>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button onClick={handleSave} className="rounded-xl">{editing ? "Guardar" : "Crear"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}