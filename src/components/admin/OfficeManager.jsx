import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Pencil, MapPin, Star, Clock, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { resolveOfficeCoords } from "@/lib/officeGeo";

const DAYS = [
  { v: 0, label: "Domingo" },
  { v: 1, label: "Lunes" },
  { v: 2, label: "Martes" },
  { v: 3, label: "Miércoles" },
  { v: 4, label: "Jueves" },
  { v: 5, label: "Viernes" },
  { v: 6, label: "Sábado" },
];

const DAY_LABEL = (v) => DAYS[v]?.label || "";

const emptyHours = () =>
  DAYS.map((d) => ({
    day_of_week: d.v,
    open_time: "09:00",
    close_time: "18:00",
    is_closed: d.v === 0 || d.v === 6,
  }));

const emptyOffice = () => ({ zone_id: "", address_line: "", phone: "", maps_url: "", is_primary: false, photos: [] });

function OfficeForm({ initial, zones, hours: initialHours, onCancel, onSave, saving }) {
  const [office, setOffice] = useState(initial || emptyOffice());
  const [hours, setHours] = useState(initialHours ? initialHours.map((h) => ({ ...h })) : emptyHours());
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setOffice((prev) => ({ ...prev, photos: [...(prev.photos || []), file_url] }));
    } catch {
      toast.error("Error al subir la foto");
    }
    setUploadingPhoto(false);
    e.target.value = "";
  };

  const removePhoto = (idx) => {
    setOffice((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }));
  };

  const setH = (idx, field, val) =>
    setHours((prev) => prev.map((h, i) => (i === idx ? { ...h, [field]: val } : h)));

  const submit = () => {
    if (!office.zone_id) { toast.error("Selecciona una zona"); return; }
    if (!office.address_line.trim()) { toast.error("La dirección es obligatoria"); return; }
    onSave(office, hours);
  };

  return (
    <div className="border border-primary/30 rounded-xl p-4 bg-accent/20 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium mb-1 block">Zona *</label>
          <select
            value={office.zone_id}
            onChange={(e) => setOffice({ ...office, zone_id: e.target.value })}
            className="w-full h-9 px-3 text-sm bg-background border border-input rounded-xl"
          >
            <option value="">Selecciona…</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium mb-1 block">Dirección *</label>
          <Input
            value={office.address_line}
            onChange={(e) => setOffice({ ...office, address_line: e.target.value })}
            className="rounded-xl text-sm"
            placeholder="Calle, número, colonia"
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Teléfono</label>
          <Input
            value={office.phone || ""}
            onChange={(e) => setOffice({ ...office, phone: e.target.value })}
            className="rounded-xl text-sm"
            placeholder="8123456789"
          />
        </div>
        <div className="sm:col-span-3">
          <label className="text-xs font-medium mb-1 block">Enlace de Google Maps (opcional)</label>
          <Input
            value={office.maps_url || ""}
            onChange={(e) => setOffice({ ...office, maps_url: e.target.value })}
            className="rounded-xl text-sm"
            placeholder='Pega aquí el link para compartir de Google Maps de tu consultorio'
          />
          <p className="text-[11px] text-muted-foreground mt-1">Búscate en Google Maps, presiona "Compartir" y pega el enlace aquí. Si lo dejas vacío, usaremos tu dirección de texto para mostrar el mapa.</p>
        </div>
        <label className="flex items-center gap-2 sm:col-span-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={office.is_primary}
            onChange={(e) => setOffice({ ...office, is_primary: e.target.checked })}
            className="w-4 h-4 accent-primary"
          />
          <Star className="w-4 h-4 text-amber-400" /> Consultorio principal
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Fotos del consultorio</p>
        <div className="flex flex-wrap gap-2">
          {(office.photos || []).map((url, i) => (
            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border/50 group">
              <img src={url} alt={`Foto ${i + 1} del consultorio`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
          <label className="w-16 h-16 rounded-lg border border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-accent/30 transition-colors flex-shrink-0">
            {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <ImageIcon className="w-4 h-4 text-muted-foreground" />}
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
          </label>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Horarios (7 días)</p>
        {DAYS.map((d, idx) => {
          const h = hours[idx];
          return (
            <div key={d.v} className="flex items-center gap-2 text-sm">
              <span className="w-20 text-muted-foreground">{d.label}</span>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={h.is_closed}
                  onChange={(e) => setH(idx, "is_closed", e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-xs">Cerrado</span>
              </label>
              {!h.is_closed && (
                <div className="flex items-center gap-1 ml-auto">
                  <input
                    type="time"
                    value={h.open_time || ""}
                    onChange={(e) => setH(idx, "open_time", e.target.value)}
                    className="h-8 px-2 text-sm border border-input rounded-md bg-background"
                  />
                  <span className="text-muted-foreground">–</span>
                  <input
                    type="time"
                    value={h.close_time || ""}
                    onChange={(e) => setH(idx, "close_time", e.target.value)}
                    className="h-8 px-2 text-sm border border-input rounded-md bg-background"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} className="rounded-xl">Cancelar</Button>
        <Button size="sm" onClick={submit} disabled={saving} className="rounded-xl">
          {saving ? "Guardando…" : "Guardar consultorio"}
        </Button>
      </div>
    </div>
  );
}

export default function OfficeManager({ specialistId }) {
  const [offices, setOffices] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    if (!specialistId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [offList, zoneList] = await Promise.all([
        base44.entities.Office.filter({ specialist_id: specialistId }),
        base44.entities.Zone.list("name", 50),
      ]);
      const withHours = await Promise.all(
        offList.map(async (o) => {
          const hours = await base44.entities.OfficeHours.filter({ office_id: o.id });
          return { office: o, hours: hours.sort((a, b) => a.day_of_week - b.day_of_week) };
        })
      );
      setOffices(withHours);
      setZones(zoneList);
    } catch {
      toast.error("Error al cargar consultorios");
    }
    setLoading(false);
  }, [specialistId]);

  useEffect(() => { load(); }, [load]);

  const saveOffice = async (data, hours) => {
    setSaving(true);
    try {
      const zone = zones.find((z) => z.id === data.zone_id);
      const coords = await resolveOfficeCoords(data, {
        zoneName: zone?.name,
        city: zone?.city,
        state: zone?.state,
      });
      const geoFields = coords ? { latitude: coords.latitude, longitude: coords.longitude } : {};

      let officeId;
      if (data.id) {
        await base44.entities.Office.update(data.id, {
          zone_id: data.zone_id,
          address_line: data.address_line,
          phone: data.phone,
          maps_url: data.maps_url,
          is_primary: data.is_primary,
          photos: data.photos || [],
          ...geoFields,
        });
        officeId = data.id;
        await base44.entities.OfficeHours.deleteMany({ office_id: officeId });
      } else {
        const created = await base44.entities.Office.create({
          specialist_id: specialistId,
          zone_id: data.zone_id,
          address_line: data.address_line,
          phone: data.phone,
          maps_url: data.maps_url,
          is_primary: data.is_primary,
          photos: data.photos || [],
          ...geoFields,
        });
        officeId = created.id;
      }
      const hoursPayload = hours.map((h) => ({
        office_id: officeId,
        day_of_week: h.day_of_week,
        open_time: h.is_closed ? null : h.open_time || null,
        close_time: h.is_closed ? null : h.close_time || null,
        is_closed: !!h.is_closed,
      }));
      await base44.entities.OfficeHours.bulkCreate(hoursPayload);
      if (data.is_primary) {
        await base44.entities.Office.updateMany(
          { specialist_id: specialistId, _id: { $ne: officeId } },
          { $set: { is_primary: false } }
        );
      }
      toast.success(data.id ? "Consultorio actualizado" : "Consultorio agregado");
      setEditingId(null);
      await load();
    } catch (e) {
      toast.error("Error al guardar: " + e.message);
    }
    setSaving(false);
  };

  const deleteOffice = async (id) => {
    setSaving(true);
    try {
      await base44.entities.OfficeHours.deleteMany({ office_id: id });
      await base44.entities.Office.delete(id);
      toast.success("Consultorio eliminado");
      setConfirmId(null);
      await load();
    } catch (e) {
      toast.error("Error al eliminar: " + e.message);
    }
    setSaving(false);
  };

  const setPrimary = async (id) => {
    try {
      await base44.entities.Office.updateMany(
        { specialist_id: specialistId, _id: { $ne: id } },
        { $set: { is_primary: false } }
      );
      await base44.entities.Office.update(id, { is_primary: true });
      await load();
      toast.success("Consultorio principal actualizado");
    } catch (e) {
      toast.error("Error: " + e.message);
    }
  };

  const zoneName = (zid) => zones.find((z) => z.id === zid)?.name || "—";
  const fmtHours = (hours) => {
    if (!hours || !hours.length) return "Sin horarios";
    const open = hours.filter((h) => !h.is_closed);
    if (!open.length) return "Cerrado todos los días";
    return open.map((h) => `${DAY_LABEL(h.day_of_week)} ${h.open_time}–${h.close_time}`).join(", ");
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">Consultorios</h2>
        {editingId === null && (
          <Button size="sm" variant="outline" onClick={() => setEditingId("new")} className="rounded-xl gap-1.5">
            <Plus className="w-4 h-4" /> Agregar consultorio
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {editingId === "new" && (
            <OfficeForm zones={zones} onCancel={() => setEditingId(null)} onSave={saveOffice} saving={saving} />
          )}

          {offices.length === 0 && editingId !== "new" && (
            <p className="text-sm text-muted-foreground py-4 text-center">Sin consultorios. Agrega el primero.</p>
          )}

          {offices.map(({ office, hours }) => (
            <div key={office.id} className="border border-border/60 rounded-xl p-4 space-y-2">
              {editingId === office.id ? (
                <OfficeForm
                  initial={{ ...office }}
                  zones={zones}
                  hours={hours}
                  onCancel={() => setEditingId(null)}
                  onSave={saveOffice}
                  saving={saving}
                />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{office.address_line}</span>
                        {office.is_primary && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3" /> Principal
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Zona: {zoneName(office.zone_id)}{office.phone ? ` · Tel: ${office.phone}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-start gap-1">
                        <Clock className="w-3 h-3 mt-0.5 flex-shrink-0" /> {fmtHours(hours)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => setEditingId(office.id)} className="h-8 w-8">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setConfirmId(office.id)} className="h-8 w-8 text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  {!office.is_primary && (
                    <Button size="sm" variant="ghost" onClick={() => setPrimary(office.id)} className="text-xs h-7 gap-1">
                      <Star className="w-3 h-3" /> Marcar como principal
                    </Button>
                  )}
                </>
              )}

              {confirmId === office.id && (
                <div className="flex items-center gap-2 bg-destructive/10 rounded-lg p-2 mt-2">
                  <span className="text-xs text-destructive flex-1">¿Eliminar este consultorio y sus horarios?</span>
                  <Button size="sm" variant="destructive" onClick={() => deleteOffice(office.id)} className="h-7 text-xs">
                    Sí, eliminar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)} className="h-7 text-xs">
                    No
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}