import { useRef, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, X, Eye, Edit3, Bold, Italic, Link, List, Quote, Image, Video } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function ToolbarBtn({ onClick, title, children, active }) {
  return (
    <button type="button" title={title} onClick={onClick}
      className={`px-2 py-1 rounded text-xs font-mono hover:bg-accent transition-colors ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}>
      {children}
    </button>
  );
}

function MarkdownToolbar({ textareaRef, value, onChange, onInsertImage }) {
  const insert = (before, after = "", placeholder = "") => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    onChange(value.slice(0, start) + before + selected + after + value.slice(end));
    setTimeout(() => { el.focus(); el.setSelectionRange(start + before.length, start + before.length + selected.length); }, 0);
  };
  const insertLine = (prefix) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    onChange(value.slice(0, lineStart) + prefix + value.slice(lineStart));
    setTimeout(() => { el.focus(); el.setSelectionRange(start + prefix.length, start + prefix.length); }, 0);
  };
  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-muted/50 border border-border/50 rounded-t-xl border-b-0">
      <ToolbarBtn onClick={() => insertLine("# ")} title="Título H1">H1</ToolbarBtn>
      <ToolbarBtn onClick={() => insertLine("## ")} title="Título H2">H2</ToolbarBtn>
      <ToolbarBtn onClick={() => insertLine("### ")} title="Título H3">H3</ToolbarBtn>
      <span className="w-px h-4 bg-border mx-1" />
      <ToolbarBtn onClick={() => insert("**", "**", "negrita")} title="Negrita"><Bold className="w-3 h-3" /></ToolbarBtn>
      <ToolbarBtn onClick={() => insert("*", "*", "cursiva")} title="Cursiva"><Italic className="w-3 h-3" /></ToolbarBtn>
      <span className="w-px h-4 bg-border mx-1" />
      <ToolbarBtn onClick={() => insertLine("> ")} title="Cita"><Quote className="w-3 h-3" /></ToolbarBtn>
      <ToolbarBtn onClick={() => insertLine("- ")} title="Lista"><List className="w-3 h-3" /></ToolbarBtn>
      <span className="w-px h-4 bg-border mx-1" />
      <ToolbarBtn onClick={() => insert("[", "](url)", "texto del enlace")} title="Enlace"><Link className="w-3 h-3" /></ToolbarBtn>
      <ToolbarBtn onClick={onInsertImage} title="Insertar imagen"><Image className="w-3 h-3" /></ToolbarBtn>
    </div>
  );
}

export default function DoctorEditorPerfil({ form, update }) {
  const fotoRef = useRef(null);
  const galeriaRef = useRef(null);
  const videoRef = useRef(null);
  const contentRef = useRef(null);
  const imageInsertRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingGaleria, setUploadingGaleria] = useState(false);

  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showEspecialidadList, setShowEspecialidadList] = useState(false);
  const [especialidades, setEspecialidades] = useState([]);
  const [zones, setZones] = useState([]);

  useEffect(() => {
    base44.entities.Specialty.filter({ active: true }).then((list) => {
      setEspecialidades(list.map((s) => s.name).sort((a, b) => a.localeCompare(b, "es")));
    }).catch(() => {});
    // La zona debe salir del mismo catálogo que usan las páginas
    // /especialidad/:slug/:zona (antes era texto libre y el valor nunca
    // hacía match con el nombre real de la Zona, así que esos filtros
    // nunca encontraban al doctor aunque sí estuviera en esa zona).
    base44.entities.Zone.filter({ active: true }).then(setZones).catch(() => {});
  }, []);

  const words = (form.description || "").trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(words / 200));

  const handleFotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      update("profile_photo", file_url);
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
      update("gallery", [...(form.gallery || []), ...urls]);
      toast.success(`${urls.length} foto(s) agregada(s)`);
    } catch { toast.error("Error al subir galería"); }
    setUploadingGaleria(false);
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingVideo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      update("video_url", file_url);
      toast.success("Video cargado");
    } catch { toast.error("Error al subir video"); }
    setUploadingVideo(false);
  };

  const handleInlineImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const el = contentRef.current;
      const start = el ? el.selectionStart : (form.description || "").length;
      const end = el ? el.selectionEnd : start;
      const md = `![${file.name.split(".")[0]}](${file_url})\n`;
      const content = form.description || "";
      update("description", content.slice(0, start) + md + content.slice(end));
      toast.success("Imagen insertada");
    } catch { toast.error("Error al subir imagen"); }
  };

  return (
    <div className="space-y-5">

      {/* Sección 1 – Identidad */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
        <div>
          <Input
            value={form.full_name}
            onChange={e => update("full_name", e.target.value)}
            className="rounded-xl h-12 text-lg font-heading font-semibold border-0 bg-transparent px-0 focus-visible:ring-0 placeholder:text-muted-foreground/50"
            placeholder="Nombre completo del doctor"
          />
          {form.full_name && form.full_name.length < 10 && (
            <p className="text-xs text-amber-600 mt-1">Mínimo 10 caracteres</p>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground border border-border/40 rounded-xl px-3 py-2 bg-muted/30">
          <span className="flex-shrink-0">/especialista/</span>
          <input
            value={form.slug}
            onChange={e => update("slug", e.target.value.replace(/[^a-z0-9-]/g, ""))}
            className="flex-1 bg-transparent outline-none text-foreground min-w-0"
            placeholder="slug-auto-generado"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Cédula profesional *</label>
          <Input
            value={form.professional_license_number}
            onChange={e => update("professional_license_number", e.target.value.trim())}
            className="rounded-xl font-mono"
            placeholder="1234567"
            maxLength={10}
          />
        </div>

        <div className="flex gap-5 items-start flex-wrap">
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <div className="relative w-24 h-24 cursor-pointer group" onClick={() => fotoRef.current?.click()}>
              {form.profile_photo ? (
                <>
                  <img src={form.profile_photo} alt="Foto" className="w-24 h-24 rounded-full object-cover border-4 border-primary/20 group-hover:opacity-80 transition-opacity" />
                  <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <button type="button" onClick={e => { e.stopPropagation(); update("profile_photo", ""); }}
                    className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5 z-10">
                    <X className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <div className="w-24 h-24 rounded-full bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center group-hover:border-primary transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground mt-1">Foto</span>
                </div>
              )}
            </div>
            <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} />
            {uploading && <span className="text-xs text-muted-foreground">Subiendo...</span>}
            <span className="text-[10px] text-muted-foreground text-center">400×400px<br />recomendado</span>
          </div>

          <div className="flex-1 space-y-3 min-w-0">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Especialidad principal *</label>
              <div className="relative">
                <Input
                  value={form.specialty}
                  onChange={e => update("specialty", e.target.value)}
                  onFocus={() => setShowEspecialidadList(true)}
                  onBlur={() => setTimeout(() => setShowEspecialidadList(false), 150)}
                  className="rounded-xl"
                  placeholder="Ej: Cardiología"
                />
                {showEspecialidadList && (
                  <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {especialidades.filter(e => e.toLowerCase().includes((form.specialty || "").toLowerCase())).map(e => (
                      <button key={e} type="button" onMouseDown={() => update("specialty", e)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors">{e}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Subespecialidad</label>
              <Input
                value={form.subspecialty}
                onChange={e => update("subspecialty", e.target.value)}
                className="rounded-xl"
                placeholder="Ej: Ortodoncia"
              />
            </div>

          </div>
        </div>
      </div>

      {/* Sección 2 – Editor de descripción */}
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">Descripción profesional</h2>
          <div className="flex gap-1">
            <button type="button" onClick={() => setShowPreview(false)}
              className={`text-xs px-3 py-1 rounded-lg flex items-center gap-1 transition-colors ${!showPreview ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              <Edit3 className="w-3 h-3" /> Editar
            </button>
            <button type="button" onClick={() => setShowPreview(true)}
              className={`text-xs px-3 py-1 rounded-lg flex items-center gap-1 transition-colors ${showPreview ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              <Eye className="w-3 h-3" /> Vista previa
            </button>
          </div>
        </div>

        {!showPreview ? (
          <>
            <div className="px-5">
              <MarkdownToolbar textareaRef={contentRef} value={form.description || ""}
                onChange={v => update("description", v)} onInsertImage={() => imageInsertRef.current?.click()} />
            </div>
            <div className="px-5">
              <textarea
                ref={contentRef}
                value={form.description || ""}
                onChange={e => update("description", e.target.value)}
                placeholder="Escribe la descripción profesional del doctor aquí..."
                className="w-full min-h-[380px] p-4 font-mono text-sm bg-white border border-border/50 rounded-b-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>
            <input ref={imageInsertRef} type="file" accept="image/*" className="hidden" onChange={handleInlineImageUpload} />
          </>
        ) : (
          <div className="px-5 pb-4">
            <div className="w-full min-h-[380px] p-4 bg-white border border-border/50 rounded-xl prose prose-slate max-w-none prose-headings:font-heading prose-img:rounded-xl prose-blockquote:border-l-4 prose-blockquote:border-primary">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.description || "*Sin contenido aún*"}</ReactMarkdown>
            </div>
          </div>
        )}

        <div className="px-5 py-2.5 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>{words} palabras</span>
            <span>·</span>
            <span>{readTime} min de lectura</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${words >= 300 ? "bg-green-100 text-green-700" : words >= 150 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
            {words >= 300 ? "Descripción ideal" : words >= 150 ? "Mínimo OK" : `Faltan ${150 - words} palabras`}
          </span>
        </div>
      </div>

      {/* Sección 3 – Contacto */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
        <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">Información de contacto y ubicación</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium mb-1.5 block">Dirección</label>
            <Input value={form.address} onChange={e => update("address", e.target.value)} className="rounded-xl" placeholder="Av. Gonzalitos 100, Col. Mitras Centro" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Ciudad</label>
            <Input value={form.city} onChange={e => update("city", e.target.value)} className="rounded-xl" placeholder="Monterrey" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Zona</label>
            <Select value={form.zone} onValueChange={v => update("zone", v)}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {zones.map(z => <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">WhatsApp *</label>
            <Input value={form.whatsapp} onChange={e => update("whatsapp", e.target.value)} className="rounded-xl" placeholder="528112345678" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Email</label>
            <Input type="email" value={form.email} onChange={e => update("email", e.target.value)} className="rounded-xl" placeholder="doctor@ejemplo.com" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Instagram</label>
            <Input value={form.instagram} onChange={e => update("instagram", e.target.value)} className="rounded-xl" placeholder="@usuario" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Horarios</label>
            <Input value={form.schedule} onChange={e => update("schedule", e.target.value)} className="rounded-xl" placeholder="Lunes a Viernes: 9:00 - 18:00" />
          </div>
        </div>
      </div>

      {/* Sección 4 – Galería + Video */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-3">
        <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">Galería y video</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {(form.gallery || []).map((url, idx) => (
            <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-muted">
              <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
              <button type="button" onClick={() => update("gallery", form.gallery.filter((_, i) => i !== idx))}
                className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => galeriaRef.current?.click()} disabled={uploadingGaleria}
            className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-accent/20 transition-colors flex flex-col items-center justify-center gap-1">
            <Upload className="w-4 h-4 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">{uploadingGaleria ? "Subiendo…" : "Agregar"}</span>
          </button>
        </div>
        <input ref={galeriaRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGaleriaUpload} />

        <div className="pt-2 border-t border-border/40">
          <label className="text-sm font-medium mb-2 block">Video de presentación</label>
          {form.video_url ? (
            <div className="space-y-2">
              <video src={form.video_url} controls className="w-full rounded-xl max-h-48" />
              <button type="button" onClick={() => update("video_url", "")} className="text-xs text-destructive hover:underline">Eliminar video</button>
            </div>
          ) : (
            <button type="button" onClick={() => videoRef.current?.click()} disabled={uploadingVideo}
              className="w-full border-2 border-dashed border-border hover:border-primary rounded-xl p-6 flex flex-col items-center gap-2 transition-colors">
              <Video className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{uploadingVideo ? "Subiendo video..." : "Subir video (máx. 20 seg)"}</span>
            </button>
          )}
          <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
        </div>
      </div>
    </div>
  );
}