import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Heart, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePaginatedList } from "@/api/usePaginatedList";
import Pagination from "@/components/admin/Pagination";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import TaxonomyModal from "@/components/admin/TaxonomyModal";
import TaxonomyTable from "@/components/admin/TaxonomyTable";
import TaxonomyStatsBar from "@/components/admin/TaxonomyStatsBar";
import { useTaxonomyBank } from "@/hooks/useTaxonomyBank";

const EMPTY_FORM = { name: "", slug: "", profession_slug: "", icon: "", description: "", active: true };

// Banco de especialidades (entidad Specialty): la base de toda la
// taxonomía médica del sitio -- de aquí cuelgan las subespecialidades
// (parent_specialty_id en Subspecialty) y las enfermedades (specialty en
// Condition), y cada especialidad con profession_slug tiene su propia URL
// pública /{profession_slug}/{ciudad}. El estado y las acciones (cargar,
// buscar, paginar, guardar, borrar, activar) viven en useTaxonomyBank,
// compartido con los otros dos bancos (Subespecialidades, Enfermedades);
// aquí solo quedan las columnas de la tabla y los campos del formulario,
// que sí son propios de esta pantalla.
export default function AdminSpecialties() {
  const bank = useTaxonomyBank({
    entity: base44.entities.Specialty,
    entityLabel: "especialidad",
    emptyForm: EMPTY_FORM,
    toFormValues: (item) => ({
      name: item.name || "",
      slug: item.slug || "",
      profession_slug: item.profession_slug || "",
      icon: item.icon || "",
      description: item.description || "",
      active: item.active !== false,
    }),
  });
  const { items, loading, searched, search, setSearch, editing, form, saving, openNew, openEdit, closeModal, updateField, updateSlugManually, handleSave, handleDelete, toggleField, confirmDialogProps } = bank;

  const [onlyGaps, setOnlyGaps] = useState(false);
  const [pageSize, setPageSize] = useState(30);

  const withoutProfessionSlug = useMemo(() => items.filter((s) => !s.profession_slug).length, [items]);

  const filtered = useMemo(
    () => (onlyGaps ? searched.filter((s) => !s.profession_slug) : searched),
    [searched, onlyGaps]
  );

  const { pageItems: paged, page, setPage, totalPages } = usePaginatedList(filtered, {
    pageSize,
    resetKey: `${search}|${onlyGaps}|${pageSize}`,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Heart className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  const columns = [
    { key: "name", header: "Nombre", render: (s) => s.name },
    {
      key: "profession_slug",
      header: "Slug de profesión",
      render: (s) => s.profession_slug
        ? <span className="text-xs font-medium text-primary bg-accent px-2 py-0.5 rounded-full whitespace-nowrap">{s.profession_slug}</span>
        : <span className="text-xs text-muted-foreground">—</span>,
    },
    { key: "icon", header: "Ícono", render: (s) => <span className="text-muted-foreground">{s.icon || "—"}</span> },
    { key: "active", header: "Activa", render: (s) => <Switch checked={s.active !== false} onCheckedChange={() => toggleField(s)} /> },
  ];

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <div className="flex items-center gap-3">
          <Heart className="w-6 h-6 text-primary" />
          <h1 className="font-heading font-bold text-2xl text-foreground">Banco de especialidades</h1>
        </div>
        <Button onClick={() => openNew()} className="rounded-xl gap-1.5">
          <Plus className="w-4 h-4" /> Agregar especialidad
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Catálogo base de especialidades médicas. De aquí cuelgan las subespecialidades y las enfermedades de cada especialidad, y cada una con slug de profesión tiene su propia URL pública.
      </p>

      <TaxonomyStatsBar
        total={items.length}
        totalLabel="Especialidades en el banco"
        secondary={items.filter((s) => s.active !== false).length}
        secondaryLabel="Activas"
        gapCount={withoutProfessionSlug}
        gapLabel="Sin slug de profesión / URL pública (clic para filtrar)"
        gapActive={onlyGaps}
        onToggleGap={() => setOnlyGaps((v) => !v)}
      />

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

      <TaxonomyTable
        items={paged}
        columns={columns}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyIcon={Heart}
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={filtered.length} pageSize={pageSize} />

      <TaxonomyModal
        open={editing !== null}
        onOpenChange={(open) => { if (!open) closeModal(); }}
        title={editing?.id ? "Editar especialidad" : "Agregar especialidad"}
        onSave={handleSave}
        saving={saving}
      >
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
            onChange={(e) => updateSlugManually(e.target.value)}
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
      </TaxonomyModal>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
