import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Search, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import TaxonomyModal from "@/components/admin/TaxonomyModal";
import TaxonomyTable from "@/components/admin/TaxonomyTable";
import TaxonomyStatsBar from "@/components/admin/TaxonomyStatsBar";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";
import { hasGoogleMaps } from "@/lib/googleMaps";
import { useTaxonomyBank } from "@/hooks/useTaxonomyBank";
import { hospitalPath } from "@/lib/hospitals";
import LoadingLogo from "@/components/LoadingLogo";

const EMPTY_FORM = {
  name: "", slug: "", aliases: "", zone_id: "",
  address_street: "", address_ext_number: "", address_neighborhood: "", address_postal_code: "",
  latitude: null, longitude: null, place_id: "",
  phone: "", website: "", description: "", display_order: 0, active: true,
};

const normalize = (t) => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Misma forma que se arma la dirección de un consultorio en el resto del sitio.
const composeAddressLine = (f) =>
  [
    [f.address_street, f.address_ext_number].filter(Boolean).join(" "),
    f.address_neighborhood && `Col. ${f.address_neighborhood}`,
    f.address_postal_code && `CP ${f.address_postal_code}`,
  ].filter(Boolean).join(", ");

const inputCls = "w-full text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring";

// Catálogo de hospitales (entidad Hospital, tabla `hospital`): los que el
// médico puede elegir al capturar su consultorio, y que tienen su propia
// página pública /hospital/:slug. Usa las mismas piezas que los bancos de
// Especialidades/Subespecialidades/Enfermedades (CLAUDE.md §11).
export default function AdminHospitales() {
  const bank = useTaxonomyBank({
    entity: base44.entities.Hospital,
    entityLabel: "hospital",
    entityGender: "m",
    sortField: "display_order",
    emptyForm: EMPTY_FORM,
    toFormValues: (item) => ({
      name: item.name || "",
      slug: item.slug || "",
      aliases: (item.aliases || []).join(", "),
      zone_id: item.zone_id || "",
      address_street: item.address_street || "",
      address_ext_number: item.address_ext_number || "",
      address_neighborhood: item.address_neighborhood || "",
      address_postal_code: item.address_postal_code || "",
      latitude: item.latitude ?? null,
      longitude: item.longitude ?? null,
      place_id: item.place_id || "",
      phone: item.phone || "",
      website: item.website || "",
      description: item.description || "",
      display_order: item.display_order ?? 0,
      active: item.active !== false,
    }),
    validate: (form) => {
      if (!form.zone_id) return "Elige la ciudad";
      if (!form.address_street.trim()) return "La calle es obligatoria";
      if (form.website && !/^https?:\/\//i.test(form.website.trim())) return "El sitio web debe empezar con http:// o https://";
      return null;
    },
    buildPayload: (form, slug) => ({
      name: form.name.trim(),
      slug,
      aliases: form.aliases.split(",").map((a) => a.trim()).filter(Boolean),
      zone_id: form.zone_id,
      address_street: form.address_street.trim(),
      address_ext_number: form.address_ext_number.trim() || null,
      address_neighborhood: form.address_neighborhood.trim() || null,
      address_postal_code: form.address_postal_code.trim() || null,
      address_line: composeAddressLine(form),
      latitude: form.latitude === "" ? null : form.latitude,
      longitude: form.longitude === "" ? null : form.longitude,
      place_id: form.place_id || null,
      phone: form.phone.trim() || null,
      website: form.website.trim() || null,
      description: form.description.trim() || null,
      display_order: Number(form.display_order) || 0,
      active: form.active,
    }),
    deleteMessage: () => "Los consultorios que ya lo tengan elegido se quedan con su dirección, pero dejan de aparecer en la página del hospital. Si solo quieres ocultarlo, mejor desactívalo. Esto no se puede deshacer.",
  });
  const { items, loading, searched, search, setSearch, editing, form, saving, openNew, openEdit, closeModal, updateField, updateSlugManually, handleSave, handleDelete, toggleField, confirmDialogProps } = bank;

  const [zones, setZones] = useState([]);
  useEffect(() => { base44.entities.Zone.filter({ active: true }).then(setZones).catch(() => {}); }, []);
  const zoneName = (id) => zones.find((z) => z.id === id)?.name || "—";

  // Al elegir una sugerencia de Google se llenan la dirección y el punto exacto.
  const handlePlace = (place) => {
    updateField("address_street", place.street || form.address_street);
    updateField("address_ext_number", place.ext_number || "");
    updateField("address_neighborhood", place.neighborhood || "");
    updateField("address_postal_code", place.postal_code || "");
    updateField("latitude", place.latitude);
    updateField("longitude", place.longitude);
    updateField("place_id", place.place_id || "");
    const zone = zones.find((z) => normalize(z.name) === normalize(place.locality));
    if (zone) updateField("zone_id", zone.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <LoadingLogo />
      </div>
    );
  }

  const sorted = [...searched].sort((a, b) => (a.display_order - b.display_order) || a.name.localeCompare(b.name, "es"));
  const withoutPin = items.filter((h) => h.latitude == null || h.longitude == null).length;

  const columns = [
    { key: "name", header: "Hospital", render: (h) => (
      <div className="min-w-0">
        <p>{h.name}</p>
        <p className="text-xs text-muted-foreground font-normal">{h.address_line}</p>
      </div>
    ) },
    { key: "zone", header: "Ciudad", render: (h) => <span className="text-xs">{zoneName(h.zone_id)}</span> },
    { key: "pin", header: "Mapa", render: (h) => (
      h.latitude != null && h.longitude != null
        ? <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Con punto</span>
        : <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Falta el punto</span>
    ) },
    { key: "page", header: "Página", render: (h) => (
      <a href={hospitalPath(h.slug)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-blue hover:underline">
        Ver <ExternalLink className="w-3 h-3" />
      </a>
    ) },
    { key: "active", header: "Activo", render: (h) => <Switch checked={h.active !== false} onCheckedChange={() => toggleField(h)} /> },
  ];

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-primary" />
          <h1 className="font-heading font-bold text-2xl text-foreground">Catálogo de hospitales</h1>
        </div>
        <Button onClick={() => openNew()} className="rounded-xl gap-1.5">
          <Plus className="w-4 h-4" /> Agregar hospital
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Los hospitales que el médico puede elegir al capturar su consultorio. Cada uno tiene su página pública con los médicos que atienden ahí; esa página solo se muestra a Google cuando tiene al menos un médico.
      </p>

      <TaxonomyStatsBar
        total={items.length}
        totalLabel="Hospitales en el catálogo"
        secondary={`${items.filter((h) => h.active !== false).length}`}
        secondaryLabel="Activos (visibles al público)"
        gapCount={withoutPin}
        gapLabel="Sin punto exacto en el mapa (edítalos y usa «Buscar en Google»)"
        gapActive={false}
        onToggleGap={() => {}}
      />

      <div className="bg-card border border-border/50 rounded-2xl p-4 mb-4 flex items-center gap-2 bg-muted/50 px-3 py-2">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar hospital por nombre..."
          className="bg-transparent text-sm outline-none flex-1"
        />
      </div>

      <TaxonomyTable items={sorted} columns={columns} onEdit={openEdit} onDelete={handleDelete} emptyIcon={Building2} emptyLabel="Todavía no hay hospitales" />

      <TaxonomyModal
        open={editing !== null}
        onOpenChange={(open) => { if (!open) closeModal(); }}
        title={editing?.id ? "Editar hospital" : "Agregar hospital"}
        onSave={handleSave}
        saving={saving}
      >
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Nombre</label>
          <input value={form.name} onChange={(e) => updateField("name", e.target.value)} className={inputCls} placeholder="Ej. Hospital Zambrano Hellion" />
        </div>

        {hasGoogleMaps && (
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Buscar en Google (llena la dirección y fija el punto exacto)</label>
            <PlaceAutocomplete onSelect={handlePlace} placeholder="Ej: Hospital Zambrano Hellion, San Pedro" />
            <p className="text-[11px] text-muted-foreground mt-1">
              {form.latitude != null ? "Punto exacto confirmado en el mapa." : "Todavía no tiene punto exacto: elige la sugerencia del hospital."}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Ciudad</label>
            <select value={form.zone_id} onChange={(e) => updateField("zone_id", e.target.value)} className={inputCls}>
              <option value="">Elige una ciudad</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Slug (URL)</label>
            <input value={form.slug} onChange={(e) => updateSlugManually(e.target.value)} className={`${inputCls} font-mono`} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Calle</label>
            <input value={form.address_street} onChange={(e) => updateField("address_street", e.target.value)} className={inputCls} placeholder="Ej. Av. Batallón de San Patricio" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Número</label>
            <input value={form.address_ext_number} onChange={(e) => updateField("address_ext_number", e.target.value)} className={inputCls} placeholder="112" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Colonia</label>
            <input value={form.address_neighborhood} onChange={(e) => updateField("address_neighborhood", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Código postal</label>
            <input value={form.address_postal_code} onChange={(e) => updateField("address_postal_code", e.target.value.replace(/\D/g, ""))} className={inputCls} inputMode="numeric" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Teléfono (opcional)</label>
            <input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className={inputCls} placeholder="81 1234 5678" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Sitio oficial (opcional)</label>
            <input value={form.website} onChange={(e) => updateField("website", e.target.value)} className={inputCls} placeholder="https://..." />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Otros nombres (separados por coma)</label>
          <input value={form.aliases} onChange={(e) => updateField("aliases", e.target.value)} className={inputCls} placeholder="Ej. Hospital Santa Engracia, Santa Engracia" />
          <p className="text-[11px] text-muted-foreground mt-1">Nombres anteriores o como lo llama la gente. Sirven para reconocerlo.</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Descripción corta (opcional)</label>
          <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={3} className={inputCls} placeholder="Solo datos que puedas comprobar. Sin promesas ni logos de terceros." />
        </div>

        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Orden en la lista</label>
            <input type="number" value={form.display_order} onChange={(e) => updateField("display_order", e.target.value)} className={inputCls} />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground pb-2">
            <Switch checked={form.active} onCheckedChange={(v) => updateField("active", v)} />
            Activo (visible al público)
          </label>
        </div>
      </TaxonomyModal>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
