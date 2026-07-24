import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Pencil, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const DEGREES = [
  { v: "licenciatura", label: "Licenciatura" },
  { v: "especialidad", label: "Especialidad" },
  { v: "subespecialidad", label: "Subespecialidad" },
  { v: "maestria", label: "Maestría" },
  { v: "doctorado", label: "Doctorado" },
  { v: "certificacion", label: "Certificación" },
];

const DEGREE_LABEL = (v) => DEGREES.find((d) => d.v === v)?.label || v;

const emptyEducation = () => ({
  institution_name: "",
  degree_type: "especialidad",
  field_of_study: "",
  start_year: "",
  end_year: "",
  comment: "",
});

function EducationForm({ initial, onCancel, onSave, saving }) {
  const [edu, setEdu] = useState(initial || emptyEducation());

  const submit = () => {
    if (!edu.institution_name.trim()) { toast.error("La institución es obligatoria"); return; }
    if (!edu.degree_type) { toast.error("Selecciona el tipo de grado"); return; }
    onSave(edu);
  };

  return (
    <div className="border border-primary/30 rounded-xl p-4 bg-accent/20 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium mb-1 block">Institución *</label>
          <Input
            value={edu.institution_name}
            onChange={(e) => setEdu({ ...edu, institution_name: e.target.value })}
            className="rounded-xl text-sm"
            placeholder="Ej: Universidad Autónoma de Nuevo León"
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Tipo de grado *</label>
          <select
            value={edu.degree_type}
            onChange={(e) => setEdu({ ...edu, degree_type: e.target.value })}
            className="w-full h-9 px-3 text-sm bg-background border border-input rounded-xl"
          >
            {DEGREES.map((d) => (
              <option key={d.v} value={d.v}>{d.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Campo de estudio</label>
          <Input
            value={edu.field_of_study || ""}
            onChange={(e) => setEdu({ ...edu, field_of_study: e.target.value })}
            className="rounded-xl text-sm"
            placeholder="Ej: Medicina General"
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Año de inicio</label>
          <Input
            type="number"
            value={edu.start_year || ""}
            onChange={(e) => setEdu({ ...edu, start_year: e.target.value })}
            className="rounded-xl text-sm"
            placeholder="2010"
            min={1950}
            max={2035}
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Año de fin</label>
          <Input
            type="number"
            value={edu.end_year || ""}
            onChange={(e) => setEdu({ ...edu, end_year: e.target.value })}
            className="rounded-xl text-sm"
            placeholder="2016"
            min={1950}
            max={2035}
          />
        </div>
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium block">Comentario o logro destacado (opcional)</label>
            <span className="text-xs text-muted-foreground">{(edu.comment || "").length}/500</span>
          </div>
          <textarea
            value={edu.comment || ""}
            onChange={(e) => { if (e.target.value.length <= 500) setEdu({ ...edu, comment: e.target.value }); }}
            className="w-full min-h-[70px] px-3 py-2 text-sm border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            placeholder="Ej: Mejor promedio de mi generación, publicación destacada, reconocimiento académico..."
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} className="rounded-xl">Cancelar</Button>
        <Button size="sm" onClick={submit} disabled={saving} className="rounded-xl">
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

export default function EducationManager({ specialistId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    if (!specialistId) { setLoading(false); return; }
    setLoading(true);
    try {
      const list = await base44.entities.SpecialistEducation.filter({ specialist_id: specialistId });
      setItems(list.sort((a, b) => (b.end_year || 0) - (a.end_year || 0)));
    } catch {
      toast.error("Error al cargar formación académica");
    }
    setLoading(false);
  }, [specialistId]);

  useEffect(() => { load(); }, [load]);

  const save = async (data) => {
    setSaving(true);
    try {
      const payload = {
        institution_name: data.institution_name,
        degree_type: data.degree_type,
        field_of_study: data.field_of_study || "",
        start_year: data.start_year ? Number(data.start_year) : undefined,
        end_year: data.end_year ? Number(data.end_year) : undefined,
        comment: data.comment || "",
      };
      if (data.id) {
        await base44.entities.SpecialistEducation.update(data.id, payload);
      } else {
        await base44.entities.SpecialistEducation.create({ ...payload, specialist_id: specialistId });
      }
      toast.success(data.id ? "Formación actualizada" : "Formación agregada");
      setEditingId(null);
      await load();
    } catch (e) {
      toast.error("Error al guardar: " + e.message);
    }
    setSaving(false);
  };

  const remove = async (id) => {
    setSaving(true);
    try {
      await base44.entities.SpecialistEducation.delete(id);
      toast.success("Registro eliminado");
      setConfirmId(null);
      await load();
    } catch (e) {
      toast.error("Error al eliminar: " + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">Formación académica</h2>
        {editingId === null && (
          <Button size="sm" variant="outline" onClick={() => setEditingId("new")} className="rounded-xl gap-1.5">
            <Plus className="w-4 h-4" /> Agregar
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {editingId === "new" && (
            <EducationForm onCancel={() => setEditingId(null)} onSave={save} saving={saving} />
          )}

          {items.length === 0 && editingId !== "new" && (
            <p className="text-sm text-muted-foreground py-4 text-center">Sin formación académica registrada. Agrega la primera.</p>
          )}

          {items.map((edu) => (
            <div key={edu.id} className="border border-border/60 rounded-xl p-4 space-y-2">
              {editingId === edu.id ? (
                <EducationForm initial={{ ...edu }} onCancel={() => setEditingId(null)} onSave={save} saving={saving} />
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <GraduationCap className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{edu.institution_name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {DEGREE_LABEL(edu.degree_type)}{edu.field_of_study ? ` · ${edu.field_of_study}` : ""}
                      {(edu.start_year || edu.end_year) ? ` · ${edu.start_year || ""}${edu.end_year ? `–${edu.end_year}` : ""}` : ""}
                    </p>
                    {edu.comment && (
                      <p className="text-xs text-foreground/80 mt-1 italic">“{edu.comment}”</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => setEditingId(edu.id)} className="h-8 w-8">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setConfirmId(edu.id)} className="h-8 w-8 text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
              {confirmId === edu.id && (
                <div className="flex items-center gap-2 bg-destructive/10 rounded-lg p-2 mt-2">
                  <span className="text-xs text-destructive flex-1">¿Eliminar este registro?</span>
                  <Button size="sm" variant="destructive" onClick={() => remove(edu.id)} className="h-7 text-xs">Sí, eliminar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)} className="h-7 text-xs">No</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
