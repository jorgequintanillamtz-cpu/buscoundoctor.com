import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { APIProvider, Map as GoogleMap, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { Link } from "react-router-dom";
import { Star, MapPin, Maximize2, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useSpecialtyDisplayMap } from "@/hooks/useSpecialtyDisplay";
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAP_ID, MTY_CENTER, hasGoogleMaps } from "@/lib/googleMaps";

// Pin de marca (#2F6FED) para los marcadores del mapa.
function Pin({ active }) {
  return (
    <div style={{ width: 32, height: 40, transform: active ? "scale(1.2)" : "none", transformOrigin: "bottom center", filter: "drop-shadow(0 3px 4px rgba(11,30,77,0.35))" }}>
      <svg viewBox="0 0 34 42" width="32" height="40">
        <path d="M17 0C7.6 0 0 7.6 0 17c0 12.7 17 25 17 25s17-12.3 17-25C34 7.6 26.4 0 17 0z" fill={active ? "#0B1E4D" : "#2F6FED"} />
        <circle cx="17" cy="17" r="7" fill="#ffffff" />
      </svg>
    </div>
  );
}

// Encuadra el mapa para que quepan todos los pines.
function FitToMarkers({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(14);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 36);
    const listener = window.google.maps.event.addListenerOnce(map, "idle", () => {
      if (map.getZoom() > 15) map.setZoom(15);
    });
    return () => listener.remove();
  }, [points, map]);
  return null;
}

// Centra el mapa grande en el especialista elegido desde la lista.
function FocusSelected({ markers, selectedId }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !selectedId) return;
    const target = markers.find((m) => m.specialist.id === selectedId);
    if (target) {
      map.panTo(target.coords);
      map.setZoom(15);
    }
  }, [selectedId, map]); // solo al cambiar la selección, no cuando cambia la lista
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
 * lista de resultados, sobre Google Maps. Usa las coordenadas exactas
 * guardadas en cada consultorio (latitude/longitude, que se capturan con el
 * buscador de direcciones de Google); los consultorios sin coordenadas no
 * aparecen en el mapa.
 *
 * Al hacer clic en la vista previa se abre un mapa grande en modal con la
 * lista de doctores a la izquierda, sincronizada con los pines.
 */
