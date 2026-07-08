import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [zones, setZones] = useState([]);
  const [specId, setSpecId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    Promise.all([
      base44.entities.Specialty.filter({ active: true }).catch(() => []),
      base44.entities.Zone.filter({ active: true }).catch(() => []),
    ]).then(([s, z]) => { setSpecialties(s); setZones(z); });
  }, []);

  const spec = specialties.find((s) => s.id === specId);
  const zone = zones.find((z) => z.id === zoneId);
  const onListPage = location.pathname.startsWith("/especialistas");
  const canBuscar = onListPage ? Boolean(spec || zone) : Boolean(spec);

  const handleBuscar = () => {
    if (!canBuscar) return;
    // En la página de lista, preservar el filtrado por query params (no romper SpecialistList)
    if (onListPage) {
      const params = new URLSearchParams();
      if (spec?.name) params.set("specialty", spec.name);
      if (zone?.name) params.set("zone", zone.name);
      navigate(`/especialistas?${params.toString()}`);
      return;
    }
    // Fuera de la lista: navegar a la página SEO de especialidad (o combinada con zona)
    const base = `/especialidad/${spec.slug}`;
    navigate(zone ? `${base}/${slugify(zone.name)}` : base);
  };

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={specId} onValueChange={setSpecId}>
          <SelectTrigger className="w-full h-12 sm:h-14 rounded-2xl text-sm border-border/80 focus:ring-2 focus:ring-primary/20 focus:border-primary">
            <SelectValue placeholder="¿Qué especialidad buscas?" />
          </SelectTrigger>
          <SelectContent>
            {specialties.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={zoneId} onValueChange={setZoneId}>
          <SelectTrigger className="w-full sm:w-44 h-12 sm:h-14 rounded-2xl text-sm border-border/80 focus:ring-2 focus:ring-primary/20 focus:border-primary">
            <SelectValue placeholder="Zona (opcional)" />
          </SelectTrigger>
          <SelectContent>
            {zones.map((z) => (
              <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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