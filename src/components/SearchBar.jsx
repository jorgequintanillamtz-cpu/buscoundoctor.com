import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SearchBar({ className = "" }) {
  const [specialties, setSpecialties] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    base44.entities.Specialty.filter({ active: true }).then(setSpecialties);
  }, []);

  const handleSelect = (value) => {
    navigate(`/especialistas?specialty=${encodeURIComponent(value)}`);
  };

  return (
    <div className={className}>
      <Select onValueChange={handleSelect}>
        <SelectTrigger className="w-full h-12 sm:h-14 rounded-2xl text-sm border-border/80 focus:ring-2 focus:ring-primary/20 focus:border-primary">
          <SelectValue placeholder="¿Qué especialidad buscas?" />
        </SelectTrigger>
        <SelectContent>
          {specialties.map((s) => (
            <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}