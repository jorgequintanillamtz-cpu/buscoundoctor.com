import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { GraduationCap, Search, Plus, Pencil, Trash2, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePaginatedList } from "@/api/usePaginatedList";
import Pagination from "@/components/admin/Pagination";
import { slugify } from "@/lib/citySlug";

const EMPTY_FORM = { name: "", parent_specialty_id: "", slug: "", description: "", active: true };

// Banco de subespecialidades (entidad Subspecialty): separado del banco de
// especialidades (Specialty) a propósito -- mismo patrón que Condition --
// cada subespecialidad cuelga de una especialidad base vía
// parent_specialty_id, y es lo que el doctor elige en su panel
// (SubspecialtiesManager.jsx) para que un paciente que busca, por ejemplo,
// "Cirugía Maxilofacial" encuentre directo a esos doctores sin mezclarse
// con dentistas generales. Basado en el listado oficial de CONACEM. Mismo
// estilo que /admin/enfermedades a propósito, para que los 3 bancos se
// sientan como una sola familia.
export default function AdminSubespecialidades() {
  const [items, setItems] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [pageSize, setPageSize] = useState(30);
  const [editing, setEditing] = useState(null); // null = cerrado, {} = nuevo, objeto = editando
  const [form, setForm] = useState(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

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

  // Especialidades sin ni una subespecialidad en el banco todavía -- lo
  // primero que hay que llenar antes de que un doctor de esa especialidad
  // entre a "elegir cuáles tiene certificadas" y no encuentre nada.
  const specialtiesWithoutSubs = useMemo(() => {
    const covered = new Set(items.map((s) => s.parent_specialty_id));
    return specialties.filter((s) => !covered.has(s.id));
  }, [items, specialties]);
  const gapIds = useMemo(() => new Set(specialtiesWithoutSubs.map((s) => s.id)), [specialtiesWithoutSubs]);

  const filtered = useMemo(() => {
    let list = items;
    if (onlyGaps) list = []; // el filtro de brechas aplica a especialidades, no hay subespecialidades que mostrar
    if (specialtyFilter) list = list.filter((s) => s.parent_specialty_id === specialtyFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || specialtyName(s.parent_specialty_id).toLowerCase().includes(q));
    }
    return list;
  }, [items, specialtyFilter, search, onlyGaps, specialties]);

  const { pageItems: paged, page, setPage, totalPages } = usePaginatedList(filtered, {
    pageSize,
    resetKey: `${specialtyFilter}|${search}|${onlyGaps}|${pageSize}`,
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

  const closeModal = () => setEditing(null);

  const updateField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && !slugTouched) next.slug = slugify(value);
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("El nombre es obligatorio"); return; }
    if (!form.parent_specialty_id) { toast.error("Elige la especialidad base"); return; }
    const slug = (form.slug || slugify(form.name)).trim();
    const duplicate = items.some((s) => s.slug === slug && s.id !== editing?.id);
    if (duplicate) { toast.error("Ya existe una subespecialidad con ese slug. Cámbialo para que sea único."); return; }

    setSaving(true);
    try {
      const payload = { ...form, slug };
      if (editing?.id) {
        await base44.entities.Subspecialty.update(editing.id, payload);
        toast.success("Subespecialidad actualizada");
      } else {
        await base44.entities.Subspecialty.create(payload);
        toast.success("Subespecialidad creada");
      }
      closeModal();
      await loadData();
    } catch (e) {
      toast.error("No se pudo guardar: " + e.message);
    }
    setSaving(false);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.name}"? Si algún doctor ya la tiene marcada, dejará de aparecerle. Esto no se puede deshacer.`)) return;
    try {
      await base44.entities.Subspecialty.delete(item.id);
      setItems((prev) => prev.filter((s) => s.id !== item.id));
      toast.success("Subespecialidad eliminada");
    } catch (e) {
      toast.error("No se pudo eliminar: " + e.message);
    }
  };

  const toggleActive = async (item) => {
    const previous = item.active !== false;
    setItems((prev) => prev.map((s) => (s.id === item.id ? { ...s, active: !previous } : s)));
    try {
      await base44.entities.Subspecialty.update(item.id, { active: !previous });
    } catch (e) {
      setItems((prev) => prev.map((s) => (s.id === item.id ? { ...s, active: previous } : s)));
      toast.error("No se pudo actualizar: " + e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <GraduationCap className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-primary" />
          <h1 className="font-heading font-bold text-2xl text-foreground">Banco de subespecialidades</h1>
        </div>
        <Button onClick={openNew} className="rounded-xl gap-1.5">
          <Plus className="w-4 h-4" /> Agregar subespecialidad
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Cada subespecialidad cuelga de una especialidad base (basado en el listado oficial de CONACEM). Es lo que deja que un paciente que busca, por ejemplo, "Cirugía Maxilofacial" encuentre directo a esos doctores sin mezclarse con la lista general de "Dentista".
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border/50 rounded-2xl p-4">
          <p className="text-2xl font-heading font-bold text-foreground">{items.length}</p>
          <p className="text-xs text-muted-foreground">Subespecialidades en el banco</p>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-4">
          <p className="text-2xl font-heading font-bold text-foreground">{specialties.length - specialtiesWithoutSubs.length}/{specialties.length}</p>
          <p className="text-xs text-muted-foreground">Especialidades con al menos una</p>
        </div>
        <button
          type="button"
          onClick={() => setOnlyGaps((v) => !v)}
          className={`text-left bg-card border rounded-2xl p-4 transition-colors col-span-2 sm:col-span-1 ${onlyGaps ? "border-amber-400 ring-1 ring-amber-400" : "border-border/50 hover:border-amber-300"}`}
        >
          <p className="text-2xl font-heading font-bold text-amber-600 flex items-center gap-1.5">
            <AlertTriangle className="w-5 h-5" /> {specialtiesWithoutSubs.length}
          </p>
          <p className="text-xs text-muted-foreground">Especialidades sin ninguna (clic para ver cuáles)</p>
        </button>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-muted/50 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o especialidad base..."
            className="bg-transparent text-sm outline-none flex-1"
          />
        </div>
        <select
          value={specialtyFilter}
          onChange={(e) => setSpecialtyFilter(e.target.value)}
          className="text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Todas las especialidades</option>
          {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Subespecialidades por página"
        >
          <option value={30}>30 por página</option>
          <option value={50}>50 por página</option>
          <option value={100}>100 por página</option>
          <option value={200}>200 por página</option>
        </select>
        {onlyGaps && (
          <button
            type="button"
            onClick={() => setOnlyGaps(false)}
            className="text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl px-3 py-2 transition-colors"
          >
            Quitar filtro de especialidades sin cubrir
          </button>
        )}
      </div>

      {onlyGaps ? (
        <div className="bg-card border border-border/50 rounded-2xl p-5">
          {specialtiesWithoutSubs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Todas las especialidades tienen al menos una subespecialidad. 🎉</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground mb-3">Especialidades sin ninguna subespecialidad todavía</p>
              <div className="flex flex-wrap gap-2">
                {specialtiesWithoutSubs.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { setOnlyGaps(false); setForm({ ...EMPTY_FORM, parent_specialty_id: s.id }); setSlugTouched(false); setEditing({}); }}
                    className="text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-full transition-colors"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <GraduationCap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Sin resultados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 border-b border-border/50">
                    <tr>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Subespecialidad</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Especialidad base</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Slug</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Activa</th>
                      <th className="text-right px-5 py-3 font-medium text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {paged.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3 font-medium text-foreground">{s.name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${gapIds.has(s.parent_specialty_id) ? "text-amber-700 bg-amber-50" : "text-primary bg-accent"}`}>
                            {specialtyName(s.parent_specialty_id)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{s.slug}</td>
                        <td className="px-4 py-3">
                          <Switch checked={s.active !== false} onCheckedChange={() => toggleActive(s)} />
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(s)} aria-label="Editar" className="p-1.5 rounded-lg hover:bg-muted">
                              <Pencil className="w-4 h-4 text-muted-foreground" />
                            </button>
                            <button onClick={() => handleDelete(s)} aria-label="Eliminar" className="p-1.5 rounded-lg hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={filtered.length} pageSize={pageSize} />
        </>
      )}

      {editing !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={closeModal}>
          <div
            className="bg-card rounded-3xl border border-border/50 w-full max-w-2xl my-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <h2 className="font-heading font-bold text-lg text-foreground">
                {editing?.id ? "Editar subespecialidad" : "Agregar subespecialidad"}
              </h2>
              <button onClick={closeModal} aria-label="Cerrar" className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Nombre</label>
                  <input
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className="w-full text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Ej. Cirugía Maxilofacial"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Especialidad base</label>
                  <select
                    value={form.parent_specialty_id}
                    onChange={(e) => updateField("parent_specialty_id", e.target.value)}
                    className="w-full text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Elige una especialidad</option>
                    {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Slug (URL)</label>
                <input
                  value={form.slug}
                  onChange={(e) => { setSlugTouched(true); updateField("slug", slugify(e.target.value)); }}
                  className="w-full text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Descripción (opcional)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={3}
                  className="w-full text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-foreground">
                <Switch checked={form.active} onCheckedChange={(v) => updateField("active", v)} />
                Activa (visible para doctores y en búsquedas)
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 p-6 border-t border-border/50">
              <Button variant="outline" onClick={closeModal} className="rounded-xl">Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="rounded-xl">
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
