import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  Stethoscope, Search, Plus, Pencil, Trash2, X, AlertTriangle, ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePaginatedList } from "@/api/usePaginatedList";
import Pagination from "@/components/admin/Pagination";
import { slugify } from "@/lib/citySlug";

const EMPTY_FORM = {
  name: "",
  specialty: "",
  slug: "",
  popular: false,
  active: true,
  content_status: "borrador",
  description: "",
  symptoms: "",
  causes: "",
  treatment: "",
  prevention: "",
  when_to_consult: "",
  meta_title: "",
  meta_description: "",
};

// Banco de enfermedades (entidad Condition): el catálogo del que los
// doctores eligen cuáles tratan (feature pendiente) y que ya alimenta hoy
// las páginas públicas /enfermedades/:slug/:ciudad. Esta pantalla es la
// única forma de mantenerlo -- antes se cargaba solo por script.
export default function AdminEnfermedades() {
  const [conditions, setConditions] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [editing, setEditing] = useState(null); // null = cerrado, {} = nuevo, objeto = editando
  const [form, setForm] = useState(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    const [condList, specList] = await Promise.all([
      base44.entities.Condition.list("name", 1000),
      base44.entities.Specialty.filter({ active: true }),
    ]);
    setConditions(condList);
    setSpecialties(specList.sort((a, b) => a.name.localeCompare(b.name, "es")));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Especialidades sin ni una enfermedad en el banco todavía -- lo primero
  // que hay que llenar antes de dejar que un doctor de esa especialidad
  // entre a "elegir cuáles trata" y no encuentre nada.
  const specialtiesWithoutConditions = useMemo(() => {
    const covered = new Set(conditions.map((c) => c.specialty));
    return specialties.filter((s) => !covered.has(s.name)).map((s) => s.name);
  }, [conditions, specialties]);

  const filtered = useMemo(() => {
    let list = conditions;
    if (onlyGaps) {
      list = list.filter((c) => specialtiesWithoutConditions.includes(c.specialty));
    }
    if (specialtyFilter) list = list.filter((c) => c.specialty === specialtyFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.specialty.toLowerCase().includes(q));
    }
    return list;
  }, [conditions, specialtyFilter, search, onlyGaps, specialtiesWithoutConditions]);

  const { pageItems: paged, page, setPage, totalPages } = usePaginatedList(filtered, {
    pageSize: 30,
    resetKey: `${specialtyFilter}|${search}|${onlyGaps}`,
  });

  const openNew = () => {
    setForm(EMPTY_FORM);
    setSlugTouched(false);
    setEditing({});
  };

  const openEdit = (item) => {
    setForm({
      name: item.name || "",
      specialty: item.specialty || "",
      slug: item.slug || "",
      popular: !!item.popular,
      active: item.active !== false,
      content_status: item.content_status || "borrador",
      description: item.description || "",
      symptoms: item.symptoms || "",
      causes: item.causes || "",
      treatment: item.treatment || "",
      prevention: item.prevention || "",
      when_to_consult: item.when_to_consult || "",
      meta_title: item.meta_title || "",
      meta_description: item.meta_description || "",
    });
    setSlugTouched(true);
    setEditing(item);
  };

  const closeModal = () => { setEditing(null); setForm(EMPTY_FORM); };

  const updateField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && !slugTouched) next.slug = slugify(value);
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("El nombre es obligatorio"); return; }
    if (!form.specialty) { toast.error("Elige la especialidad que la atiende"); return; }
    const slug = (form.slug || slugify(form.name)).trim();
    const isNew = !editing?.id;
    const duplicate = conditions.some((c) => c.slug === slug && c.id !== editing?.id);
    if (duplicate) { toast.error("Ya existe una enfermedad con ese slug. Cámbialo para que sea único."); return; }

    setSaving(true);
    try {
      const payload = { ...form, slug };
      if (isNew) {
        const created = await base44.entities.Condition.create(payload);
        setConditions((prev) => [...prev, created]);
        toast.success("Enfermedad agregada");
      } else {
        await base44.entities.Condition.update(editing.id, payload);
        setConditions((prev) => prev.map((c) => (c.id === editing.id ? { ...c, ...payload } : c)));
        toast.success("Cambios guardados");
      }
      closeModal();
    } catch {
      toast.error("No se pudo guardar");
    }
    setSaving(false);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.name}"? Esto no se puede deshacer.`)) return;
    try {
      await base44.entities.Condition.delete(item.id);
      setConditions((prev) => prev.filter((c) => c.id !== item.id));
      toast.success("Enfermedad eliminada");
    } catch {
      toast.error("No se pudo eliminar");
    }
  };

  const toggleField = async (item, field) => {
    const next = !item[field];
    setConditions((prev) => prev.map((c) => (c.id === item.id ? { ...c, [field]: next } : c)));
    try {
      await base44.entities.Condition.update(item.id, { [field]: next });
    } catch {
      setConditions((prev) => prev.map((c) => (c.id === item.id ? { ...c, [field]: !next } : c)));
      toast.error("No se pudo actualizar");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <div className="flex items-center gap-3">
          <ListChecks className="w-6 h-6 text-primary" />
          <h1 className="font-heading font-bold text-2xl text-foreground">Banco de enfermedades</h1>
        </div>
        <Button onClick={openNew} className="rounded-xl gap-1.5">
          <Plus className="w-4 h-4" /> Agregar enfermedad
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Catálogo de enfermedades y padecimientos por especialidad. Alimenta las páginas públicas de enfermedades y, próximamente, la lista de la que cada doctor elige cuáles trata.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border/50 rounded-2xl p-4">
          <p className="text-2xl font-heading font-bold text-foreground">{conditions.length}</p>
          <p className="text-xs text-muted-foreground">Enfermedades en el banco</p>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-4">
          <p className="text-2xl font-heading font-bold text-foreground">{specialties.length - specialtiesWithoutConditions.length}/{specialties.length}</p>
          <p className="text-xs text-muted-foreground">Especialidades con al menos una</p>
        </div>
        <button
          type="button"
          onClick={() => setOnlyGaps((v) => !v)}
          className={`text-left bg-card border rounded-2xl p-4 transition-colors col-span-2 sm:col-span-1 ${onlyGaps ? "border-amber-400 ring-1 ring-amber-400" : "border-border/50 hover:border-amber-300"}`}
        >
          <p className="text-2xl font-heading font-bold text-amber-600 flex items-center gap-1.5">
            <AlertTriangle className="w-5 h-5" /> {specialtiesWithoutConditions.length}
          </p>
          <p className="text-xs text-muted-foreground">Especialidades sin ninguna (clic para filtrar)</p>
        </button>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-muted/50 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o especialidad..."
            className="bg-transparent text-sm outline-none flex-1"
          />
        </div>
        <select
          value={specialtyFilter}
          onChange={(e) => setSpecialtyFilter(e.target.value)}
          className="text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Todas las especialidades</option>
          {specialties.map((s) => <option key={s.id}>{s.name}</option>)}
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

      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <ListChecks className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Sin resultados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border/50">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Especialidad</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contenido</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Popular</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Activa</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {paged.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 font-medium text-foreground">{c.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-primary bg-accent px-2 py-0.5 rounded-full whitespace-nowrap">{c.specialty}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${c.content_status === "publicado" ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                        {c.content_status === "publicado" ? "Publicado" : "Borrador"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Switch checked={!!c.popular} onCheckedChange={() => toggleField(c, "popular")} />
                    </td>
                    <td className="px-4 py-3">
                      <Switch checked={c.active !== false} onCheckedChange={() => toggleField(c, "active")} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(c)} aria-label="Editar" className="p-1.5 rounded-lg hover:bg-muted">
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button onClick={() => handleDelete(c)} aria-label="Eliminar" className="p-1.5 rounded-lg hover:bg-destructive/10">
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

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={filtered.length} pageSize={30} />

      {editing !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={closeModal}>
          <div
            className="bg-card rounded-3xl border border-border/50 w-full max-w-2xl my-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <h2 className="font-heading font-bold text-lg text-foreground">
                {editing?.id ? "Editar enfermedad" : "Agregar enfermedad"}
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
                    placeholder="Ej. Migraña"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Especialidad que la atiende</label>
                  <select
                    value={form.specialty}
                    onChange={(e) => updateField("specialty", e.target.value)}
                    className="w-full text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Elige una especialidad</option>
                    {specialties.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
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

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <Switch checked={form.popular} onCheckedChange={(v) => updateField("popular", v)} />
                  Destacada en "más buscadas"
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <Switch checked={form.active} onCheckedChange={(v) => updateField("active", v)} />
                  Activa
                </label>
                <select
                  value={form.content_status}
                  onChange={(e) => updateField("content_status", e.target.value)}
                  className="text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="borrador">Borrador (no indexado)</option>
                  <option value="publicado">Publicado</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Descripción (¿qué es?)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={3}
                  className="w-full text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Párrafos separados por línea en blanco"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Síntomas (uno por línea)</label>
                  <textarea
                    value={form.symptoms}
                    onChange={(e) => updateField("symptoms", e.target.value)}
                    rows={4}
                    className="w-full text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Causas / factores de riesgo (uno por línea)</label>
                  <textarea
                    value={form.causes}
                    onChange={(e) => updateField("causes", e.target.value)}
                    rows={4}
                    className="w-full text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Tratamiento</label>
                <textarea
                  value={form.treatment}
                  onChange={(e) => updateField("treatment", e.target.value)}
                  rows={2}
                  className="w-full text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Prevención (uno por línea)</label>
                  <textarea
                    value={form.prevention}
                    onChange={(e) => updateField("prevention", e.target.value)}
                    rows={4}
                    className="w-full text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">¿Cuándo consultar?</label>
                  <textarea
                    value={form.when_to_consult}
                    onChange={(e) => updateField("when_to_consult", e.target.value)}
                    rows={4}
                    className="w-full text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              <details className="text-sm">
                <summary className="cursor-pointer font-semibold text-foreground">SEO (opcional)</summary>
                <div className="mt-3 space-y-3">
                  <input
                    value={form.meta_title}
                    onChange={(e) => updateField("meta_title", e.target.value)}
                    placeholder="Meta título"
                    className="w-full text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <textarea
                    value={form.meta_description}
                    onChange={(e) => updateField("meta_description", e.target.value)}
                    placeholder="Meta descripción"
                    rows={2}
                    className="w-full text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </details>
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
