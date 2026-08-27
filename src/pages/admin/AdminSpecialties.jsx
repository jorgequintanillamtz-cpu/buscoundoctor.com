import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Heart, Search, Plus, Pencil, Trash2, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePaginatedList } from "@/api/usePaginatedList";
import Pagination from "@/components/admin/Pagination";
import { slugify } from "@/lib/citySlug";

const EMPTY_FORM = { name: "", slug: "", profession_slug: "", icon: "", description: "", active: true };

// Banco de especialidades (entidad Specialty): la base de toda la
// taxonomía médica del sitio -- de aquí cuelgan las subespecialidades
// (parent_specialty_id en Subspecialty) y las enfermedades (specialty en
// Condition), y cada especialidad con profession_slug tiene su propia URL
// pública /{profession_slug}/{ciudad}. Mismo estilo que /admin/enfermedades
// a propósito, para que los 3 bancos se sientan como una sola familia.
export default function AdminSpecialties() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [pageSize, setPageSize] = useState(30);
  const [editing, setEditing] = useState(null); // null = cerrado, {} = nuevo, objeto = editando
  const [form, setForm] = useState(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    const data = await base44.entities.Specialty.list("name", 500);
    setItems(data.sort((a, b) => a.name.localeCompare(b.name, "es")));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const withoutProfessionSlug = useMemo(() => items.filter((s) => !s.profession_slug).length, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (onlyGaps) list = list.filter((s) => !s.profession_slug);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q));
    }
    return list;
  }, [items, search, onlyGaps]);

  const { pageItems: paged, page, setPage, totalPages } = usePaginatedList(filtered, {
    pageSize,
    resetKey: `${search}|${onlyGaps}|${pageSize}`,
  });

  const openNew = () => {
    setForm(EMPTY_FORM);
    setSlugTouched(false);
    setEditing({});
  };

  const openEdit = (item) => {
    setForm({
      name: item.name || "",
      slug: item.slug || "",
      profession_slug: item.profession_slug || "",
      icon: item.icon || "",
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
    const slug = (form.slug || slugify(form.name)).trim();
    const duplicate = items.some((s) => s.slug === slug && s.id !== editing?.id);
    if (duplicate) { toast.error("Ya existe una especialidad con ese slug. Cámbialo para que sea único."); return; }

    setSaving(true);
    try {
      const payload = { ...form, slug };
      if (editing?.id) {
        await base44.entities.Specialty.update(editing.id, payload);
        toast.success("Especialidad actualizada");
      } else {
        await base44.entities.Specialty.create(payload);
        toast.success("Especialidad creada");
      }
      closeModal();
      await loadData();
    } catch (e) {
      toast.error("No se pudo guardar: " + e.message);
    }
    setSaving(false);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.name}"? Esto no se puede deshacer.`)) return;
    try {
      await base44.entities.Specialty.delete(item.id);
      setItems((prev) => prev.filter((s) => s.id !== item.id));
      toast.success("Especialidad eliminada");
    } catch (e) {
      toast.error("No se pudo eliminar: " + e.message);
    }
  };

  const toggleActive = async (item) => {
    const previous = item.active !== false;
    setItems((prev) => prev.map((s) => (s.id === item.id ? { ...s, active: !previous } : s)));
    try {
      await base44.entities.Specialty.update(item.id, { active: !previous });
    } catch (e) {
      setItems((prev) => prev.map((s) => (s.id === item.id ? { ...s, active: previous } : s)));
      toast.error("No se pudo actualizar: " + e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Heart className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <div className="flex items-center gap-3">
          <Heart className="w-6 h-6 text-primary" />
          <h1 className="font-heading font-bold text-2xl text-foreground">Banco de especialidades</h1>
        </div>
        <Button onClick={openNew} className="rounded-xl gap-1.5">
          <Plus className="w-4 h-4" /> Agregar especialidad
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Catálogo base de especialidades médicas. De aquí cuelgan las subespecialidades y las enfermedades de cada especialidad, y cada una con slug de profesión tiene su propia URL pública.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border/50 rounded-2xl p-4">
          <p className="text-2xl font-heading font-bold text-foreground">{items.length}</p>
          <p className="text-xs text-muted-foreground">Especialidades en el banco</p>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-4">
          <p className="text-2xl font-heading font-bold text-foreground">{items.filter((s) => s.active !== false).length}</p>
          <p className="text-xs text-muted-foreground">Activas</p>
        </div>
        <button
          type="button"
          onClick={() => setOnlyGaps((v) => !v)}
          className={`text-left bg-card border rounded-2xl p-4 transition-colors col-span-2 sm:col-span-1 ${onlyGaps ? "border-amber-400 ring-1 ring-amber-400" : "border-border/50 hover:border-amber-300"}`}
        >
          <p className="text-2xl font-heading font-bold text-amber-600 flex items-center gap-1.5">
            <AlertTriangle className="w-5 h-5" /> {withoutProfessionSlug}
          </p>
          <p className="text-xs text-muted-foreground">Sin slug de profesión / URL pública (clic para filtrar)</p>
        </button>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-muted/50 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre..."
            className="bg-transparent text-sm outline-none flex-1"
          />
        </div>
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Especialidades por página"
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
            Quitar filtro de sin slug de profesión
          </button>
        )}
      </div>

      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Sin resultados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border/50">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Slug de profesión</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ícono</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Activa</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {paged.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 font-medium text-foreground">{s.name}</td>
                    <td className="px-4 py-3">
                      {s.profession_slug ? (
                        <span className="text-xs font-medium text-primary bg-accent px-2 py-0.5 rounded-full whitespace-nowrap">{s.profession_slug}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.icon || "—"}</td>
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

      {editing !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={closeModal}>
          <div
            className="bg-card rounded-3xl border border-border/50 w-full max-w-2xl my-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <h2 className="font-heading font-bold text-lg text-foreground">
                {editing?.id ? "Editar especialidad" : "Agregar especialidad"}
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
                    placeholder="Ej. Ginecología"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Slug de profesión (URL pública)</label>
                  <input
                    value={form.profession_slug}
                    onChange={(e) => updateField("profession_slug", e.target.value)}
                    className="w-full text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="ej. ginecologo"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Slug (interno)</label>
                <input
                  value={form.slug}
                  onChange={(e) => { setSlugTouched(true); updateField("slug", slugify(e.target.value)); }}
                  className="w-full text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Ícono (nombre de Lucide)</label>
                <input
                  value={form.icon}
                  onChange={(e) => updateField("icon", e.target.value)}
                  placeholder="Heart, Brain, etc."
                  className="w-full text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={3}
                  className="w-full text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-foreground">
                <Switch checked={form.active} onCheckedChange={(v) => updateField("active", v)} />
                Activa
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
