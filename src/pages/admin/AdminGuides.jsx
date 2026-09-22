import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  BookOpen, Search, Plus, Pencil, Trash2, X, Upload, Loader2, FileText, Star, ArrowUp, ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePaginatedList } from "@/api/usePaginatedList";
import Pagination from "@/components/admin/Pagination";

const MAX_PDF_MB = 20;
const MAX_PDF_BYTES = MAX_PDF_MB * 1024 * 1024;
const MAX_IMAGES = 6;

const EMPTY_FORM = {
  title: "",
  specialty: "",
  description: "",
  price: "",
  images: [],
  file_url: "",
  status: "active",
};

function isPdf(file) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

// Banco de guías digitales (entidad Guide): el catálogo maestro de PDFs que
// el admin sube por especialidad. Cada doctor de esa especialidad puede
// agregarla (y ajustar precio/descripción) a su propio catálogo en
// /panel-medico/productos -> pestaña "Biblioteca". El PDF vive en el bucket
// privado "admin-guides"; los doctores nunca lo leen directo, agregarla les
// copia el archivo a su propio doctor_product.
export default function AdminGuides() {
  const [guides, setGuides] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [pageSize, setPageSize] = useState(30);
  const [editing, setEditing] = useState(null); // null = cerrado, {} = nuevo, objeto = editando
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  const loadData = async () => {
    const [guideList, specList] = await Promise.all([
      base44.entities.Guide.list("-created_date", 2000),
      base44.entities.Specialty.filter({ active: true }),
    ]);
    setGuides(guideList);
    setSpecialties(specList.sort((a, b) => a.name.localeCompare(b.name, "es")));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    let list = guides;
    if (specialtyFilter) list = list.filter((g) => g.specialty === specialtyFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((g) => g.title.toLowerCase().includes(q) || g.specialty.toLowerCase().includes(q));
    }
    return list;
  }, [guides, specialtyFilter, search]);

  const { pageItems: paged, page, setPage, totalPages } = usePaginatedList(filtered, {
    pageSize,
    resetKey: `${specialtyFilter}|${search}|${pageSize}`,
  });

  const openNew = () => { setForm(EMPTY_FORM); setEditing({}); };

  const openEdit = (item) => {
    setForm({
      title: item.title || "",
      specialty: item.specialty || "",
      description: item.description || "",
      price: item.price != null ? String(item.price) : "",
      images: Array.isArray(item.images) ? item.images : [],
      file_url: item.file_url || "",
      status: item.status || "active",
    });
    setEditing(item);
  };

  const closeModal = () => { setEditing(null); setForm(EMPTY_FORM); };

  const uploadPdf = async (file) => {
    if (!isPdf(file)) { toast.error("Solo se permiten archivos PDF."); return; }
    if (file.size > MAX_PDF_BYTES) { toast.error(`El PDF pesa más de ${MAX_PDF_MB} MB.`); return; }
    setUploadingPdf(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file, bucket: "admin-guides" });
      setForm((f) => ({ ...f, file_url: res.file_url }));
      toast.success("PDF cargado");
    } catch (e) {
      toast.error("Error al subir el PDF: " + e.message);
    }
    setUploadingPdf(false);
  };

  const addImage = async (file) => {
    if (form.images.length >= MAX_IMAGES) { toast.error(`Máximo ${MAX_IMAGES} imágenes.`); return; }
    setUploadingImg(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file, bucket: "admin-guides" });
      setForm((f) => ({ ...f, images: [...f.images, res.file_url] }));
    } catch (e) {
      toast.error("Error al subir la imagen: " + e.message);
    }
    setUploadingImg(false);
  };

  const removeImage = (idx) => setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));

  const moveImage = (idx, dir) => {
    setForm((f) => {
      const next = [...f.images];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return f;
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...f, images: next };
    });
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("El título es obligatorio"); return; }
    if (!form.specialty) { toast.error("Elige la especialidad"); return; }
    if (!form.file_url) { toast.error("Sube el PDF de la guía"); return; }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        specialty: form.specialty,
        description: form.description.trim(),
        price: form.price === "" ? null : Number(form.price),
        cover_image: form.images.length ? form.images[0] : null,
        images: form.images,
        file_url: form.file_url,
        status: form.status,
      };
      const isNew = !editing?.id;
      if (isNew) {
        const created = await base44.entities.Guide.create(payload);
        setGuides((prev) => [created, ...prev]);
        toast.success("Guía agregada");
      } else {
        await base44.entities.Guide.update(editing.id, payload);
        setGuides((prev) => prev.map((g) => (g.id === editing.id ? { ...g, ...payload } : g)));
        toast.success("Cambios guardados");
      }
      closeModal();
    } catch (e) {
      toast.error("No se pudo guardar: " + e.message);
    }
    setSaving(false);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.title}"? Los doctores que ya la agregaron a su tienda conservan su propia copia.`)) return;
    try {
      await base44.entities.Guide.delete(item.id);
      setGuides((prev) => prev.filter((g) => g.id !== item.id));
      toast.success("Guía eliminada");
    } catch {
      toast.error("No se pudo eliminar");
    }
  };

  const toggleActive = async (item) => {
    const next = item.status === "active" ? "inactive" : "active";
    setGuides((prev) => prev.map((g) => (g.id === item.id ? { ...g, status: next } : g)));
    try {
      await base44.entities.Guide.update(item.id, { status: next });
    } catch {
      setGuides((prev) => prev.map((g) => (g.id === item.id ? { ...g, status: item.status } : g)));
      toast.error("No se pudo actualizar");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <BookOpen className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-primary" />
          <h1 className="font-heading font-bold text-2xl text-foreground">Banco de guías</h1>
        </div>
        <Button onClick={openNew} className="rounded-xl gap-1.5">
          <Plus className="w-4 h-4" /> Agregar guía
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        PDFs por especialidad que los doctores pueden agregar a su tienda personal. No se cobra todavía — solo administras el catálogo que ellos ven en su panel.
      </p>

      <div className="bg-card border border-border/50 rounded-2xl p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-muted/50 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título o especialidad..."
            className="bg-transparent text-sm outline-none flex-1"
          />
        </div>
        <select
          value={specialtyFilter}
          onChange={(e) => setSpecialtyFilter(e.target.value)}
          className="text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Todas las especialidades</option>
          {specialties.map((s) => <option key={s.id}>{s.name}</option>)}
        </select>
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Guías por página"
        >
          <option value={30}>30 por página</option>
          <option value={50}>50 por página</option>
          <option value={100}>100 por página</option>
        </select>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Sin resultados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border/50">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Título</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Especialidad</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Precio sugerido</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Activa</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {paged.map((g) => (
                  <tr key={g.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        {g.title}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-primary bg-accent px-2 py-0.5 rounded-full whitespace-nowrap">{g.specialty}</span>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {g.price != null ? `$${Number(g.price).toLocaleString("es-MX")} MXN` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Switch checked={g.status === "active"} onCheckedChange={() => toggleActive(g)} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(g)} aria-label="Editar" className="p-1.5 rounded-lg hover:bg-muted">
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button onClick={() => handleDelete(g)} aria-label="Eliminar" className="p-1.5 rounded-lg hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={filtered.length} pageSize={pageSize} />

      {editing !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={closeModal}>
          <div
            className="bg-card rounded-3xl border border-border/50 w-full max-w-2xl my-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <h2 className="font-heading font-bold text-lg text-foreground">
                {editing?.id ? "Editar guía" : "Agregar guía"}
              </h2>
              <button onClick={closeModal} aria-label="Cerrar" className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Título</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Ej. Guía de alimentación para diabetes"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Especialidad</label>
                  <select
                    value={form.specialty}
                    onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
                    className="w-full text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Elige una especialidad</option>
                    {specialties.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Qué incluye, para quién es, qué resuelve..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Precio sugerido (MXN)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="199"
                    className="w-full text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">El doctor puede ajustarlo al agregarla a su tienda.</p>
                </div>
                <div className="flex items-end pb-1.5">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <Switch checked={form.status === "active"} onCheckedChange={(v) => setForm((f) => ({ ...f, status: v ? "active" : "inactive" }))} />
                    Activa (visible para los doctores)
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  Imágenes (máx {MAX_IMAGES}) — la primera es la portada
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border cursor-pointer text-xs font-medium text-muted-foreground hover:bg-accent">
                    {uploadingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Subir imagen
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && addImage(e.target.files[0])} />
                  </label>
                </div>
                {form.images.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {form.images.map((img, idx) => (
                      <div key={idx} className="flex items-center gap-3 rounded-lg border border-border/60 p-2">
                        <img src={img} alt="" className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          {idx === 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Portada
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Imagen {idx + 1}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => moveImage(idx, -1)} disabled={idx === 0} className="p-1 rounded hover:bg-accent disabled:opacity-30" aria-label="Subir">
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => moveImage(idx, 1)} disabled={idx === form.images.length - 1} className="p-1 rounded hover:bg-accent disabled:opacity-30" aria-label="Bajar">
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => removeImage(idx)} className="p-1 rounded bg-destructive text-white" aria-label="Quitar">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Archivo PDF</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border cursor-pointer text-xs font-medium text-muted-foreground hover:bg-accent">
                    {uploadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Subir PDF (máx {MAX_PDF_MB} MB)
                    <input type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPdf(e.target.files[0])} />
                  </label>
                  {form.file_url && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                      <FileText className="w-4 h-4" /> PDF cargado
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-6 border-t border-border/50">
              <Button variant="outline" onClick={closeModal} className="rounded-xl">Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || uploadingPdf || uploadingImg} className="rounded-xl">
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
