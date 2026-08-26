import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { ListChecks, Search } from "lucide-react";

// Deja que el doctor elija, de las enfermedades ya cargadas en el banco
// (entidad Condition) para SU especialidad, cuáles trata en realidad. Si no
// elige ninguna, el perfil público sigue mostrando el listado genérico por
// especialidad (ver EspecialidadesSection.jsx) -- este componente solo
// permite curar esa lista, no es obligatorio llenarlo.
export default function ConditionsManager({ form, update }) {
  const [allConditions, setAllConditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    // Límite alto a propósito: el banco ya pasa de 1000 registros y el
    // default de .list() se queda corto (mismo bug que se corrigió en
    // /admin/enfermedades). Se filtra "active" en el cliente porque .list()
    // no acepta un query, solo orden y límite.
    base44.entities.Condition.list("name", 2000)
      .then((list) => {
        if (!active) return;
        setAllConditions(list.filter((c) => c.active !== false));
        setLoading(false);
      })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const ownConditions = useMemo(
    () => allConditions.filter((c) => c.specialty === form.specialty),
    [allConditions, form.specialty]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ownConditions;
    // Con texto en el buscador, ya no se limita a la propia especialidad --
    // busca en todo el banco para que el doctor pueda encontrar y marcar
    // condiciones que el catálogo clasificó bajo otra especialidad.
    return allConditions.filter((c) => c.name.toLowerCase().includes(q));
  }, [allConditions, ownConditions, search]);

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

  const isSearching = search.trim().length > 0;

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ListChecks className="w-4 h-4 text-primary" />
        <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">Enfermedades que trato</h2>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Marca las que sí atiendes. Por default se muestran las de tu especialidad ({form.specialty}); usa el buscador si tratas alguna que el catálogo clasificó bajo otra especialidad. Aparecerán en tu perfil público en vez del listado genérico. Si no marcas ninguna, seguimos mostrando el listado genérico.
      </p>

      {selected.length > 0 && (
        <p className="text-xs font-medium text-primary">{selected.length} seleccionada{selected.length !== 1 ? "s" : ""}</p>
      )}

      <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar en todo el banco de enfermedades..."
          className="bg-transparent text-sm outline-none flex-1"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Cargando catálogo…</p>
      ) : filtered.length === 0 ? (
        isSearching ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Sin resultados para "{search}".</p>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Todavía no hay enfermedades cargadas para "{form.specialty}" en el banco. Búscalas arriba o avísale al admin para que las agregue.
          </p>
        )
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
              <span className="text-sm text-foreground flex-1 min-w-0">
                {c.name}
                {isSearching && c.specialty !== form.specialty && (
                  <span className="block text-[10px] text-muted-foreground font-medium truncate">{c.specialty}</span>
                )}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
