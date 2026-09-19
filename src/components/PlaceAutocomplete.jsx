import { useState, useEffect, useRef, useCallback } from "react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GOOGLE_MAPS_API_KEY, hasGoogleMaps, MTY_CENTER, parsePlace } from "@/lib/googleMaps";

// Solo campos del nivel básico (Essentials): pedir más, como el nombre del
// lugar, sube el precio de cada dirección elegida.
const FIELDS = ["id", "location", "formattedAddress", "addressComponents"];

function AutocompleteInput({ onSelect, placeholder, initialValue }) {
  const placesLib = useMapsLibrary("places");
  const [value, setValue] = useState(initialValue || "");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const tokenRef = useRef(null);
  const timerRef = useRef(null);
  const requestRef = useRef(0);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (placesLib && !tokenRef.current) tokenRef.current = new placesLib.AutocompleteSessionToken();
  }, [placesLib]);

  useEffect(() => {
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const search = useCallback((text) => {
    if (!placesLib) return;
    clearTimeout(timerRef.current);
    if (text.trim().length < 3) { setSuggestions([]); return; }
    timerRef.current = setTimeout(async () => {
      const id = ++requestRef.current;
      setBusy(true);
      try {
        const { suggestions: results } = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: text,
          sessionToken: tokenRef.current,
          includedRegionCodes: ["mx"],
          language: "es-MX",
          locationBias: { center: MTY_CENTER, radius: 50000 },
        });
        if (id !== requestRef.current) return;
        setSuggestions((results || []).filter((s) => s.placePrediction));
        setFailed(false);
        setOpen(true);
      } catch {
        if (id === requestRef.current) { setSuggestions([]); setFailed(true); }
      }
      if (id === requestRef.current) setBusy(false);
    }, 250);
  }, [placesLib]);

  const pick = async (suggestion) => {
    const prediction = suggestion.placePrediction;
    setValue(prediction.text.text);
    setOpen(false);
    setSuggestions([]);
    setBusy(true);
    try {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: FIELDS });
      onSelect(parsePlace(place));
    } catch {
      setFailed(true);
    }
    // El token de sesión se agota al pedir los detalles: uno nuevo por búsqueda.
    tokenRef.current = new placesLib.AutocompleteSessionToken();
    setBusy(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input
        value={value}
        onChange={(e) => { setValue(e.target.value); search(e.target.value); }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className="pl-9 pr-9"
      />
      {busy && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((s) => (
            <li key={s.placePrediction.placeId}>
              <button
                type="button"
                onClick={() => pick(s)}
                className="w-full text-left px-3 py-2.5 hover:bg-accent/60 transition-colors">
                <span className="block text-sm font-medium text-foreground truncate">{s.placePrediction.mainText?.text}</span>
                <span className="block text-xs text-muted-foreground truncate">{s.placePrediction.secondaryText?.text}</span>
              </button>
            </li>
          ))}
          <li className="px-3 py-1.5 text-[10px] text-muted-foreground text-right border-t border-border/50">Google</li>
        </ul>
      )}
      {failed && (
        <p className="text-xs text-muted-foreground mt-1">No se pudo buscar la dirección. Puedes llenar los campos a mano.</p>
      )}
    </div>
  );
}

/**
 * Buscador de direcciones con Google Places. Al elegir una sugerencia llama
 * onSelect con { street, ext_number, neighborhood, postal_code, locality,
 * formatted_address, place_id, latitude, longitude }.
 * Sin llave de Google configurada no muestra nada: el formulario sigue
 * funcionando con captura manual.
 */
export default function PlaceAutocomplete({ onSelect, placeholder = "Busca tu consultorio o dirección", initialValue }) {
  if (!hasGoogleMaps) return null;
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} language="es" region="MX">
      <AutocompleteInput onSelect={onSelect} placeholder={placeholder} initialValue={initialValue} />
    </APIProvider>
  );
}
