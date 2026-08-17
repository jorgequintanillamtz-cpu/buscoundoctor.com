import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Stethoscope, Users, ChevronRight, Star, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

// Cada registro de esta entidad (Zone, el nombre interno no cambió) es una
// ciudad completa del directorio -- ya no hay un nivel de zona/colonia
// dentro de una ciudad. El campo `city` se mantiene igual al `name` en cada
// guardado (varias partes del código todavía lo leen) para que no puedan
// volver a desalinearse.
export default function AdminZones() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", state: "Nuevo León", active: true });

  const [filterState, setFilterState] = useState("all");
  const [filterCity, setFilterCity] = useState("all");

  const [detailCity, setDetailCity] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailStats, setDetailStats] = useState(null);

  const load = async () => {
    const data = await base44.entities.Zone.list("-created_date");
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (f, v) => setForm(prev => ({ ...prev, [f]: v }));

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", state: "Nuevo León", active: true });
    setDialogOpen(true);
  };

  const openEdit = (item, e) => {
    e.stopPropagation();
    setEditing(item);
    setForm({ name: item.name, state: item.state || "", active: item.active !== false });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = { ...form, city: form.name };
    if (editing) {
      await base44.entities.Zone.update(editing.id, payload);
      toast.success("Ciudad actualizada");
    } else {
      await base44.entities.Zone.create(payload);
      toast.success("Ciudad creada");
    }
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm("¿Eliminar esta ciudad?")) return;
    await base44.entities.Zone.delete(id);
    toast.success("Ciudad eliminada");
    load();
  };

  // Filtro estado -> ciudad. El de ciudad se limita a las del estado elegido.
  const states = useMemo(() => Array.from(new Set(items.map(i => i.state).filter(Boolean))).sort((a, b) => a.localeCompare(b, "es")), [items]);
  const citiesInState = useMemo(
    () => items.filter(i => filterState === "all" || i.state === filterState),
    [items, filterState]
  );
  const visibleItems = useMemo(
    () => items.filter(i => (filterState === "all" || i.state === filterState) && (filterCity === "all" || i.name === filterCity)),
    [items, filterState, filterCity]
  );

  const handleFilterState = (v) => {
    setFilterState(v);
    setFilterCity("all"); // cambiar de estado resetea la ciudad elegida
  };

  const openDetail = async (city) => {
    setDetailCity(city);
    setDetailLoading(true);
    setDetailStats(null);
    try {
      const [allSpecialists, premiumStatuses] = await Promise.all([
        base44.entities.Specialist.list("-created_date", 2000),
        base44.entities.PremiumStatus.filter({ plan_slug: "premium" }).catch(() => []),
      ]);
      const inCity = allSpecialists.filter((s) => (s.zone || s.location) === city.name);
      const premiumIds = new Set(premiumStatuses.map((p) => p.specialist_id));

      const bySpecialty = {};
      const byStatus = {};
      let activos = 0;
      let premium = 0;
      let ratingSum = 0;
      let ratingCount = 0;

      inCity.forEach((s) => {
        bySpecialty[s.specialty] = (bySpecialty[s.specialty] || 0) + 1;
        const status = s.publication_status || "draft";
        byStatus[status] = (byStatus[status] || 0) + 1;
        if (s.active !== false) activos += 1;
        if (premiumIds.has(s.id)) premium += 1;
        if (typeof s.rating === "number") { ratingSum += s.rating; ratingCount += 1; }
      });

      setDetailStats({
        total: inCity.length,
        activos,
        inactivos: inCity.length - activos,
        premium,
        bySpecialty: Object.entries(bySpecialty).sort((a, b) => b[1] - a[1]),
        byStatus,
        avgRating: ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : null,
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const STATUS_LABELS = {
    published: "Publicados",
    pending_review: "En revisión",
    draft: "Borrador",
    suspended: "Suspendidos",
    rejected: "Rechazados",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-bold text-2xl text-foreground">Ciudades</h1>
        <Button className="gap-2 rounded-xl" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Agregar
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="w-full sm:w-56">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Estado</label>
          <Select value={filterState} onValueChange={handleFilterState}>
            <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-56">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Ciudad</label>
          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las ciudades</SelectItem>
              {citiesInState.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleItems.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => openDetail(item)}
            className="text-left bg-card rounded-2xl border border-border/50 p-5 flex items-start justify-between hover:border-primary/40 hover:shadow-sm transition-all"
          >
            <div>
              <h3 className="font-heading font-semibold text-foreground">{item.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{item.state}</p>
              <span className={`inline-block w-1.5 h-1.5 rounded-full mt-2 ${item.active !== false ? 'bg-green-500' : 'bg-red-400'}`} />
            </div>
            <div className="flex items-center gap-1">
              <span onClick={(e) => openEdit(item, e)} role="button" aria-label="Editar ciudad" className="p-1.5 rounded-lg hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></span>
              <span onClick={(e) => handleDelete(item.id, e)} role="button" aria-label="Eliminar ciudad" className="p-1.5 rounded-lg hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></span>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-1" />
            </div>
          </button>
        ))}
        {visibleItems.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full text-center py-10">No hay ciudades con este filtro.</p>
        )}
      </div>

      {/* Crear / editar ciudad */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? "Editar" : "Nueva"} ciudad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Nombre de la ciudad *</label>
              <Input value={form.name} onChange={e => update("name", e.target.value)} className="rounded-xl" placeholder="Ej. Monterrey" />
              <p className="text-xs text-muted-foreground mt-1">Define el segmento de ciudad en las URLs públicas: /{'{especialidad}'}/{form.name ? form.name.toLowerCase() : "..."}</p>
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

      {/* Detalle: estadísticas de doctores de la ciudad elegida */}
      <Dialog open={!!detailCity} onOpenChange={(open) => !open && setDetailCity(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">{detailCity?.name}</DialogTitle>
          </DialogHeader>
          {detailLoading || !detailStats ? (
            <div className="flex items-center justify-center py-10">
              <Stethoscope className="w-8 h-8 text-primary animate-bounce" strokeWidth={1.75} />
            </div>
          ) : (
            <div className="space-y-5 mt-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-heading font-bold text-foreground">{detailStats.total}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1"><Users className="w-3 h-3" /> Doctores</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-heading font-bold text-foreground">{detailStats.premium}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1"><Crown className="w-3 h-3" /> Premium</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-heading font-bold text-foreground">{detailStats.avgRating ?? "—"}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1"><Star className="w-3 h-3" /> Calif. prom.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> {detailStats.activos} activos</span>
                <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> {detailStats.inactivos} inactivos</span>
              </div>

              <div>
                <h4 className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-2">Por especialidad</h4>
                {detailStats.bySpecialty.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin doctores registrados en esta ciudad todavía.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {detailStats.bySpecialty.map(([name, count]) => (
                      <div key={name} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{name}</span>
                        <span className="text-muted-foreground font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {Object.keys(detailStats.byStatus).length > 0 && (
                <div>
                  <h4 className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-2">Estado de publicación</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(detailStats.byStatus).map(([status, count]) => (
                      <span key={status} className="text-xs bg-accent text-accent-foreground px-2.5 py-1 rounded-full">
                        {STATUS_LABELS[status] || status}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
