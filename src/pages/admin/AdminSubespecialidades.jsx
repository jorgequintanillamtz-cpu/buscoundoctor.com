import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { GraduationCap, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePaginatedList } from "@/api/usePaginatedList";
import Pagination from "@/components/admin/Pagination";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import TaxonomyModal from "@/components/admin/TaxonomyModal";
import TaxonomyTable from "@/components/admin/TaxonomyTable";
import TaxonomyStatsBar from "@/components/admin/TaxonomyStatsBar";
import SpecialtyGapList from "@/components/admin/SpecialtyGapList";
import { useTaxonomyBank } from "@/hooks/useTaxonomyBank";

const EMPTY_FORM = { name: "", parent_specialty_id: "", slug: "", description: "", active: true };

// Banco de subespecialidades (entidad Subspecialty): separado del banco de
// especialidades (Specialty) a propósito -- mismo patrón que Condition --
// cada subespecialidad cuelga de una especialidad base vía
// parent_specialty_id, y es lo que el doctor elige en su panel
// (SubspecialtiesManager.jsx) para que un paciente que busca, por ejemplo,
// "Cirugía Maxilofacial" encuentre directo a esos doctores sin mezclarse
// con dentistas generales. Basado en el listado oficial de CONACEM. El
// estado y las acciones compartidas viven en useTaxonomyBank (igual que
// Especialidades y Enfermedades); "huecos por especialidad" usa
// SpecialtyGapList, compartido con Enfermedades.
export default function AdminSubespecialidades() {
  const bank = useTaxonomyBank({
    entity: base44.entities.Subspecialty,
    entityLabel: "subespecialidad",
    emptyForm: EMPTY_FORM,
    toFormValues: (item) => ({
      name: item.name || "",
      parent_specialty_id: item.parent_specialty_id || "",
      slug: item.slug || "",
      description: item.description || "",
      active: item.active !== false,
    }),
    validate: (form) => (!form.parent_specialty_id ? "Elige la especialidad base" : null),
    deleteMessage: () => "Si algún doctor ya la tiene marcada, dejará de aparecerle. Esto no se puede deshacer.",
  });
  const { items, loading, searched, search, setSearch, editing, form, saving, openNew, openEdit, closeModal, updateField, updateSlugManually, handleSave, handleDelete, toggleField, confirmDialogProps } = bank;

  const [specialties, setSpecialties] = useState([]);
  const [specialtiesLoaded, setSpecialtiesLoaded] = useState(false);
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [pageSize, setPageSize] = useState(30);

  useEffect(() => {
    base44.entities.Specialty.filter({ active: true }).then((list) => {
      setSpecialties(list.sort((a, b) => a.name.localeCompare(b.name, "es")));
      setSpecialtiesLoaded(true);
    });
  }, []);

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
    let list = searched;
    if (specialtyFilter) list = list.filter((s) => s.parent_specialty_id === specialtyFilter);
    return list;
  }, [searched, specialtyFilter]);

  const { pageItems: paged, page, setPage, totalPages } = usePaginatedList(filtered, {
    pageSize,
    resetKey: `${specialtyFilter}|${search}|${pageSize}`,
  });

  if (loading || !specialtiesLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <GraduationCap className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  const columns = [
    { key: "name", header: "Subespecialidad", render: (s) => s.name },
    {
      key: "parent",
      header: "Especialidad base",
      render: (s) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${gapIds.has(s.parent_specialty_id) ? "text-amber-700 bg-amber-50" : "text-primary bg-accent"}`}>
          {specialtyName(s.parent_specialty_id)}
        </span>
      ),
    },
    { key: "slug", header: "Slug", render: (s) => <span className="text-muted-foreground font-mono text-xs">{s.slug}</span> },
    { key: "active", header: "Activa", render: (s) => <Switch checked={s.active !== false} onCheckedChange={() => toggleField(s)} /> },
  ];

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-primary" />
          <h1 className="font-heading font-bold text-2xl text-foreground">Banco de subespecialidades</h1>
        </div>
        <Button onClick={() => openNew()} className="rounded-xl gap-1.5">
          <Plus className="w-4 h-4" /> Agregar subespecialidad
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Cada subespecialidad cuelga de una especialidad base (basado en el listado oficial de CONACEM). Es lo que deja que un paciente que busca, por ejemplo, "Cirugía Maxilofacial" encuentre directo a esos doctores sin mezclarse con la lista general de "Dentista".
      </p>

      <TaxonomyStatsBar
        total={items.length}
        totalLabel="Subespecialidades en el banco"
        secondary={`${specialties.length - specialtiesWithoutSubs.length}/${specialties.length}`}
        secondaryLabel="Especialidades con al menos una"
        gapCount={specialtiesWithoutSubs.length}
        gapLabel="Especialidades sin ninguna (clic para ver cuáles)"
        gapActive={onlyGaps}
        onToggleGap={() => setOnlyGaps((v) => !v)}
      />

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
        <SpecialtyGapList
          specialties={specialtiesWithoutSubs}
          emptyMessage="Todas las especialidades tienen al menos una subespecialidad. 🎉"
          onPick={(s) => { setOnlyGaps(false); openNew({ parent_specialty_id: s.id }); }}
        />
      ) : (
        <>
          <TaxonomyTable items={paged} columns={columns} onEdit={openEdit} onDelete={handleDelete} emptyIcon={GraduationCap} />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={filtered.length} pageSize={pageSize} />
        </>
      )}

      <TaxonomyModal
        open={editing !== null}
        onOpenChange={(open) => { if (!open) closeModal(); }}
        title={editing?.id ? "Editar subespecialidad" : "Agregar subespecialidad"}
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
            onChange={(e) => updateSlugManually(e.target.value)}
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
      </TaxonomyModal>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
