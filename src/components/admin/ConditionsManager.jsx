import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { ListChecks, Search } from "lucide-react";

// Deja que el doctor elija, de las enfermedades ya cargadas en el banco
// (entidad Condition) para SU especialidad, cuáles trata en realidad. Si no
// elige ninguna, el perfil público sigue mostrando el listado genérico por
// especialidad (ver EspecialidadesSection.jsx) -- este componente solo
// permite curar esa lista, no es obligatorio llenarlo.
export default function ConditionsManager({ form, update }) {
  const [conditions, setConditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    if (!form.specialty) { setLoading(false); return; }
    setLoading(true);
    base44.entities.Condition.filter({ specialty: form.specialty, active: true })
      .then((list) => {
        if (!active) return;
        setConditions(list.sort((a, b) => a.name.localeCompare(b.name, "es")));
        setLoading(false);
      })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [form.specialty]);

  const filtered = useMemo(() => {
    if (!search.trim()) return conditions;
    const q = search.trim().toLowerCase();
    return conditions.filter((c) => c.name.toLowerCase().includes(q));
  }, [conditions, search]);

  const selected = form.conditions_relation || [];

  const toggleCondition = (id) => {
    update("conditions_relation", selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  if (!form.specialty) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 p-5">
        <div className="flex items-center gap-2 mb-2">
          <ListChecks className="w-4 h-4 text-primary" />
          <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">Enfermedades que trato</h2>
        </div>
        <p className="text-sm text-muted-foreground py-4 text-center">
          Primero elige tu especialidad principal en "Datos y biografía" para poder elegir de su banco de enfermedades.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ListChecks className="w-4 h-4 text-primary" />
        <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">Enfermedades que trato</h2>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Marca las que sí atiendes de tu especialidad ({form.specialty}). Aparecerán en tu perfil público, en vez del listado genérico. Si no marcas ninguna, seguimos mostrando el listado genérico.
      </p>

      {selected.length > 0 && (
        <p className="text-xs font-medium text-primary">{selected.length} seleccionada{selected.length !== 1 ? "s" : ""}</p>
      )}

      <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar enfermedad..."
          className="bg-transparent text-sm outline-none flex-1"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Cargando catálogo…</p>
      ) : conditions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Todavía no hay enfermedades cargadas para "{form.specialty}" en el banco. Avísale al admin para que las agregue.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Sin resultados para "{search}".</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
          {filtered.map((c) => (
            <label key={c.id} className="flex items-center gap-2 cursor-pointer border border-border/50 rounded-xl px-3 py-2 hover:bg-accent/30 transition-colors">
              <input
                type="checkbox"
                checked={selected.includes(c.id)}
                onChange={() => toggleCondition(c.id)}
                className="w-4 h-4 rounded border-input accent-primary flex-shrink-0"
              />
              <span className="text-sm text-foreground">{c.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
