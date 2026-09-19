import { Input } from "@/components/ui/input";
import StepShell from "./StepShell";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";
import { hasGoogleMaps } from "@/lib/googleMaps";

const normalize = (t) => (t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// Paso 2 del wizard de registro de médicos ("Dirección de tu consultorio
// principal"). Extraído a su propio componente por la misma razón que
// StepDatos.jsx: que el registro real y AdminVistaRegistro.jsx compartan el
// mismo JSX y se mantengan en sync sin esfuerzo extra.
export default function StepUbicacion({ data, update, error, zones }) {
  // Al elegir una sugerencia de Google se llenan los campos y se guarda el
  // punto exacto; la persona puede corregir cualquier campo después.
  const handlePlace = (place) => {
    update("address_street", place.street);
    update("address_ext_number", place.ext_number);
    update("address_neighborhood", place.neighborhood);
    update("address_postal_code", place.postal_code);
    update("address_lat", place.latitude);
    update("address_lng", place.longitude);
    update("address_place_id", place.place_id);
    const zone = zones.find((z) => normalize(z.name) === normalize(place.locality));
    if (zone) update("zone", zone.name);
  };

  return (
    <StepShell title="Dirección de tu consultorio principal" subtitle="Podrás agregar más consultorios después" error={error}>
      {hasGoogleMaps && (
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Busca tu consultorio o dirección</label>
          <PlaceAutocomplete onSelect={handlePlace} placeholder="Ej: Torre Vasconcelos, San Pedro" />
          <p className="text-xs text-muted-foreground mt-1.5">
            {data.address_lat != null
              ? "Ubicación confirmada en el mapa. Revisa y completa los datos de abajo."
              : "Elígela de la lista para ubicarte en el mapa. También puedes llenar los datos a mano."}
          </p>
        </div>
      )}
      <div className="sm:col-span-2">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Ciudad</label>
        <select value={data.zone} onChange={(e) => update("zone", e.target.value)}
          className="w-full h-11 px-3 text-sm bg-background border border-input rounded-xl">
          <option value="">Selecciona tu ciudad</option>
          {zones.map((z) => <option key={z.id} value={z.name}>{z.name}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2 grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Calle</label>
          <Input value={data.address_street} onChange={(e) => update("address_street", e.target.value)} placeholder="Ej: Av. Vasconcelos" className="rounded-xl" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Número ext.</label>
          <Input value={data.address_ext_number} onChange={(e) => update("address_ext_number", e.target.value)} placeholder="Ej: 350" className="rounded-xl" />
        </div>
      </div>
      <div className="sm:col-span-2 grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Número int. (opcional)</label>
          <Input value={data.address_int_number} onChange={(e) => update("address_int_number", e.target.value)} placeholder="Ej: 4B" className="rounded-xl" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Piso (opcional)</label>
          <Input value={data.address_floor} onChange={(e) => update("address_floor", e.target.value)} placeholder="Ej: 3" className="rounded-xl" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Colonia</label>
        <Input value={data.address_neighborhood} onChange={(e) => update("address_neighborhood", e.target.value)} placeholder="Ej: Valle Oriente" className="rounded-xl" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Código postal</label>
        <Input value={data.address_postal_code} onChange={(e) => update("address_postal_code", e.target.value.replace(/\D/g, ""))} placeholder="Ej: 66269" inputMode="numeric" className="rounded-xl" />
      </div>
    </StepShell>
  );
}
