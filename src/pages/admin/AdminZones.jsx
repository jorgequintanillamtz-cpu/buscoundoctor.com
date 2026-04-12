import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function AdminZones() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", city: "Monterrey", state: "Nuevo León", active: true });

  const load = async () => {
    const data = await base44.entities.Zone.list("-created_date");
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (f, v) => setForm(prev => ({ ...prev, [f]: v }));

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", city: "Monterrey", state: "Nuevo León", active: true });
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ name: item.name, city: item.city || "", state: item.state || "", active: item.active !== false });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (editing) {
      await base44.entities.Zone.update(editing.id, form);
      toast.success("Zona actualizada");
    } else {
      await base44.entities.Zone.create(form);
      toast.success("Zona creada");
    }
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta zona?")) return;
    await base44.entities.Zone.delete(id);
    toast.success("Zona eliminada");
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-bold text-2xl text-foreground">Zonas</h1>
        <Button className="gap-2 rounded-xl" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Agregar
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.id} className="bg-card rounded-2xl border border-border/50 p-5 flex items-start justify-between">
            <div>
              <h3 className="font-heading font-semibold text-foreground">{item.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{item.city}, {item.state}</p>
              <span className={`inline-block w-1.5 h-1.5 rounded-full mt-2 ${item.active !== false ? 'bg-green-500' : 'bg-red-400'}`} />
            </div>
            <div className="flex gap-1">
              <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
              <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? "Editar" : "Nueva"} Zona</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Nombre *</label>
              <Input value={form.name} onChange={e => update("name", e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Ciudad</label>
              <Input value={form.city} onChange={e => update("city", e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Estado</label>
              <Input value={form.state} onChange={e => update("state", e.target.value)} className="rounded-xl" />
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