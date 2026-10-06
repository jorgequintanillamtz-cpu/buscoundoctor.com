import { useState, useEffect } from "react";
import { Building2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
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
  // Catálogo de hospitales (opcional): si el médico atiende en uno, la
  // dirección se llena sola y solo agrega su consultorio y piso. Nunca bloquea
  // el registro: sin hospitales o con error, el paso funciona como siempre.
  const [hospitals, setHospitals] = useState([]);
  useEffect(() => {
    let active = true;
    base44.entities.Hospital.filter({ active: true })
      .then((list) => { if (active) setHospitals([...list].sort((a, b) => (a.display_order - b.display_order) || a.name.localeCompare(b.name, "es"))); })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  const hospital = hospitals.find((h) => h.id === data.hospital_id) || null;

  const pickHospital = (id) => {
    const h = hospitals.find((x) => x.id === id);
    if (!h) {
      update("hospital_id", "");
      update("hospital_name", "");
      return;
    }
    update("hospital_id", h.id);
    update("hospital_name", h.name);
    update("address_street", h.address_street || "");
    update("address_ext_number", h.address_ext_number || "");
    update("address_neighborhood", h.address_neighborhood || "");
    update("address_postal_code", h.address_postal_code || "");
    update("address_int_number", "");
    update("address_floor", "");
    update("address_lat", h.latitude);
    update("address_lng", h.longitude);
    update("address_place_id", h.place_id || null);
    const zone = zones.find((z) => z.id === h.zone_id);
    if (zone) update("zone", zone.name);
  };

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
      {hospitals.length > 0 && (
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-primary" /> ¿Atiendes en uno de estos hospitales? (opcional)
          </label>
          <select
            value={data.hospital_id || ""}
            onChange={(e) => pickHospital(e.target.value)}
            className="w-full h-11 px-3 text-sm bg-background border border-input rounded-xl"
          >
            <option value="">No, es un consultorio independiente u otro lugar</option>
            {hospitals.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <p className="text-xs text-muted-foreground mt-1.5">
            {hospital
              ? "Listo: la dirección se llenó con la del hospital. Solo indica tu consultorio y piso abajo. Confirmaremos que atiendes ahí antes de mostrarte en su página."
              : "Si lo eliges, la dirección se llena sola. Confirmaremos que atiendes ahí antes de mostrarte en la página del hospital."}
          </p>
        </div>
      )}
      {hasGoogleMaps && !hospital && (
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
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{hospital ? "Consultorio (opcional)" : "Número int. (opcional)"}</label>
          <Input value={data.address_int_number} onChange={(e) => update("address_int_number", e.target.value)} placeholder={hospital ? "Ej: 615" : "Ej: 4B"} className="rounded-xl" />
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
