import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Stethoscope, Search, Plus, X, ListChecks, Inbox } from "lucide-react";
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
// las páginas públicas /enfermedades/:slug/:ciudad. Comparte el estado y las
// acciones (cargar, buscar, guardar, borrar, activar) con Especialidades y
// Subespecialidades vía useTaxonomyBank; lo propio de esta pantalla es su
// formulario largo (síntomas, causas, SEO...), el filtro por especialidad
// (Condition.specialty es texto, no un id, así que el cálculo de "huecos" es
// distinto al de Subespecialidades) y la bandeja de "Solicitudes de
// doctores" (ConditionRequest) bajo la cual "Crear enfermedad" abre este
// mismo formulario con el nombre ya puesto. "Especialidades sin ninguna"
// usa SpecialtyGapList, compartido con Subespecialidades: antes esta
// pantalla, al filtrar por huecos, dejaba la tabla vacía sin decir cuáles
// especialidades faltaban (una enfermedad de un hueco, por definición, no
// puede existir); ahora muestra la misma lista útil que ya tenía
// Subespecialidades.
export default function AdminEnfermedades() {
  const [specialties, setSpecialties] = useState([]);
  const [specialtiesLoaded, setSpecialtiesLoaded] = useState(false);
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [pageSize, setPageSize] = useState(30);

  // Solicitudes de doctores para agregar una enfermedad que no está en el
  // banco (entidad ConditionRequest). "Crear enfermedad" abre el mismo modal
  // de siempre con el nombre pre-llenado; al guardar, la solicitud que la
  // originó se marca aprobada sola (ver afterCreate más abajo). "Rechazar"
  // solo pide un motivo, no crea nada.
  const [requests, setRequests] = useState([]);
  const [fulfillingRequestId, setFulfillingRequestId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [resolvingId, setResolvingId] = useState(null);

  const bank = useTaxonomyBank({
    entity: base44.entities.Condition,
    entityLabel: "enfermedad",
    listLimit: 2000,
    emptyForm: EMPTY_FORM,
    toFormValues: (item) => ({
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
    }),
    validate: (form) => (!form.specialty ? "Elige la especialidad que la atiende" : null),
    afterCreate: async (created) => {
      if (!fulfillingRequestId) return;
      try {
        await base44.entities.ConditionRequest.update(fulfillingRequestId, {
          status: "aprobada",
          resolution_note: `Se agregó al banco como "${created.name}".`,
        });
        setRequests((prev) => prev.filter((x) => x.id !== fulfillingRequestId));
      } catch { /* la enfermedad ya se creó bien; la solicitud puede cerrarse a mano si esto falla */ }
    },
  });
  const { items, loading, search, setSearch, editing, form, saving, openEdit, updateField, updateSlugManually, handleSave, handleDelete, toggleField, confirmDialogProps } = bank;

  useEffect(() => {
    Promise.all([
      base44.entities.Specialty.filter({ active: true }),
      base44.entities.ConditionRequest.filter({ status: "pendiente" }, "-created_date").catch(() => []),
    ]).then(([specList, reqList]) => {
      setSpecialties(specList.sort((a, b) => a.name.localeCompare(b.name, "es")));
      setRequests(reqList);
      setSpecialtiesLoaded(true);
    });
  }, []);

  const openNew = () => { setFulfillingRequestId(null); bank.openNew(); };
  const openNewForSpecialty = (name) => { setFulfillingRequestId(null); bank.openNew({ specialty: name }); };
  const openNewFromRequest = (r) => { setFulfillingRequestId(r.id); bank.openNew({ name: r.requested_name }); };
  const closeModal = () => { bank.closeModal(); setFulfillingRequestId(null); };

  const rejectRequest = async (r) => {
    if (!rejectReason.trim()) { toast.error("Escribe un motivo de rechazo"); return; }
    setResolvingId(r.id);
    try {
      await base44.entities.ConditionRequest.update(r.id, { status: "rechazada", resolution_note: rejectReason.trim() });
      setRequests((prev) => prev.filter((x) => x.id !== r.id));
      toast.success("Solicitud rechazada");
      setRejectingId(null);
      setRejectReason("");
    } catch {
      toast.error("No se pudo rechazar");
    }
    setResolvingId(null);
  };

  // Especialidades sin ni una enfermedad en el banco todavía -- lo primero
  // que hay que llenar antes de dejar que un doctor de esa especialidad
  // entre a "elegir cuáles trata" y no encuentre nada.
  const specialtiesWithoutConditions = useMemo(() => {
    const covered = new Set(items.map((c) => c.specialty));
    return specialties.filter((s) => !covered.has(s.name));
  }, [items, specialties]);
  const gapNames = useMemo(() => new Set(specialtiesWithoutConditions.map((s) => s.name)), [specialtiesWithoutConditions]);

  const filtered = useMemo(() => {
    let list = items;
    if (specialtyFilter) list = list.filter((c) => c.specialty === specialtyFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.specialty.toLowerCase().includes(q));
    }
    return list;
  }, [items, specialtyFilter, search]);

  const { pageItems: paged, page, setPage, totalPages } = usePaginatedList(filtered, {
    pageSize,
    resetKey: `${specialtyFilter}|${search}|${pageSize}`,
  });

  if (loading || !specialtiesLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  const columns = [
    { key: "name", header: "Nombre", render: (c) => c.name },
    {
      key: "specialty",
      header: "Especialidad",
      render: (c) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${gapNames.has(c.specialty) ? "text-amber-700 bg-amber-50" : "text-primary bg-accent"}`}>
          {c.specialty}
        </span>
      ),
    },
    {
      key: "content_status",
      header: "Contenido",
      render: (c) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${c.content_status === "publicado" ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
          {c.content_status === "publicado" ? "Publicado" : "Borrador"}
        </span>
      ),
    },
    { key: "popular", header: "Popular", render: (c) => <Switch checked={!!c.popular} onCheckedChange={() => toggleField(c, "popular")} /> },
    { key: "active", header: "Activa", render: (c) => <Switch checked={c.active !== false} onCheckedChange={() => toggleField(c)} /> },
  ];

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
        Catálogo de enfermedades y padecimientos por especialidad. Alimenta las páginas públicas de enfermedades y la lista de la que cada doctor elige cuáles trata.
      </p>

      {requests.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Inbox className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-heading font-semibold text-sm text-foreground">Solicitudes de doctores</h2>
            <span className="text-xs bg-amber-500 text-white rounded-full px-2 py-0.5 font-semibold">{requests.length}</span>
          </div>
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="bg-card border border-border/50 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{r.requested_name}</p>
                    <p className="text-xs text-muted-foreground">Solicitada por {r.specialist_name || "un doctor"}</p>
                    {r.note && <p className="text-xs text-muted-foreground mt-1 italic">"{r.note}"</p>}
                  </div>
                  {rejectingId === r.id ? (
                    <div className="w-full sm:w-auto space-y-2">
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Motivo de rechazo"
                        className="w-full sm:w-64 text-sm border border-input rounded-xl px-3 py-2 min-h-[50px] bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" className="rounded-xl" disabled={resolvingId === r.id} onClick={() => rejectRequest(r)}>
                          Confirmar rechazo
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { setRejectingId(null); setRejectReason(""); }}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={() => openNewFromRequest(r)}>
                        <Plus className="w-3.5 h-3.5" /> Crear enfermedad
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={() => setRejectingId(r.id)}>
                        <X className="w-3.5 h-3.5" /> Rechazar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <TaxonomyStatsBar
        total={items.length}
        totalLabel="Enfermedades en el banco"
        secondary={`${specialties.length - specialtiesWithoutConditions.length}/${specialties.length}`}
        secondaryLabel="Especialidades con al menos una"
        gapCount={specialtiesWithoutConditions.length}
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
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Enfermedades por página"
        >
          <option value={30}>30 por página</option>
          <option value={50}>50 por página</option>
          <option value={100}>100 por página</option>
          <option value={200}>200 por página</option>
          <option value={500}>500 por página</option>
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
          specialties={specialtiesWithoutConditions}
          emptyMessage="Todas las especialidades tienen al menos una enfermedad. 🎉"
          onPick={(s) => { setOnlyGaps(false); openNewForSpecialty(s.name); }}
        />
      ) : (
        <>
          <TaxonomyTable items={paged} columns={columns} onEdit={openEdit} onDelete={handleDelete} emptyIcon={ListChecks} />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={filtered.length} pageSize={pageSize} />
        </>
      )}

      <TaxonomyModal
        open={editing !== null}
        onOpenChange={(open) => { if (!open) closeModal(); }}
        title={editing?.id ? "Editar enfermedad" : "Agregar enfermedad"}
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
            onChange={(e) => updateSlugManually(e.target.value)}
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
      </TaxonomyModal>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
