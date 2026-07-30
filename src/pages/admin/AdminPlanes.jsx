import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Star, ExternalLink, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const emptyForm = {
  name: "", slug: "", tagline: "", price_monthly: "0", price_yearly: "0",
  currency: "MXN", cta_label: "", cta_url: "/registro-medico",
  is_featured: false, display_order: "0", active: true,
};

const slugify = (s) => (s || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9\s-]/g, "")
  .trim()
  .replace(/\s+/g, "-")
  .replace(/-+/g, "-");

export default function AdminPlanes() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [featuresInput, setFeaturesInput] = useState("");

  const load = async () => {
    const rows = await base44.entities.Plan.filter({}, "display_order");
    setPlans(rows);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, display_order: String(plans.length) });
    setFeaturesInput("");
    setDialogOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name || "",
      slug: p.slug || "",
      tagline: p.tagline || "",
      price_monthly: String(p.price_monthly ?? 0),
      price_yearly: String(p.price_yearly ?? 0),
      currency: p.currency || "MXN",
      cta_label: p.cta_label || "",
      cta_url: p.cta_url || "/registro-medico",
      is_featured: !!p.is_featured,
      display_order: String(p.display_order ?? 0),
      active: p.active !== false,
    });
    setFeaturesInput((p.features || []).join("\n"));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Ponle un nombre al plan"); return; }
    const data = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      tagline: form.tagline.trim(),
      price_monthly: Number(form.price_monthly) || 0,
      price_yearly: Number(form.price_yearly) || 0,
      currency: form.currency.trim() || "MXN",
      features: featuresInput.split("\n").map((f) => f.trim()).filter(Boolean),
      cta_label: form.cta_label.trim() || "Empezar",
      cta_url: form.cta_url.trim() || "/registro-medico",
      is_featured: form.is_featured,
      display_order: Number(form.display_order) || 0,
      active: form.active,
    };

    try {
      if (editing) {
        await base44.entities.Plan.update(editing.id, data);
        toast.success("Plan actualizado");
      } else {
        await base44.entities.Plan.create(data);
        toast.success("Plan creado");
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error("No se pudo guardar: " + e.message);
    }
  };

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar el plan "${nombre}"? Ya no se mostrará en /planes.`)) return;
    await base44.entities.Plan.delete(id);
    setPlans((prev) => prev.filter((p) => p.id !== id));
    toast.success("Plan eliminado");
  };

  const toggleActive = async (p) => {
    const next = !p.active;
    setPlans((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: next } : x)));
    try {
      await base44.entities.Plan.update(p.id, { active: next });
    } catch (e) {
      setPlans((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: p.active } : x)));
      toast.error("No se pudo actualizar: " + e.message);
    }
  };

  const move = async (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= plans.length) return;
    const a = plans[index];
    const b = plans[target];
    const next = [...plans];
    [next[index], next[target]] = [next[target], next[index]];
    setPlans(next);
    await Promise.all([
      base44.entities.Plan.update(a.id, { display_order: b.display_order ?? target }),
      base44.entities.Plan.update(b.id, { display_order: a.display_order ?? index }),
    ]).catch(() => {});
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
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Planes y precios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lo que edites aquí se refleja al instante en{" "}
            <Link to="/planes" target="_blank" className="text-primary hover:underline inline-flex items-center gap-1">
              /planes <ExternalLink className="w-3 h-3" />
            </Link>
          </p>
        </div>
        <Button onClick={openCreate} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" />
          Nuevo plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="mb-4">Todavía no hay planes creados.</p>
          <Button onClick={openCreate} className="rounded-xl gap-2">
            <Plus className="w-4 h-4" /> Crear el primero
          </Button>
        </div>
      ) : (
        <div className="space-y-3 mt-6">
          {plans.map((p, i) => (
            <div key={p.id} className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-4">
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === plans.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-foreground">{p.name}</p>
                  {p.is_featured && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium flex items-center gap-1">
                      <Star className="w-3 h-3" fill="currentColor" /> Más popular
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  ${p.price_monthly || 0} {p.currency || "MXN"}/mes
                  {p.price_yearly > 0 && ` · $${p.price_yearly} ${p.currency || "MXN"}/año`}
                  {" · "}{(p.features || []).length} función{(p.features || []).length !== 1 ? "es" : ""}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <Switch checked={p.active !== false} onCheckedChange={() => toggleActive(p)} />
                <Button variant="ghost" size="icon" aria-label="Editar plan" className="rounded-xl h-8 w-8" onClick={() => openEdit(p)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Eliminar plan" className="rounded-xl h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(p.id, p.name)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar plan" : "Nuevo plan"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre</label>
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Ej: Premium" className="rounded-xl" />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Descripción corta</label>
              <Input value={form.tagline} onChange={(e) => update("tagline", e.target.value)} placeholder="Ej: Todas las funciones para destacar" className="rounded-xl" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Precio mensual (MXN)</label>
                <Input type="number" value={form.price_monthly} onChange={(e) => update("price_monthly", e.target.value)} className="rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Precio anual (MXN)</label>
                <Input type="number" value={form.price_yearly} onChange={(e) => update("price_yearly", e.target.value)} placeholder="0 si no aplica" className="rounded-xl" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Funciones incluidas (una por línea)</label>
              <Textarea value={featuresInput} onChange={(e) => setFeaturesInput(e.target.value)} rows={6} placeholder={"Perfil público en el directorio\nContacto por WhatsApp\n..."} className="rounded-xl" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Texto del botón</label>
                <Input value={form.cta_label} onChange={(e) => update("cta_label", e.target.value)} placeholder="Ej: Quiero Premium" className="rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Enlace del botón</label>
                <Input value={form.cta_url} onChange={(e) => update("cta_url", e.target.value)} placeholder="/registro-medico" className="rounded-xl" />
              </div>
            </div>

            <div className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Marcar como "Más popular"</p>
                <p className="text-xs text-muted-foreground">Se resalta con otro color en /planes</p>
              </div>
              <Switch checked={form.is_featured} onCheckedChange={(v) => update("is_featured", v)} />
            </div>

            <div className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Activo</p>
                <p className="text-xs text-muted-foreground">Si lo apagas, deja de mostrarse en /planes</p>
              </div>
              <Switch checked={form.active} onCheckedChange={(v) => update("active", v)} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button className="rounded-xl" onClick={handleSave}>Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
