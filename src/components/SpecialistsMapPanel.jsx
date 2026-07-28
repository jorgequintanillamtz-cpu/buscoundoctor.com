import { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import { Star, MapPin } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { resolveOfficeCoords } from "@/lib/officeGeo";

// Centro por defecto: Monterrey / San Pedro Garza García
const MTY_CENTER = [25.6714, -100.3096];

function pinIcon() {
  return L.divIcon({
    className: "busco-map-pin",
    html: `<div style="width:32px;height:40px;filter:drop-shadow(0 3px 4px rgba(11,30,77,0.35));">
      <svg viewBox="0 0 34 42" width="32" height="40">
        <path d="M17 0C7.6 0 0 7.6 0 17c0 12.7 17 25 17 25s17-12.3 17-25C34 7.6 26.4 0 17 0z" fill="#2F6FED"/>
        <circle cx="17" cy="17" r="7" fill="#ffffff"/>
      </svg>
    </div>`,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -36],
  });
}

function FitToMarkers({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 15 });
  }, [points, map]);
  return null;
}

/**
 * Mapa lateral (escritorio) con un pin por cada especialista visible en la
 * lista de resultados. Usa Leaflet + OpenStreetMap (sin llave de API).
 *
 * Las coordenadas de cada consultorio se resuelven en este orden:
 * 1) lat/lng ya guardados en el consultorio (lo normal, quedan cacheados
 *    desde que el médico guarda su consultorio en el panel).
 * 2) el enlace de Google Maps, si es un enlace largo con "@lat,lng".
 * 3) geocodificación de la dirección de texto (respaldo automático para
 *    consultorios que se guardaron antes de tener este cálculo, o cuyo
 *    enlace de Maps es un link corto de "compartir" sin coordenadas).
 */
export default function SpecialistsMapPanel({ specialists }) {
  const [offices, setOffices] = useState([]);
  const [zones, setZones] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [markers, setMarkers] = useState([]);
  const icon = useMemo(() => pinIcon(), []);
  const resolveTokenRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      base44.entities.Office.list().catch(() => []),
      base44.entities.Zone.list().catch(() => []),
    ]).then(([offs, zns]) => {
      if (mounted) { setOffices(offs || []); setZones(zns || []); setLoaded(true); }
    });
    return () => { mounted = false; };
  }, []);

  // Consultorio principal (o el primero disponible) por especialista.
  const officeBySpecialist = useMemo(() => {
    const map = new Map();
    for (const office of offices) {
      const existing = map.get(office.specialist_id);
      if (!existing || office.is_primary) map.set(office.specialist_id, office);
    }
    return map;
  }, [offices]);

  useEffect(() => {
    if (!loaded) return;
    const token = ++resolveTokenRef.current;

    async function resolveAll() {
      const pending = specialists
        .map((specialist) => {
          const office = officeBySpecialist.get(specialist.id);
          return office ? { specialist, office } : null;
        })
        .filter(Boolean);

      const results = [];
      for (const { specialist, office } of pending) {
        if (resolveTokenRef.current !== token) return; // la lista cambió, cancelar
        const zone = zones.find((z) => z.id === office.zone_id);
        const coords = await resolveOfficeCoords(office, {
          zoneName: zone?.name,
          city: zone?.city,
          state: zone?.state,
        });
        if (coords) {
          results.push({ specialist, coords: [coords.latitude, coords.longitude], address: office.address_line });
          if (resolveTokenRef.current === token) setMarkers([...results]);
        }
      }
    }

    resolveAll();
  }, [loaded, specialists, officeBySpecialist, zones]);

  const points = markers.map((m) => m.coords);

  return (
    <div className="bg-card rounded-3xl border border-border/50 shadow-sm overflow-hidden">
      <div className="h-[520px] xl:h-[calc(100vh-10rem)] xl:max-h-[720px] relative">
        <MapContainer
          center={MTY_CENTER}
          zoom={12}
          scrollWheelZoom={false}
          className="w-full h-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FitToMarkers points={points} />
          {markers.map(({ specialist, coords, address }) => (
            <Marker key={specialist.id} position={coords} icon={icon}>
              <Popup>
                <div className="w-48">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
                      {specialist.profile_photo ? (
                        <img src={specialist.profile_photo} alt={specialist.full_name} className="w-full h-full object-cover object-top" />
                      ) : (
                        <div className="w-full h-full bg-brand-bluePale flex items-center justify-center text-[10px] font-bold text-brand-navy">
                          {specialist.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading font-bold text-xs text-foreground leading-tight truncate">{specialist.full_name}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight truncate">{specialist.specialty}</p>
                    </div>
                  </div>
                  {specialist.rating != null && (
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1.5">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {specialist.rating.toFixed(1)}
                    </p>
                  )}
                  {address && (
                    <p className="flex items-start gap-1 text-[11px] text-muted-foreground mb-2 leading-snug">
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      {address}
                    </p>
                  )}
                  <Link
                    to={`/especialista/${specialist.slug}`}
                    className="block text-center text-[11px] font-semibold bg-brand-navy text-white rounded-full py-1.5 hover:bg-brand-navy/90 transition-colors">
                    Ver perfil
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <div className="px-4 py-3 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          {markers.length > 0
            ? `${markers.length} de ${specialists.length} especialista${specialists.length !== 1 ? "s" : ""} con ubicación en el mapa`
            : loaded
              ? "Ubicando consultorios en el mapa…"
              : "Cargando mapa…"}
        </p>
      </div>
    </div>
  );
}
