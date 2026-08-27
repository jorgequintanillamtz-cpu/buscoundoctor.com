import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Deja que el doctor marque cuáles subespecialidades certificadas tiene,
// de las que cuelgan de SU especialidad principal (entidad Subspecialty,
// banco separado de Specialty -- ver /admin/subespecialidades). A
// diferencia de "Enfermedades que trato", aquí no se busca en todo el
// banco: una subespecialidad solo tiene sentido bajo la especialidad base
// a la que pertenece según CONACEM, así que la lista siempre se filtra por
// el parent_specialty_id que coincide con form.specialty.
//
// Esto es lo que hace posible que un paciente que busca "Cirugía
// Maxilofacial" encuentre directo a esos doctores sin mezclarse con la
// lista general de "Dentista" -- el filtro de /especialistas hace match
// exacto contra subspecialties_relation, así que solo aparece quien
// explícitamente marcó aquí que la tiene certificada.
export default function SubspecialtiesManager({ form, update }) {
  const [allSpecialties, setAllSpecialties] = useState([]);
  const [allSubspecialties, setAllSubspecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingIds, setSavingIds] = useState(() => new Set());

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      base44.entities.Specialty.filter({ active: true }),
      base44.entities.Subspecialty.list("name", 500),
    ])
      .then(([specs, subs]) => {
        if (!active) return;
        setAllSpecialties(specs);
        setAllSubspecialties(subs.filter((s) => s.active !== false));
        setLoading(false);
      })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const currentSpecialtyId = useMemo(
    () => allSpecialties.find((s) => s.name === form.specialty)?.id,
    [allSpecialties, form.specialty]
  );

  const available = useMemo(
    () => allSubspecialties.filter((s) => s.parent_specialty_id === currentSpecialtyId),
    [allSubspecialties, currentSpecialtyId]
  );

  const selected = form.subspecialties_relation || [];

  const toggle = async (id) => {
    const previous = selected;
    const next = previous.includes(id) ? previous.filter((x) => x !== id) : [...previous, id];
    update("subspecialties_relation", next);
    if (!form.id) return; // perfil todavía no guardado -- se creará junto con el resto del formulario
    setSavingIds((prev) => new Set(prev).add(id));
    try {
      await base44.entities.Specialist.update(form.id, { subspecialties_relation: next });
    } catch (e) {
      update("subspecialties_relation", previous);
      toast.error("No se pudo guardar el cambio: " + e.message);
    }
    setSavingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  };

  if (!form.specialty) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 p-5">
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap className="w-4 h-4 text-primary" />
          <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">Subespecialidades</h2>
        </div>
        <p className="text-sm text-muted-foreground py-4 text-center">
          Primero elige tu especialidad principal en "Datos y biografía" para ver las subespecialidades disponibles.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <GraduationCap className="w-4 h-4 text-primary" />
        <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">Subespecialidades</h2>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Marca las que tienes certificadas dentro de {form.specialty}. Aparecen en tu perfil público y hacen que pacientes que buscan esa subespecialidad específica te encuentren directo, sin mezclarte con el listado general de {form.specialty}.
      </p>

      {selected.length > 0 && (
        <p className="text-xs font-medium text-primary">{selected.length} seleccionada{selected.length !== 1 ? "s" : ""}</p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Cargando…</p>
      ) : available.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Todavía no hay subespecialidades cargadas para "{form.specialty}" en el banco. Si tienes una certificación que no aparece aquí, avísale al admin para que la agregue.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {available.map((s) => (
            <label key={s.id} className="flex items-center gap-2 cursor-pointer border border-border/50 rounded-xl px-3 py-2 hover:bg-accent/30 transition-colors">
              {savingIds.has(s.id) ? (
                <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <input
                  type="checkbox"
                  checked={selected.includes(s.id)}
                  onChange={() => toggle(s.id)}
                  className="w-4 h-4 rounded border-input accent-primary flex-shrink-0"
                />
              )}
              <span className="text-sm text-foreground flex-1 min-w-0">{s.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
