import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, Stethoscope, MapPin } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import SearchableSelect from "@/components/SearchableSelect";
import { buildSearchOptions } from "@/lib/searchOptions";
import { resolveCitySlug } from "@/lib/citySlug";

const slugify = (s) => (s || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9\s-]/g, "")
  .trim()
  .replace(/\s+/g, "-")
  .replace(/-+/g, "-");

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
      base44.entities.Condition.filter({ active: true }).catch(() => []),
    ]).then(([s, z, c]) => { setSpecialties(s); setZones(z); setConditions(c); });
  }, []);

  // Especialidades y enfermedades combinadas en un solo buscador (como el de
  // Doctoralia): el usuario puede escribir tanto "dermatólogo" como "acné".
  const searchOptions = useMemo(() => buildSearchOptions(specialties, conditions), [specialties, conditions]);
  const picked = searchOptions.find((o) => o.id === pickId);
  const zone = zones.find((z) => z.id === zoneId);
  const onListPage = location.pathname.startsWith("/especialistas");
  const canBuscar = onListPage ? Boolean(picked || zone) : Boolean(picked);

  // Si se eligió una enfermedad, la búsqueda resuelve a la especialidad que la
  // atiende: así el usuario ve el listado completo de doctores de esa
  // especialidad (con filtros), no solo la página informativa de la enfermedad.
  const resolvedSpecialty = picked?.type === "specialty"
    ? picked.ref
    : picked?.type === "condition"
      ? specialties.find((s) => s.name === picked.ref.specialty)
      : null;

  const handleBuscar = () => {
    if (!canBuscar) return;
    // En la página de lista, preservar el filtrado por query params (no romper SpecialistList)
    if (onListPage) {
      const params = new URLSearchParams();
      if (resolvedSpecialty?.name) params.set("specialty", resolvedSpecialty.name);
      if (zone?.name) params.set("zone", zone.name);
      navigate(`/especialistas?${params.toString()}`);
      return;
    }
    // Fuera de la lista: navegar a la página SEO de especialidad (o combinada con zona)
    const citySlug = resolveCitySlug(zones, zone?.name);
    const base = `/${resolvedSpecialty.profession_slug}/${citySlug}`;
    navigate(zone ? `${base}/${slugify(zone.name)}` : base);
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
          placeholder="Zona (opcional)"
          icon={MapPin}
          hint="Zona"
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