import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, Save, Trash2, Loader2, Sparkles } from "lucide-react";
import { extractCoordsFromMapsUrl, geocodeAddress } from "@/lib/officeGeo";

// onPrefill (opcional): función async que llena el formulario desde el
// consultorio real del perfil. Solo se ofrece mientras no hay ubicación
// capturada -- es una copia de una sola vez, no sincronización.
export default function LocationEditor({ storefrontId, items, setItems, onPrefill, prefillLabel = "Prellenar desde tu perfil" }) {
  const loc = items[0] || null;
  const [placeName, setPlaceName] = useState("");
  const [address, setAddress] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [coords, setCoords] = useState(null);
  const [prefilling, setPrefilling] = useState(false);

  const runPrefill = async () => {
    setPrefilling(true);
    try {
      await onPrefill();
    } finally {
      setPrefilling(false);
    }
  };

  useEffect(() => {
    if (loc) {
      setPlaceName(loc.place_name || "");
      setAddress(loc.address || "");
      setMapsUrl(loc.maps_url || "");
      setCoords(loc.latitude != null ? { lat: loc.latitude, lng: loc.longitude } : null);
    }
  }, [loc?.id]);

  const resolveCoords = async () => {
    const fromUrl = extractCoordsFromMapsUrl(mapsUrl);
    if (fromUrl) return { latitude: fromUrl.latitude, longitude: fromUrl.longitude };
    if (address.trim()) {
      const geocoded = await geocodeAddress(address);
      if (geocoded) return { latitude: geocoded.latitude, longitude: geocoded.longitude };
    }
    return null;
  };

  const save = async () => {
    setSaving(true);
    try {
      const resolved = await resolveCoords();
      const payload = {
        storefront_id: storefrontId,
        place_name: placeName.trim(),
        address: address.trim(),
        maps_url: mapsUrl.trim(),
        latitude: resolved?.latitude ?? null,
        longitude: resolved?.longitude ?? null,
        position: 0,
      };
      if (loc) {
        await base44.entities.StorefrontLocation.update(loc.id, payload);
      } else {
        await base44.entities.StorefrontLocation.create(payload);
      }
      const data = await base44.entities.StorefrontLocation.filter({ storefront_id: storefrontId });
      setItems(data);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const remove = async () => {
    if (!loc) return;
    await base44.entities.StorefrontLocation.delete(loc.id);
    setItems([]);
    setPlaceName("");
    setAddress("");
    setMapsUrl("");
    setCoords(null);
  };

  return (
    <div>
      <h3 className="font-heading font-semibold text-sm text-foreground mb-3">Dónde encontrarlo</h3>
      {!loc && onPrefill && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={runPrefill}
          disabled={prefilling}
          className="rounded-lg mb-3 gap-1.5"
        >
          {prefilling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {prefillLabel}
        </Button>
      )}
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Nombre del lugar</Label>
          <Input
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            placeholder="Ej. Hospital San José"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Dirección</Label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ej. Av. Morones Prieto 1500, Monterrey"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Enlace de Google Maps (opcional)</Label>
          <Input
            value={mapsUrl}
            onChange={(e) => setMapsUrl(e.target.value)}
            placeholder="Pega el enlace de 'Compartir' de Google Maps"
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Si pegas un enlace con coordenadas, se usan esas. Si no, se geocodifica la dirección.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={save} disabled={saving || (!placeName.trim() && !address.trim())}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loc ? "Actualizar" : "Guardar"}
          </Button>
          {loc && (
            <Button type="button" size="sm" variant="outline" onClick={remove}>
              <Trash2 className="w-4 h-4" />
              Eliminar
            </Button>
          )}
        </div>
        {coords && (
          <p className="text-xs text-emerald-600 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Coordenadas: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </p>
        )}
      </div>
    </div>
  );
}