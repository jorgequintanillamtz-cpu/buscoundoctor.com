import { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, X, GripVertical, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ESPECIALIDADES = [
  "Medicina General", "Cardiología", "Pediatría", "Ginecología", "Ortopedia",
  "Dermatología", "Neurología", "Psiquiatría", "Oftalmología", "Otorrinolaringología",
  "Urología", "Gastroenterología", "Endocrinología", "Oncología", "Reumatología",
];

const MARKDOWN_TIPS = "**negrita** · *cursiva* · # Título · ## Subtítulo · - Lista · > Cita";

export default function DoctorEditorPerfil({ form, update }) {
  const fotoRef = useRef(null);
  const galeriaRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingGaleria, setUploadingGaleria] = useState(false);
  const [subInput, setSubInput] = useState("");
  const [idiomaInput, setIdiomaInput] = useState("");
  const [especialidadCustom, setEspecialidadCustom] = useState(!ESPECIALIDADES.includes(form.especialidad) && !!form.especialidad);

  const handleFotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      update("foto_perfil", file_url);
      toast.success("Foto de perfil cargada");
    } catch { toast.error("Error al subir foto"); }
    setUploading(false);
  };

  const handleGaleriaUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingGaleria(true);
    try {
      const urls = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url)));
      update("galeria_fotos", [...(form.galeria_fotos || []), ...urls]);
      toast.success(`${urls.length} foto(s) agregada(s)`);
    } catch { toast.error("Error al subir galería"); }
    setUploadingGaleria(false);
  };

  const removeGaleriaPhoto = (idx) => {
    update("galeria_fotos", form.galeria_fotos.filter((_, i) => i !== idx));
  };

  const addTag = (field, input, setInput, current) => {
    const val = input.trim();
    if (val && !current.includes(val)) {
      update(field, [...current, val]);
    }
    setInput("");
  };

  const removeTag = (field, idx, current) => {
    update(field, current.filter((_, i) => i !== idx));
  };

  const wordCount = (form.descripcion_profesional || "").trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Foto de perfil */}
      <div className="bg-card rounded-2xl border border-border/50 p-5">
        <h2 className="font-heading font-semibold text-base mb-4">Foto de perfil</h2>
        <div className="flex items-center gap-6">
          <div className="relative flex-shrink-0">
            {form.foto_perfil ? (
              <div className="relative w-24 h-24">
                <img src={form.foto_perfil} alt="Foto" className="w-24 h-24 rounded-full object-cover border-4 border-primary/20" />
                <button
                  onClick={() => update("foto_perfil", "")}
                  className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-4 border-dashed border-border">
                <Upload className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>
          <div>
            <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} />
            <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => fotoRef.current?.click()} disabled={uploading}>
              <Upload className="w-3.5 h-3.5" />
              {uploading ? "Subiendo..." : "Subir foto"}
            </Button>
            <p className="text-xs text-muted-foreground mt-1.5">JPG, PNG. Recomendado: 400×400px</p>
          </div>
        </div>
      </div>

      {/* Datos básicos */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
        <h2 className="font-heading font-semibold text-base">Datos del doctor</h2>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Nombre completo *</label>
          <Input value={form.nombre_completo} onChange={e => update("nombre_completo", e.target.value)} className="rounded-xl" placeholder="Dr. Juan García López" />
          {form.nombre_completo && form.nombre_completo.length < 10 && (
            <p className="text-xs text-amber-600 mt-1">Mínimo 10 caracteres</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Cédula profesional *</label>
            <Input value={form.cedula_profesional} onChange={e => update("cedula_profesional", e.target.value)} className="rounded-xl" placeholder="1234567" maxLength={8} />
            {form.cedula_profesional && !/^\d{7,8}$/.test(form.cedula_profesional) && (
              <p className="text-xs text-amber-600 mt-1">Debe tener 7-8 dígitos numéricos</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Años de experiencia</label>
            <Input type="number" value={form.anos_experiencia} onChange={e => update("anos_experiencia", Number(e.target.value))} className="rounded-xl" placeholder="10" min={0} max={60} />
          </div>
        </div>

        {/* Especialidad */}
        <div>
          <label className="text-sm font-medium mb-1.5 block">Especialidad *</label>
          {!especialidadCustom ? (
            <div className="flex gap-2">
              <select
                value={ESPECIALIDADES.includes(form.especialidad) ? form.especialidad : ""}
                onChange={e => update("especialidad", e.target.value)}
                className="flex-1 h-9 px-3 text-sm bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Selecciona una especialidad</option>
                {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => setEspecialidadCustom(true)}>
                Otra
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input value={form.especialidad} onChange={e => update("especialidad", e.target.value)} className="rounded-xl" placeholder="Escribe la especialidad" />
              <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => setEspecialidadCustom(false)}>
                Lista
              </Button>
            </div>
          )}
        </div>

        {/* Sub-especialidades */}
        <div>
          <label className="text-sm font-medium mb-1.5 block">Sub-especialidades</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.sub_especialidades.map((s, i) => (
              <span key={i} className="text-xs bg-accent text-accent-foreground px-2.5 py-1 rounded-full flex items-center gap-1">
                {s}
                <button onClick={() => removeTag("sub_especialidades", i, form.sub_especialidades)}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={subInput} onChange={e => setSubInput(e.target.value)} className="rounded-xl" placeholder="Ej: Cardiología Intervencionista"
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag("sub_especialidades", subInput, setSubInput, form.sub_especialidades))} />
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => addTag("sub_especialidades", subInput, setSubInput, form.sub_especialidades)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Idiomas */}
        <div>
          <label className="text-sm font-medium mb-1.5 block">Idiomas</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.idiomas.map((lang, i) => (
              <span key={i} className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full flex items-center gap-1">
                {lang}
                <button onClick={() => removeTag("idiomas", i, form.idiomas)}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={idiomaInput} onChange={e => setIdiomaInput(e.target.value)} className="rounded-xl" placeholder="Ej: Inglés"
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag("idiomas", idiomaInput, setIdiomaInput, form.idiomas))} />
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => addTag("idiomas", idiomaInput, setIdiomaInput, form.idiomas)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Descripción profesional */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold text-base">Descripción profesional</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full ${wordCount >= 150 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
            {wordCount} palabras {wordCount < 150 && "(mín. 150 para publicar)"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">{MARKDOWN_TIPS}</p>
        <textarea
          value={form.descripcion_profesional}
          onChange={e => update("descripcion_profesional", e.target.value)}
          placeholder="Describe tu trayectoria profesional, logros, enfoque de atención al paciente..."
          className="w-full min-h-[280px] p-4 font-mono text-sm bg-white border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
        />
      </div>

      {/* Horarios */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-3">
        <h2 className="font-heading font-semibold text-base">Horarios de atención</h2>
        <textarea
          value={form.horarios}
          onChange={e => update("horarios", e.target.value)}
          placeholder={"Lunes a Viernes: 9:00 - 18:00\nSábados: 9:00 - 13:00"}
          className="w-full min-h-[100px] p-4 text-sm bg-white border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
        />
      </div>

      {/* Información de contacto */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
        <h2 className="font-heading font-semibold text-base">Información de contacto</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Hospital / Consultorio</label>
            <Input value={form.hospital_o_consultorio} onChange={e => update("hospital_o_consultorio", e.target.value)} className="rounded-xl" placeholder="Hospital Christus Muguerza" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Ciudad</label>
            <Input value={form.ciudad} onChange={e => update("ciudad", e.target.value)} className="rounded-xl" placeholder="Monterrey" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium mb-1.5 block">Dirección</label>
            <Input value={form.direccion} onChange={e => update("direccion", e.target.value)} className="rounded-xl" placeholder="Av. Gonzalitos 100, Col. Mitras Centro" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Teléfono</label>
            <Input value={form.telefono} onChange={e => update("telefono", e.target.value)} className="rounded-xl" placeholder="+52 81 1234 5678" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">WhatsApp</label>
            <Input value={form.whatsapp} onChange={e => update("whatsapp", e.target.value)} className="rounded-xl" placeholder="+52 81 9876 5432" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Correo de contacto</label>
            <Input type="email" value={form.correo_contacto} onChange={e => update("correo_contacto", e.target.value)} className="rounded-xl" placeholder="doctor@ejemplo.com" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Sitio web</label>
            <Input value={form.sitio_web} onChange={e => update("sitio_web", e.target.value)} className="rounded-xl" placeholder="https://drjuangarcia.com" />
          </div>
        </div>
      </div>

      {/* Galería */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-3">
        <h2 className="font-heading font-semibold text-base">Galería de fotos</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {(form.galeria_fotos || []).map((url, idx) => (
            <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-muted">
              <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => removeGaleriaPhoto(idx)}
                className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
          <button
            onClick={() => galeriaRef.current?.click()}
            disabled={uploadingGaleria}
            className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-accent/30 transition-colors flex flex-col items-center justify-center gap-1"
          >
            <Upload className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{uploadingGaleria ? "Subiendo..." : "Agregar"}</span>
          </button>
        </div>
        <input ref={galeriaRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGaleriaUpload} />
        <p className="text-xs text-muted-foreground">Puedes subir múltiples fotos a la vez. Haz clic en la foto para eliminarla.</p>
      </div>
    </div>
  );
}