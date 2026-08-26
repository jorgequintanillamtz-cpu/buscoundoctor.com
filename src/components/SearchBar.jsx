import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, Stethoscope, MapPin } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import SearchableSelect from "@/components/SearchableSelect";
import { buildSearchOptions } from "@/lib/searchOptions";
import { resolveCitySlug } from "@/lib/citySlug";


export default function SearchBar({ className = "" }) {
  const [specialties, setSpecialties] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [zones, setZones] = useState([]);
  const [pickId, setPickId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    Promise.all([
      base44.entities.Specialty.filter({ active: true }).catch(() => []),
      base44.entities.Zone.filter({ active: true }).catch(() => []),
      // Límite alto explícito: el banco ya pasa de 1000 registros y el
      // default del backend se queda corto ahí (mismo bug que se corrigió
      // en /admin/enfermedades), dejando fuera del buscador principal
      // enfermedades reales que sí están en el catálogo.
      base44.entities.Condition.filter({ active: true }, "name", 2000).catch(() => []),
    ]).then(([s, z, c]) => { setSpecialties(s); setZones(z); setConditions(c); });
  }, []);

  // Especialidades y enfermedades combinadas en un solo buscador (como el de
  // Doctoralia): el usuario puede escribir tanto "dermatólogo" como "acné".
  const searchOptions = useMemo(() => buildSearchOptions(specialties, conditions), [specialties, conditions]);
  const picked = searchOptions.find((o) => o.id === pickId);
  const zone = zones.find((z) => z.id === zoneId);
  const onListPage = location.pathname.startsWith("/especialistas");
  const canBuscar = onListPage ? Boolean(picked || zone) : Boolean(picked);

  // Las enfermedades ya no resuelven a "la" especialidad que las clasifica
  // en el catálogo (ver handleBuscar) -- resolvedSpecialty ahora solo aplica
  // a picks de especialidad.
  const resolvedSpecialty = picked?.type === "specialty" ? picked.ref : null;

  const handleBuscar = () => {
    if (!canBuscar) return;
    if (picked?.type === "condition") {
      // Antes esto resolvía a "la" especialidad que clasifica la enfermedad
      // en el catálogo (ej. Acupuntura para "Ansiedad y estrés"), lo que
      // escondía a doctores de otras especialidades que también la tratan.
      // Ahora se manda directo a la página de la enfermedad, que lista a
      // quien la haya marcado en su perfil (conditions_relation) sin
      // importar su especialidad, ya scopeada a la ciudad elegida.
      const citySlug = resolveCitySlug(zones, zone?.name);
      navigate(`/enfermedades/${picked.ref.slug}/${citySlug}`);
      return;
    }
    // En la página de lista, preservar el filtrado por query params (no romper SpecialistList)
    if (onListPage) {
      const params = new URLSearchParams();
      if (resolvedSpecialty?.name) params.set("specialty", resolvedSpecialty.name);
      if (zone?.name) params.set("zone", zone.name);
      navigate(`/especialistas?${params.toString()}`);
      return;
    }
    // Fuera de la lista: navegar a la página SEO de especialidad, ya scopeada a la ciudad elegida
    const citySlug = resolveCitySlug(zones, zone?.name);
    navigate(`/${resolvedSpecialty.profession_slug}/${citySlug}`);
  };

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row gap-2">
        <SearchableSelect
          options={searchOptions}
          value={pickId}
          onChange={setPickId}
          placeholder="¿Qué especialidad o enfermedad buscas?"
          icon={Stethoscope}
          triggerClassName="w-full h-12 sm:h-14 px-4 rounded-2xl border border-border/80 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary"
        />
        <SearchableSelect
          options={zones}
          value={zoneId}
          onChange={setZoneId}
          placeholder="Ciudad (opcional)"
          icon={MapPin}
          hint="Ciudad"
          triggerClassName="w-full sm:w-44 h-12 sm:h-14 px-4 rounded-2xl border border-border/80 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary"
        />
        <Button
          onClick={handleBuscar}
          disabled={!canBuscar}
          className="h-12 sm:h-14 rounded-2xl px-6 font-heading font-semibold"
        >
          <Search className="w-4 h-4" />
          Buscar
        </Button>
      </div>
    </div>
  );
}