function MapPanel({ specialists }) {
  const specialtyDisplayMap = useSpecialtyDisplayMap();
  const [offices, setOffices] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const cardRefs = useRef(new Map());

  useEffect(() => {
    let mounted = true;
    base44.entities.Office.list().catch(() => []).then((offs) => {
      if (mounted) { setOffices(offs || []); setLoaded(true); }
    });
    return () => { mounted = false; };
  }, []);

  // Consultorio principal (o el primero disponible) por especialista.
  const officeBySpecialist = useMemo(() => {
    const map = new Map();
    for (const office of offices) {
      if (office.latitude == null || office.longitude == null) continue;
      const existing = map.get(office.specialist_id);
      if (!existing || office.is_primary) map.set(office.specialist_id, office);
    }
    return map;
  }, [offices]);

  const markers = useMemo(
    () =>
      specialists
        .map((specialist) => {
          const office = officeBySpecialist.get(specialist.id);
          if (!office) return null;
          return {
            specialist,
            coords: { lat: Number(office.latitude), lng: Number(office.longitude) },
            address: office.address_line,
          };
        })
        .filter(Boolean),
    [specialists, officeBySpecialist]
  );

  const points = useMemo(() => markers.map((m) => m.coords), [markers]);

  const selectMarker = useCallback((id) => {
    setSelectedId(id);
    const card = cardRefs.current.get(id);
    if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const selectedMarker = markers.find((m) => m.specialist.id === selectedId);

  const renderPopupContent = (specialist, address) => (
    <div className="w-48">
      <div className="flex items-center gap-2.5 mb-1.5">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
          {specialist.profile_photo ? (
            <img src={specialist.profile_photo} alt={specialist.full_name} loading="lazy" className="w-full h-full object-cover object-top" />
          ) : (
            <Initials specialist={specialist} className="text-[10px]" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-heading font-bold text-xs text-foreground leading-tight truncate">{specialist.full_name}</p>
          <p className="text-[11px] text-muted-foreground leading-tight truncate">{specialtyDisplayMap[specialist.specialty] || specialist.specialty}</p>
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

  if (!hasGoogleMaps) {
    // Sin llave de Google no hay mapa: en producción no se muestra nada; en
    // desarrollo, un aviso para saber qué falta.
    return import.meta.env.DEV ? (
      <div className="bg-card rounded-3xl border border-dashed border-border p-6 text-xs text-muted-foreground">
        Mapa desactivado: falta <code>VITE_GOOGLE_MAPS_API_KEY</code> en el archivo <code>.env</code>.
      </div>
    ) : null;
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} language="es" region="MX">
      <div className="bg-card rounded-3xl border border-border/50 shadow-sm overflow-hidden">
        <div className="h-[520px] xl:h-[calc(100vh-10rem)] xl:max-h-[720px] relative">
          <GoogleMap
            mapId={GOOGLE_MAP_ID}
            defaultCenter={MTY_CENTER}
            defaultZoom={12}
            gestureHandling="none"
            disableDefaultUI
            keyboardShortcuts={false}
            clickableIcons={false}
            className="w-full h-full">
            <FitToMarkers points={points} />
            {markers.map(({ specialist, coords }) => (
              <AdvancedMarker key={specialist.id} position={coords}>
                <Pin />
              </AdvancedMarker>
            ))}
          </GoogleMap>

          {/* Overlay: la vista previa solo sirve para abrir el mapa completo */}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label="Ver mapa completo"
            className="absolute inset-0 z-10 bg-transparent hover:bg-brand-navy/5 transition-colors cursor-pointer" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
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
                ? "Aún no hay consultorios ubicados en el mapa"
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
                      <img src={specialist.profile_photo} alt={specialist.full_name} loading="lazy" className="w-full h-full object-cover object-top" />
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
                      {specialtyDisplayMap[specialist.specialty] || specialist.specialty}
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
                <p className="text-sm text-muted-foreground p-6 text-center">{loaded ? "Aún no hay consultorios ubicados en el mapa." : "Cargando…"}</p>
              )}
            </div>

            {/* Mapa grande e interactivo */}
            <div className="flex-1 h-full relative">
              {expanded && (
                <GoogleMap
                  mapId={GOOGLE_MAP_ID}
                  defaultCenter={MTY_CENTER}
                  defaultZoom={12}
                  gestureHandling="greedy"
                  clickableIcons={false}
                  className="w-full h-full"
                  onClick={() => setSelectedId(null)}>
                  <FitToMarkers points={points} />
                  <FocusSelected markers={markers} selectedId={selectedId} />
                  {markers.map(({ specialist, coords }) => (
                    <AdvancedMarker
                      key={specialist.id}
                      position={coords}
                      zIndex={selectedId === specialist.id ? 10 : 1}
                      onClick={() => selectMarker(specialist.id)}>
                      <Pin active={selectedId === specialist.id} />
                    </AdvancedMarker>
                  ))}
                  {selectedMarker && (
                    <InfoWindow
                      position={selectedMarker.coords}
                      pixelOffset={[0, -42]}
                      onCloseClick={() => setSelectedId(null)}>
                      {renderPopupContent(selectedMarker.specialist, selectedMarker.address)}
                    </InfoWindow>
                  )}
                </GoogleMap>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </APIProvider>
  );
}

// El panel solo se ve en pantallas grandes (xl, 1280px). En celular y tablet no
// se monta: así no se descarga Google Maps ni se cuenta una carga cobrable
// por un mapa que nadie ve.
export default function SpecialistsMapPanel(props) {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1280px)").matches
  );
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1280px)");
    const onChange = (e) => setIsDesktop(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return isDesktop ? <MapPanel {...props} /> : null;
}
