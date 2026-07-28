import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Upload, X, ImagePlus, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const emptyForm = {
  full_name: "", slug: "", specialty: "", subspecialty: "", description: "",
  years_experience: "", location: "", city: "Monterrey", zone: "", address: "",
  whatsapp: "", email: "", instagram: "", modality: "presencial", schedule: "", services: [],
  certifications: "", featured: false, active: true, price_range: "$$",
  profile_photo: "", gallery: [], video_url: "",
};

export default function AdminSpecialists() {
  const [specialists, setSpecialists] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [servicesInput, setServicesInput] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const photoInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    update("profile_photo", file_url);
    setUploadingPhoto(false);
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingGallery(true);
    const urls = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url)));
    update("gallery", [...(form.gallery || []), ...urls]);
    setUploadingGallery(false);
  };

  const removeGalleryImage = (idx) => {
    update("gallery", (form.gallery || []).filter((_, i) => i !== idx));
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingVideo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    update("video_url", file_url);
    setUploadingVideo(false);
  };

  const load = async () => {
    const [specs, specList, zoneList] = await Promise.all([
      base44.entities.Specialist.list("-created_date"),
      base44.entities.Specialty.filter({ active: true }),
      base44.entities.Zone.filter({ active: true }),
    ]);
    setSpecialists(specs);
    setSpecialties(specList);
    setZones(zoneList);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setServicesInput("");
    setDialogOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      full_name: s.full_name || "", slug: s.slug || "", specialty: s.specialty || "",
      subspecialty: s.subspecialty || "", description: s.description || "",
      years_experience: s.years_experience || "", location: s.location || "",
      city: s.city || "Monterrey", zone: s.zone || "", address: s.address || "",
      whatsapp: s.whatsapp || "", email: s.email || "", instagram: s.instagram || "", modality: s.modality || "presencial",
      schedule: s.schedule || "", services: s.services || [], certifications: s.certifications || "",
      featured: s.featured || false, active: s.active !== false, price_range: s.price_range || "$$",
      profile_photo: s.profile_photo || "", gallery: s.gallery || [], video_url: s.video_url || "",
    });
    setServicesInput((s.services || []).join(", "));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const data = {
      ...form,
      years_experience: form.years_experience ? Number(form.years_experience) : undefined,
      services: servicesInput.split(",").map(s => s.trim()).filter(Boolean),
      slug: form.slug || form.full_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    };

    if (editing) {
      await base44.entities.Specialist.update(editing.id, data);
      toast.success("Especialista actualizado");
    } else {
      await base44.entities.Specialist.create(data);
      toast.success("Especialista creado");
    }
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este especialista?")) return;
    await base44.entities.Specialist.delete(id);
    toast.success("Especialista eliminado");
    load();
  };

  const toggleFeatured = async (id, nombre, current) => {
    const next = !current;
    setSpecialists((prev) => prev.map((s) => (s.id === id ? { ...s, featured: next } : s)));
    try {
      await base44.entities.Specialist.update(id, { featured: next });
      toast.success(next ? `${nombre} ahora aparece en la página principal` : `${nombre} ya no aparece en la página principal`);
    } catch (e) {
      setSpecialists((prev) => prev.map((s) => (s.id === id ? { ...s, featured: current } : s)));
      toast.error("No se pudo actualizar: " + e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="font-heading font-bold text-2xl text-foreground">Especialistas</h1>
        <Button className="gap-2 rounded-xl" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Agregar
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 w-fit">
        <Star className="w-4 h-4 text-amber-500 flex-shrink-0" fill="currentColor" />
        <p className="text-sm text-amber-800">
          <span className="font-semibold">{specialists.filter((s) => s.featured).length}</span> destacado{specialists.filter((s) => s.featured).length !== 1 ? "s" : ""} para la página principal
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Especialidad</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Zona</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">WhatsApp</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Activo</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Página principal</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {specialists.map(s => (
                <tr key={s.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{s.full_name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{s.specialty}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{s.zone}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{s.whatsapp}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${s.active !== false ? 'bg-green-500' : 'bg-red-400'}`} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => toggleFeatured(s.id, s.full_name, !!s.featured)}
                      title={s.featured ? "Quitar de la página principal" : "Mostrar en la página principal"}
                      aria-label={s.featured ? "Quitar de la página principal" : "Mostrar en la página principal"}
                      className={`w-7 h-7 rounded-full inline-flex items-center justify-center border transition-colors ${
                        s.featured
                          ? "bg-amber-100 border-amber-200 text-amber-500 hover:bg-amber-200"
                          : "bg-transparent border-border text-muted-foreground hover:border-amber-300 hover:text-amber-400"
                      }`}
                    >
                      <Star className="w-3.5 h-3.5" fill={s.featured ? "currentColor" : "none"} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(s)} aria-label="Editar especialista" className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button onClick={() => handleDelete(s.id)} aria-label="Eliminar especialista" className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? "Editar" : "Nuevo"} Especialista</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">

            {/* Foto de perfil */}
            <div>
              <label className="text-sm font-medium mb-2 block">Foto de perfil</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {form.profile_photo ? (
                    <img src={form.profile_photo} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  <Button type="button" variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}>
                    <Upload className="w-4 h-4" />
                    {uploadingPhoto ? "Subiendo..." : "Subir foto"}
                  </Button>
                  {form.profile_photo && (
                    <button type="button" onClick={() => update("profile_photo", "")} className="text-xs text-destructive hover:underline text-left">Eliminar foto</button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Nombre completo *</label>
                <Input value={form.full_name} onChange={e => update("full_name", e.target.value)} className="rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Slug</label>
                <Input value={form.slug} onChange={e => update("slug", e.target.value)} placeholder="auto-generado" className="rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Especialidad *</label>
                <Select value={form.specialty} onValueChange={v => update("specialty", v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {specialties.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Subespecialidad</label>
                <Input value={form.subspecialty} onChange={e => update("subspecialty", e.target.value)} className="rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">WhatsApp *</label>
                <Input value={form.whatsapp} onChange={e => update("whatsapp", e.target.value)} placeholder="528112345678" className="rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input value={form.email} onChange={e => update("email", e.target.value)} className="rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Instagram</label>
                <Input value={form.instagram} onChange={e => update("instagram", e.target.value)} placeholder="@usuario" className="rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Años de experiencia</label>
                <Input type="number" value={form.years_experience} onChange={e => update("years_experience", e.target.value)} className="rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Modalidad</label>
                <Select value={form.modality} onValueChange={v => update("modality", v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">En línea</SelectItem>
                    <SelectItem value="ambas">Ambas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Zona</label>
                <Select value={form.zone} onValueChange={v => update("zone", v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {zones.map(z => <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Precio</label>
                <Select value={form.price_range} onValueChange={v => update("price_range", v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="$">$ Económico</SelectItem>
                    <SelectItem value="$$">$$ Moderado</SelectItem>
                    <SelectItem value="$$$">$$$ Alto</SelectItem>
                    <SelectItem value="$$$$">$$$$ Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Dirección</label>
              <Input value={form.address} onChange={e => update("address", e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Descripción</label>
              <Textarea value={form.description} onChange={e => update("description", e.target.value)} className="rounded-xl min-h-[80px]" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Horarios</label>
              <Input value={form.schedule} onChange={e => update("schedule", e.target.value)} placeholder="Lunes a Viernes: 9:00 - 18:00" className="rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Servicios (separados por coma)</label>
              <Input value={servicesInput} onChange={e => setServicesInput(e.target.value)} placeholder="Terapia, Consulta General, etc." className="rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Certificaciones / Cédula</label>
              <Input value={form.certifications} onChange={e => update("certifications", e.target.value)} className="rounded-xl" />
            </div>

            {/* Video de presentación */}
            <div>
              <label className="text-sm font-medium mb-2 block">Video de presentación</label>
              <p className="text-xs text-muted-foreground mb-3">Máximo 20 segundos. El doctor puede saludar y explicar lo que hace.</p>
              {form.video_url ? (
                <div className="space-y-2">
                  <video src={form.video_url} controls className="w-full rounded-xl max-h-48" />
                  <button type="button" onClick={() => update("video_url", "")} className="text-xs text-destructive hover:underline">Eliminar video</button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={uploadingVideo}
                  className="w-full border-2 border-dashed border-border hover:border-primary rounded-xl p-6 flex flex-col items-center gap-2 transition-colors"
                >
                  <Video className="w-6 h-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{uploadingVideo ? "Subiendo video..." : "Subir video (máx. 20 seg)"}</span>
                </button>
              )}
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
            </div>

            {/* Galería */}
            <div>
              <label className="text-sm font-medium mb-2 block">Galería de imágenes</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                {(form.gallery || []).map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-muted group">
                    <img src={img} alt={`Galería ${i+1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      aria-label="Quitar imagen de la galería"
                      onClick={() => removeGalleryImage(i)}
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={uploadingGallery}
                  className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary flex flex-col items-center justify-center gap-1 transition-colors"
                >
                  <ImagePlus className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{uploadingGallery ? "Subiendo..." : "Agregar"}</span>
                </button>
              </div>
              <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={v => update("active", v)} />
                <span className="text-sm">Activo</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.featured} onCheckedChange={v => update("featured", v)} />
                <span className="text-sm">Destacado</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button onClick={handleSave} className="rounded-xl">{editing ? "Guardar" : "Crear"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}