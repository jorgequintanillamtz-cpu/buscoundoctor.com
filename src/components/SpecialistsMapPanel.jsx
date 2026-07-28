import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import { Star, MapPin, Maximize2, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { resolveOfficeCoords } from "@/lib/officeGeo";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// Centro por defecto: Monterrey / San Pedro Garza García
const MTY_CENTER = [25.6714, -100.3096];

// Basemap gris/claro tipo "Silver" (CartoDB Positron), gratuito y sin llave.
const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

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

function MapReady({ onReady }) {
  const map = useMap();
  useEffect(() => { onReady(map); }, [map, onReady]);
  return null;
}

function Initials({ specialist, className }) {
  return (
    <div className={`w-full h-full bg-brand-bluePale flex items-center justify-center font-bold text-brand-navy ${className || ""}`}>
      {specialist.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
    </div>
  );
}

/**
 * Mapa lateral (escritorio) con un pin por cada especialista visible en la
 * lista de resultados. Usa Leaflet + tiles gratuitos de CARTO (basemap claro
 * tipo "Silver"), sin llave de API.
 *
 * Las coordenadas de cada consultorio se resuelven en este orden:
 * 1) lat/lng ya guardados en el consultorio (cacheados desde el panel).
 * 2) el enlace de Google Maps, si es un enlace largo con "@lat,lng".
 * 3) geocodificación de la dirección de texto (respaldo automático).
 *
 * Al hacer clic en la vista previa se abre un mapa grande en modal con la
 * lista de doctores a la izquierda, sincronizada con los pines.
 */
export default function SpecialistsMapPanel({ specialists }) {
  const [offices, setOffices] = useState([]);
  const [zones, setZones] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [markers, setMarkers] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const icon = useMemo(() => pinIcon(), []);
  const resolveTokenRef = useRef(0);
  const bigMapRef = useRef(null);
  const markerRefs = useRef(new Map());
  const cardRefs = useRef(new Map());

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

  const selectMarker = useCallback((id) => {
    setSelectedId(id);
    const target = markers.find((m) => m.specialist.id === id);
    if (target && bigMapRef.current) {
      bigMapRef.current.flyTo(target.coords, 15, { duration: 0.6 });
    }
    const marker = markerRefs.current.get(id);
    if (marker) marker.openPopup();
    const card = cardRefs.current.get(id);
    if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [markers]);

  const renderPopupContent = (specialist, address) => (
    <div className="w-48">
      <div className="flex items-center gap-2.5 mb-1.5">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
          {specialist.profile_photo ? (
            <img src={specialist.profile_photo} alt={specialist.full_name} className="w-full h-full object-cover object-top" />
          ) : (
            <Initials specialist={specialist} className="text-[10px]" />
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
  );

  return (
    <>
      <div className="bg-card rounded-3xl border border-border/50 shadow-sm overflow-hidden">
        <div className="h-[520px] xl:h-[calc(100vh-10rem)] xl:max-h-[720px] relative">
          <MapContainer
            center={MTY_CENTER}
            zoom={12}
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            touchZoom={false}
            zoomControl={false}
            attributionControl={false}
            className="w-full h-full">
            <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
            <FitToMarkers points={points} />
            {markers.map(({ specialist, coords }) => (
              <Marker key={specialist.id} position={coords} icon={icon} />
            ))}
          </MapContainer>

          {/* Overlay: la vista previa solo sirve para abrir el mapa completo */}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label="Ver mapa completo"
            className="absolute inset-0 z-[500] bg-transparent hover:bg-brand-navy/5 transition-colors cursor-pointer" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
            <span className="inline-flex items-center gap-1.5 bg-white shadow-lg border border-border/50 text-brand-navy text-xs font-semibold px-4 py-2 rounded-full">
              <Maximize2 className="w-3.5 h-3.5" />
              Ver mapa completo
            </span>
          </div>
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

      {/* Mapa completo en modal, con lista de doctores a la izquierda */}
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-[96vw] w-[96vw] h-[92vh] p-0 gap-0 overflow-hidden sm:rounded-2xl [&>button]:z-[600] [&>button]:bg-white [&>button]:shadow-md [&>button]:p-2">
          <div className="flex h-full min-h-0">
            {/* Lista de doctores */}
            <div className="w-[380px] flex-shrink-0 h-full overflow-y-auto border-r border-border/50 bg-white hidden sm:block">
              {markers.map(({ specialist, address }) => (
                <button
                  key={specialist.id}
                  ref={(el) => { if (el) cardRefs.current.set(specialist.id, el); }}
                  onClick={() => selectMarker(specialist.id)}
                  className={`w-full text-left flex gap-3 p-4 border-b border-border/50 hover:bg-accent/40 transition-colors ${
                    selectedId === specialist.id ? "bg-accent/60" : ""
                  }`}>
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                    {specialist.profile_photo ? (
                      <img src={specialist.profile_photo} alt={specialist.full_name} className="w-full h-full object-cover object-top" />
                    ) : (
                      <Initials specialist={specialist} className="text-sm" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {specialist.featured && (
                      <span className="inline-block text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mb-1">
                        Destacado
                      </span>
                    )}
                    <p className="font-heading font-bold text-sm text-foreground leading-tight flex items-center gap-1">
                      <span className="truncate">{specialist.full_name}</span>
                      {specialist.license_verification_status === "verified" && (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {specialist.specialty}
                      {specialist.subspecialty ? ` · ${specialist.subspecialty}` : ""}
                    </p>
                    {specialist.rating != null && (
                      <div className="flex items-center gap-0.5 mt-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-3 h-3 ${specialist.rating >= s ? "fill-amber-400 text-amber-400" : "text-border"}`} />
                        ))}
                        <span className="text-xs text-muted-foreground ml-1">{specialist.rating.toFixed(1)}</span>
                      </div>
                    )}
                    <p className="flex items-start gap-1 text-xs text-muted-foreground mt-1.5 leading-snug">
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{address}</span>
                    </p>
                    <Link
                      to={`/especialista/${specialist.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-block mt-2 text-xs font-semibold text-brand-blue hover:underline">
                      Ver perfil →
                    </Link>
                  </div>
                </button>
              ))}
              {markers.length === 0 && (
                <p className="text-sm text-muted-foreground p-6 text-center">Ubicando consultorios…</p>
              )}
            </div>

            {/* Mapa grande e interactivo */}
            <div className="flex-1 h-full relative">
              {expanded && (
                <MapContainer center={MTY_CENTER} zoom={12} scrollWheelZoom className="w-full h-full">
                  <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
                  <FitToMarkers points={points} />
                  <MapReady onReady={(map) => { bigMapRef.current = map; }} />
                  {markers.map(({ specialist, coords, address }) => (
                    <Marker
                      key={specialist.id}
                      position={coords}
                      icon={icon}
                      ref={(el) => { if (el) markerRefs.current.set(specialist.id, el); }}
                      eventHandlers={{
                        click: () => {
                          setSelectedId(specialist.id);
                          cardRefs.current.get(specialist.id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                        },
                      }}>
                      <Popup>{renderPopupContent(specialist, address)}</Popup>
                    </Marker>
                  ))}
                </MapContainer>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
