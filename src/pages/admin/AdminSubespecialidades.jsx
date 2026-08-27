import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { GraduationCap, Search, Plus, Pencil, Trash2, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePaginatedList } from "@/api/usePaginatedList";
import Pagination from "@/components/admin/Pagination";
import { slugify } from "@/lib/citySlug";

const EMPTY_FORM = { name: "", parent_specialty_id: "", slug: "", description: "", active: true };

// Banco de subespecialidades (entidad Subspecialty): separado del banco de
// especialidades (Specialty) a propósito, mismo motivo que Condition vive
// separado -- cada subespecialidad cuelga de una especialidad base vía
// parent_specialty_id, y es lo que el doctor elige en su panel
// (SubspecialtiesManager.jsx) para que un paciente que busca, por ejemplo,
// "Cirugía Maxilofacial" encuentre directo a esos doctores sin mezclarse
// con dentistas generales. Basado en el listado oficial de CONACEM.
export default function AdminSubespecialidades() {
  const [items, setItems] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [editing, setEditing] = useState(null); // null = cerrado, {} = nuevo, objeto = editando
  const [form, setForm] = useState(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const loadData = async () => {
    const [subList, specList] = await Promise.all([
      base44.entities.Subspecialty.list("name", 500),
      base44.entities.Specialty.filter({ active: true }),
    ]);
    setItems(subList);
    setSpecialties(specList.sort((a, b) => a.name.localeCompare(b.name, "es")));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const specialtyName = (id) => specialties.find((s) => s.id === id)?.name || "—";

  const filtered = useMemo(() => {
    let list = items;
    if (specialtyFilter) list = list.filter((s) => s.parent_specialty_id === specialtyFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || specialtyName(s.parent_specialty_id).toLowerCase().includes(q));
    }
    return list;
  }, [items, specialtyFilter, search, specialties]);

  const { pageItems: paged, page, setPage, totalPages } = usePaginatedList(filtered, {
    pageSize,
    resetKey: `${specialtyFilter}|${search}|${pageSize}`,
  });

  const openNew = () => {
    setForm(EMPTY_FORM);
    setSlugTouched(false);
    setEditing({});
  };

  const openEdit = (item) => {
    setForm({
      name: item.name || "",
      parent_specialty_id: item.parent_specialty_id || "",
      slug: item.slug || "",
      description: item.description || "",
      active: item.active !== false,
    });
    setSlugTouched(true);
    setEditing(item);
  };

  const handleNameChange = (name) => {
    setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("El nombre es obligatorio"); return; }
    if (!form.parent_specialty_id) { toast.error("Elige la especialidad base"); return; }
    if (!form.slug.trim()) { toast.error("El slug es obligatorio"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        parent_specialty_id: form.parent_specialty_id,
        slug: slugify(form.slug),
        description: form.description || "",
        active: form.active,
      };
      if (editing?.id) {
        await base44.entities.Subspecialty.update(editing.id, payload);
        toast.success("Subespecialidad actualizada");
      } else {
        await base44.entities.Subspecialty.create(payload);
        toast.success("Subespecialidad creada");
      }
      setEditing(null);
      await loadData();
    } catch (e) {
      toast.error("Error al guardar: " + e.message);
    }
    setSaving(false);
  };

  const toggleActive = async (item) => {
    const previous = item.active !== false;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, active: !previous } : i)));
    try {
      await base44.entities.Subspecialty.update(item.id, { active: !previous });
    } catch (e) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, active: previous } : i)));
      toast.error("No se pudo actualizar: " + e.message);
    }
  };

  const handleDelete = async (id) => {
    setSaving(true);
    try {
      await base44.entities.Subspecialty.delete(id);
      toast.success("Subespecialidad eliminada");
      setConfirmDeleteId(null);
      await loadData();
    } catch (e) {
      toast.error("Error al eliminar: " + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" /> Banco de subespecialidades
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Cada subespecialidad cuelga de una especialidad base y es completamente buscable/filtrable por su cuenta -- un paciente que busca "Cirugía Maxilofacial" encuentra directo a esos doctores, sin mezclarse con la lista general de "Dentista". Basado en el listado oficial de CONACEM.
          </p>
        </div>
        <Button onClick={openNew} className="rounded-xl gap-1.5">
          <Plus className="w-4 h-4" /> Nueva subespecialidad
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 bg-card border border-border/50 rounded-xl px-3 py-2 flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar subespecialidad o especialidad base..."
            className="bg-transparent text-sm outline-none flex-1"
          />
        </div>
        <select
          value={specialtyFilter}
          onChange={(e) => setSpecialtyFilter(e.target.value)}
          className="h-10 px-3 text-sm bg-card border border-border/50 rounded-xl"
        >
          <option value="">Todas las especialidades</option>
          {specialties.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="h-10 px-3 text-sm bg-card border border-border/50 rounded-xl"
        >
          {[30, 50, 100, 200].map((n) => <option key={n} value={n}>{n} por página</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Cargando…</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{filtered.length} de {items.length} subespecialidades</p>
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="px-4 py-2.5 font-medium">Subespecialidad</th>
                  <th className="px-4 py-2.5 font-medium">Especialidad base</th>
                  <th className="px-4 py-2.5 font-medium">Slug</th>
                  <th className="px-4 py-2.5 font-medium">Activa</th>
                  <th className="px-4 py-2.5 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((item) => (
                  <tr key={item.id} className="border-b border-border/30 last:border-0 hover:bg-accent/20">
                    <td className="px-4 py-2.5 font-medium text-foreground">{item.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{specialtyName(item.parent_specialty_id)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{item.slug}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => toggleActive(item)} className={`text-xs font-semibold px-2 py-1 rounded-full ${item.active !== false ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                        {item.active !== false ? "Activa" : "Inactiva"}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(item)} className="h-8 w-8"><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setConfirmDeleteId(item.id)} className="h-8 w-8 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">Sin resultados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      {editing !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-card rounded-2xl border border-border/50 p-6 w-full max-w-lg space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold text-lg">{editing?.id ? "Editar subespecialidad" : "Nueva subespecialidad"}</h2>
              <button onClick={() => setEditing(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Nombre *</label>
              <input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-background border border-input rounded-xl"
                placeholder="Ej: Cirugía Maxilofacial"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Especialidad base *</label>
              <select
                value={form.parent_specialty_id}
                onChange={(e) => setForm((f) => ({ ...f, parent_specialty_id: e.target.value }))}
                className="w-full h-10 px-3 text-sm bg-background border border-input rounded-xl"
              >
                <option value="">Selecciona una especialidad</option>
                {specialties.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Slug *</label>
              <input
                value={form.slug}
                onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: e.target.value })); }}
                className="w-full h-10 px-3 text-sm bg-background border border-input rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Descripción (opcional)</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full min-h-[70px] px-3 py-2 text-sm border border-input rounded-xl resize-none"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="w-4 h-4 accent-primary" />
              Activa (visible para doctores y en búsquedas)
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditing(null)} className="rounded-xl">Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="rounded-xl">{saving ? "Guardando…" : "Guardar"}</Button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-card rounded-2xl border border-border/50 p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="font-heading font-semibold">¿Eliminar subespecialidad?</h2>
            </div>
            <p className="text-sm text-muted-foreground">Si algún doctor ya la tiene marcada, dejará de aparecerle. Considera desactivarla en vez de eliminarla si no estás seguro.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmDeleteId(null)} className="rounded-xl">Cancelar</Button>
              <Button variant="destructive" onClick={() => handleDelete(confirmDeleteId)} disabled={saving} className="rounded-xl">Sí, eliminar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
