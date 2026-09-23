import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { slugify } from "@/lib/citySlug";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

// Estado y acciones que comparten los "bancos" de taxonomía médica
// (Especialidades, Subespecialidades, Enfermedades): cargar, buscar,
// paginar, crear/editar en una ventana emergente con URL automática desde
// el nombre, borrar con confirmación, y prender/apagar "Activa". Antes cada
// pantalla tenía su propia copia de todo esto (~150 líneas repetidas cada
// una) y ya se habían desalineado entre sí (ver AdminSubespecialidades vs
// AdminEnfermedades). Lo que SÍ sigue siendo de cada pantalla: sus propios
// campos del formulario, sus columnas de tabla, y su propio cálculo de
// "huecos" (cada banco lo entiende distinto).
//
// `config`:
//   entity            - el entity de base44 (ej. base44.entities.Specialty)
//   entityLabel       - nombre en español para los mensajes ("especialidad")
//   sortField         - campo para ordenar el list() inicial (default "name")
//   listLimit         - límite del list() (default 500)
//   emptyForm         - forma vacía del formulario
//   toFormValues(item)- del registro guardado a los campos del formulario (al editar)
//   validate(form)    - devuelve un mensaje de error, o null si está bien
//                       (además del nombre, que ya se exige aquí siempre)
//   buildPayload(form, slug) - default: { ...form, slug }
//   deleteMessage(item)      - descripción del diálogo de confirmar borrado
//   afterCreate(created, form) - efecto extra tras crear (ej. cerrar la
//                       solicitud del doctor que originó la enfermedad)
export function useTaxonomyBank(config) {
  const {
    entity,
    entityLabel,
    sortField = "name",
    listLimit = 500,
    emptyForm,
    toFormValues,
    validate,
    buildPayload = (form, slug) => ({ ...form, slug }),
    deleteMessage = () => "Esto no se puede deshacer.",
    afterCreate,
  } = config;

  const { confirm, dialogProps } = useConfirmDialog();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null); // null = cerrado, {} = nuevo, objeto = editando
  const [form, setForm] = useState(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    const data = await entity.list(sortField, listLimit);
    setItems(data.sort((a, b) => (a.name || "").localeCompare(b.name || "", "es")));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const searched = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter((i) => (i.name || "").toLowerCase().includes(q));
  }, [items, search]);

  const openNew = (overrides = {}) => {
    setForm({ ...emptyForm, ...overrides });
    setSlugTouched(false);
    setEditing({});
  };

  const openEdit = (item) => {
    setForm(toFormValues(item));
    setSlugTouched(true);
    setEditing(item);
  };

  const closeModal = () => { setEditing(null); setForm(emptyForm); };

  const updateField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && !slugTouched) next.slug = slugify(value);
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error("El nombre es obligatorio"); return null; }
    const extraError = validate?.(form);
    if (extraError) { toast.error(extraError); return null; }
    const slug = (form.slug || slugify(form.name)).trim();
    const duplicate = items.some((i) => i.slug === slug && i.id !== editing?.id);
    if (duplicate) { toast.error(`Ya existe una ${entityLabel} con ese slug. Cámbialo para que sea único.`); return null; }

    setSaving(true);
    let created = null;
    try {
      const payload = buildPayload(form, slug);
      if (editing?.id) {
        await entity.update(editing.id, payload);
        setItems((prev) => prev.map((i) => (i.id === editing.id ? { ...i, ...payload } : i)));
        toast.success(`${entityLabel[0].toUpperCase()}${entityLabel.slice(1)} actualizada`);
      } else {
        created = await entity.create(payload);
        setItems((prev) => [...prev, created]);
        toast.success(`${entityLabel[0].toUpperCase()}${entityLabel.slice(1)} agregada`);
        if (afterCreate) await afterCreate(created, form);
      }
      closeModal();
    } catch (e) {
      toast.error("No se pudo guardar: " + e.message);
    }
    setSaving(false);
    return created;
  };

  const handleDelete = async (item) => {
    const ok = await confirm({
      title: `¿Eliminar "${item.name}"?`,
      description: deleteMessage(item),
      confirmLabel: "Eliminar",
    });
    if (!ok) return;
    try {
      await entity.delete(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success(`${entityLabel[0].toUpperCase()}${entityLabel.slice(1)} eliminada`);
    } catch (e) {
      toast.error("No se pudo eliminar: " + e.message);
    }
  };

  const toggleField = async (item, field = "active") => {
    const previous = item[field] !== false;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, [field]: !previous } : i)));
    try {
      await entity.update(item.id, { [field]: !previous });
    } catch (e) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, [field]: previous } : i)));
      toast.error("No se pudo actualizar: " + e.message);
    }
  };

  // Para cuando el admin edita el slug a mano (no el nombre): hay que
  // marcarlo "tocado" para que updateField("name", ...) deje de
  // regenerarlo solo a partir de ahí.
  const updateSlugManually = (value) => {
    setSlugTouched(true);
    updateField("slug", slugify(value));
  };

  return {
    items, setItems, loading, searched, loadData,
    search, setSearch,
    editing, form, saving,
    openNew, openEdit, closeModal, updateField, updateSlugManually, handleSave, handleDelete, toggleField,
    confirmDialogProps: dialogProps,
  };
}
