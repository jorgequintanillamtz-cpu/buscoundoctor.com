import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { ListChecks, Search, Plus, Send, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Deja que el doctor elija, de todo el banco de enfermedades (entidad
// Condition), cuáles trata en realidad. Por default se muestran las de SU
// especialidad más las que ya tenga marcadas de otras especialidades (para
// que nunca "desaparezcan" de la vista solo por no estar buscando); el
// buscador abre la búsqueda a todo el banco -- hay doctores que también
// tratan condiciones que en el catálogo quedaron bajo otra especialidad
// (ej. un internista que también atiende diabetes listada en Endocrinología).
// Si no elige ninguna, el perfil público sigue mostrando el listado genérico
// por especialidad (ver EspecialidadesSection.jsx) -- este componente solo
// permite curar esa lista, no es obligatorio llenarlo.
//
// También deja pedirle al admin que agregue al banco una enfermedad que no
// está (entidad ConditionRequest): el doctor no puede crearla él mismo (el
// banco es curado), pero sí solicitarla y ver el estado de su solicitud.
export default function ConditionsManager({ form, update }) {
  const [allConditions, setAllConditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [requests, setRequests] = useState([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestName, setRequestName] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);

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

  // El historial de solicitudes solo tiene sentido una vez que el perfil ya
  // existe (necesita un specialist_id real al que amarrarlas).
  useEffect(() => {
    let active = true;
    if (!form.id) { setRequests([]); return; }
    base44.entities.ConditionRequest.filter({ specialist_id: form.id }, "-created_date")
      .then((list) => { if (active) setRequests(list); })
      .catch(() => {});
    return () => { active = false; };
  }, [form.id]);

  const selected = form.conditions_relation || [];

  const ownConditions = useMemo(
    () => allConditions.filter((c) => c.specialty === form.specialty),
    [allConditions, form.specialty]
  );

  // Ya marcadas pero clasificadas bajo otra especialidad -- sin esto, en
  // cuanto el doctor borraba el texto del buscador esas condiciones
  // "desaparecían" de la vista aunque siguieran seleccionadas.
  const selectedElsewhere = useMemo(
    () => allConditions.filter((c) => c.specialty !== form.specialty && selected.includes(c.id)),
    [allConditions, form.specialty, selected]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [...ownConditions, ...selectedElsewhere];
    // Con texto en el buscador, ya no se limita a la propia especialidad --
    // busca en todo el banco para que el doctor pueda encontrar y marcar
    // condiciones que el catálogo clasificó bajo otra especialidad.
    return allConditions.filter((c) => c.name.toLowerCase().includes(q));
  }, [allConditions, ownConditions, selectedElsewhere, search]);

  const toggleCondition = (id) => {
    update("conditions_relation", selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const submitRequest = async () => {
    const name = requestName.trim();
    if (!name) { toast.error("Escribe el nombre de la enfermedad"); return; }
    setSubmittingRequest(true);
    try {
      const created = await base44.entities.ConditionRequest.create({
        specialist_id: form.id,
        specialist_name: form.full_name || "",
        requested_name: name,
        note: requestNote.trim(),
        status: "pendiente",
      });
      setRequests((prev) => [created, ...prev]);
      setRequestName("");
      setRequestNote("");
      setShowRequestForm(false);
      toast.success("Solicitud enviada. El admin la va a revisar.");
    } catch (e) {
      toast.error("Error al enviar: " + e.message);
    }
    setSubmittingRequest(false);
  };

  const requestStatusMeta = {
    pendiente: { label: "Pendiente", icon: Clock, className: "text-amber-500" },
    aprobada: { label: "Aprobada", icon: CheckCircle2, className: "text-emerald-600" },
    rechazada: { label: "Rechazada", icon: XCircle, className: "text-red-500" },
  };

  // La solicitud de agregar enfermedad no depende de tener especialidad
  // elegida (es independiente del banco por especialidad), así que se
  // muestra incluso en el estado "todavía sin especialidad".
  const requestSection = (
    <div className="pt-4 border-t border-border/50 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">¿No encuentras una enfermedad en el banco?</p>
        {!showRequestForm && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl gap-1.5 flex-shrink-0"
            disabled={!form.id}
            onClick={() => setShowRequestForm(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Solicitar agregar
          </Button>
        )}
      </div>

      {!form.id && (
        <p className="text-xs text-muted-foreground">Guarda tu perfil primero para poder solicitar una enfermedad nueva.</p>
      )}

      {showRequestForm && (
        <div className="bg-muted/50 rounded-xl p-3 space-y-2">
          <input
            value={requestName}
            onChange={(e) => setRequestName(e.target.value)}
            placeholder="Nombre de la enfermedad"
            className="w-full bg-card text-sm rounded-lg border border-input px-3 py-2 outline-none"
          />
          <textarea
            value={requestNote}
            onChange={(e) => setRequestNote(e.target.value)}
            placeholder="¿Por qué la quieres agregar? (opcional)"
            className="w-full bg-card text-sm rounded-lg border border-input px-3 py-2 outline-none min-h-[60px]"
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" className="rounded-xl gap-1.5" disabled={submittingRequest} onClick={submitRequest}>
              {submittingRequest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Enviar solicitud
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-xl"
              onClick={() => { setShowRequestForm(false); setRequestName(""); setRequestNote(""); }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {requests.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Tus solicitudes:</p>
          {requests.map((r) => {
            const meta = requestStatusMeta[r.status] || requestStatusMeta.pendiente;
            const StatusIcon = meta.icon;
            return (
              <div key={r.id} className="flex items-start gap-2 text-xs bg-card border border-border/40 rounded-lg px-3 py-2">
                <StatusIcon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${meta.className}`} />
                <span className="flex-1 min-w-0">
                  <span className="font-medium text-foreground">{r.requested_name}</span>
                  {" — "}
                  <span className="text-muted-foreground">{meta.label}</span>
                  {r.resolution_note && (
                    <span className="block text-muted-foreground mt-0.5">{r.resolution_note}</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

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
        {requestSection}
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
        Marca las que sí atiendes. Por default se muestran las de tu especialidad ({form.specialty}) más las que ya hayas marcado de otras; usa el buscador si tratas alguna que el catálogo clasificó bajo otra especialidad. Aparecerán en tu perfil público en vez del listado genérico. Si no marcas ninguna, seguimos mostrando el listado genérico.
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
            Todavía no hay enfermedades cargadas para "{form.specialty}" en el banco. Búscalas arriba o solicita una nueva abajo.
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
                {c.specialty !== form.specialty && (
                  <span className="block text-[10px] text-muted-foreground font-medium truncate">{c.specialty}</span>
                )}
              </span>
            </label>
          ))}
        </div>
      )}

      {requestSection}
    </div>
  );
}
