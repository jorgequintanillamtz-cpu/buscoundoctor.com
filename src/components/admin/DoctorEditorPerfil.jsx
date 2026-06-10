import { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, X, Plus, Eye, Edit3, Bold, Italic, Link, List, Quote, Image } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { generateSlug } from "@/pages/admin/AdminDoctorEditor";

const ESPECIALIDADES = [
  "Medicina General", "Cardiología", "Pediatría", "Ginecología", "Ortopedia",
  "Dermatología", "Neurología", "Psiquiatría", "Oftalmología", "Otorrinolaringología",
  "Urología", "Gastroenterología", "Endocrinología", "Oncología", "Reumatología",
];

function ToolbarBtn({ onClick, title, children, active }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`px-2 py-1 rounded text-xs font-mono hover:bg-accent transition-colors ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

function MarkdownToolbar({ textareaRef, value, onChange, onInsertImage }) {
  const insert = (before, after = "", placeholder = "") => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const newVal = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(newVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  const insertLine = (prefix) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const newVal = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(newVal);
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
  const contentRef = useRef(null);
  const imageInsertRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingGaleria, setUploadingGaleria] = useState(false);
  const [uploadingInline, setUploadingInline] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [subInput, setSubInput] = useState("");
  const [idiomaInput, setIdiomaInput] = useState("");
  const [showEspecialidadList, setShowEspecialidadList] = useState(false);

  const words = (form.descripcion_profesional || "").trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(words / 200));

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

  const handleInlineImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingInline(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const el = contentRef.current;
      const start = el ? el.selectionStart : (form.descripcion_profesional || "").length;
      const end = el ? el.selectionEnd : start;
      const md = `![${file.name.split(".")[0]}](${file_url})\n`;
      const content = form.descripcion_profesional || "";
      update("descripcion_profesional", content.slice(0, start) + md + content.slice(end));
      toast.success("Imagen insertada");
    } catch { toast.error("Error al subir imagen"); }
    setUploadingInline(false);
  };

  const addTag = (field, input, setInput, current) => {
    const val = input.trim();
    if (val && !current.includes(val)) update(field, [...current, val]);
    setInput("");
  };

  const removeTag = (field, idx, current) => update(field, current.filter((_, i) => i !== idx));

  return (
    <div className="space-y-5">

      {/* Sección 1 – Identidad */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
        {/* Nombre */}
        <div>
          <Input
            value={form.nombre_completo}
            onChange={e => update("nombre_completo", e.target.value)}
            className="rounded-xl h-12 text-lg font-heading font-semibold border-0 bg-transparent px-0 focus-visible:ring-0 placeholder:text-muted-foreground/50"
            placeholder="Nombre completo del doctor"
          />
          {form.nombre_completo && form.nombre_completo.length < 10 && (
            <p className="text-xs text-amber-600 mt-1">Mínimo 10 caracteres</p>
          )}
        </div>

        {/* Slug */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground border border-border/40 rounded-xl px-3 py-2 bg-muted/30">
          <span className="flex-shrink-0">/doctores/</span>
          <input
            value={form.slug}
            onChange={e => update("slug", e.target.value.replace(/[^a-z0-9-]/g, ""))}
            className="flex-1 bg-transparent outline-none text-foreground min-w-0"
            placeholder="slug-auto-generado"
          />
        </div>

        {/* Foto de perfil + Especialidad + Cédula */}
        <div className="flex gap-5 items-start flex-wrap">
          {/* Foto circular */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <div
              className="relative w-24 h-24 cursor-pointer group"
              onClick={() => fotoRef.current?.click()}
            >
              {form.foto_perfil ? (
                <>
                  <img src={form.foto_perfil} alt="Foto" className="w-24 h-24 rounded-full object-cover border-4 border-primary/20 group-hover:opacity-80 transition-opacity" />
                  <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); update("foto_perfil", ""); }}
                    className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5 z-10"
                  >
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
            {/* Especialidad */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Especialidad principal *</label>
              <div className="relative">
                <Input
                  value={form.especialidad}
                  onChange={e => update("especialidad", e.target.value)}
                  onFocus={() => setShowEspecialidadList(true)}
                  onBlur={() => setTimeout(() => setShowEspecialidadList(false), 150)}
                  className="rounded-xl"
                  placeholder="Ej: Cardiología"
                />
                {showEspecialidadList && (
                  <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {ESPECIALIDADES.filter(e => e.toLowerCase().includes(form.especialidad.toLowerCase())).map(e => (
                      <button key={e} type="button" onMouseDown={() => update("especialidad", e)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors">{e}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cédula */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Cédula profesional *</label>
              <Input
                value={form.cedula_profesional}
                onChange={e => update("cedula_profesional", e.target.value.replace(/\D/g, ""))}
                className="rounded-xl font-mono"
                placeholder="1234567"
                maxLength={8}
              />
              {form.cedula_profesional && !/^\d{7,8}$/.test(form.cedula_profesional) && (
                <p className="text-xs text-amber-600 mt-1">Debe tener 7-8 dígitos numéricos</p>
              )}
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
              <MarkdownToolbar
                textareaRef={contentRef}
                value={form.descripcion_profesional || ""}
                onChange={v => update("descripcion_profesional", v)}
                onInsertImage={() => imageInsertRef.current?.click()}
              />
            </div>
            <div className="px-5">
              <textarea
                ref={contentRef}
                value={form.descripcion_profesional || ""}
                onChange={e => update("descripcion_profesional", e.target.value)}
                placeholder="Escribe la descripción profesional del doctor aquí..."
                className="w-full min-h-[380px] p-4 font-mono text-sm bg-white border border-border/50 rounded-b-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>
            <input ref={imageInsertRef} type="file" accept="image/*" className="hidden" onChange={handleInlineImageUpload} />
          </>
        ) : (
          <div className="px-5 pb-4">
            <div className="w-full min-h-[380px] p-4 bg-white border border-border/50 rounded-xl prose prose-slate max-w-none prose-headings:font-heading prose-img:rounded-xl prose-blockquote:border-l-4 prose-blockquote:border-primary">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.descripcion_profesional || "*Sin contenido aún*"}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Word count */}
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
        <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">Información de contacto</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium mb-1.5 block">Hospital o consultorio</label>
            <Input value={form.hospital_o_consultorio} onChange={e => update("hospital_o_consultorio", e.target.value)} className="rounded-xl" placeholder="Hospital Christus Muguerza" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium mb-1.5 block">Dirección</label>
            <Input value={form.direccion} onChange={e => update("direccion", e.target.value)} className="rounded-xl" placeholder="Av. Gonzalitos 100, Col. Mitras Centro" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Ciudad</label>
            <Input value={form.ciudad} onChange={e => update("ciudad", e.target.value)} className="rounded-xl" placeholder="Monterrey" />
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
          <div className="sm:col-span-2">
            <label className="text-sm font-medium mb-1.5 block">Sitio web</label>
            <Input value={form.sitio_web} onChange={e => update("sitio_web", e.target.value)} className="rounded-xl" placeholder="https://drjuangarcia.com" />
          </div>
        </div>
      </div>

      {/* Sección 4 – Galería */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-3">
        <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">Galería del consultorio</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {(form.galeria_fotos || []).map((url, idx) => (
            <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-muted">
              <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => update("galeria_fotos", form.galeria_fotos.filter((_, i) => i !== idx))}
                className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => galeriaRef.current?.click()}
            disabled={uploadingGaleria}
            className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-accent/20 transition-colors flex flex-col items-center justify-center gap-1"
          >
            <Upload className="w-4 h-4 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">{uploadingGaleria ? "Subiendo…" : "Agregar"}</span>
          </button>
        </div>
        <input ref={galeriaRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGaleriaUpload} />
      </div>

      {/* Sección 5 – Extracto */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-2">
        <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">Extracto / Resumen</h2>
        <textarea
          value={form.extracto || ""}
          onChange={e => update("extracto", e.target.value)}
          placeholder="Breve descripción que aparece en las tarjetas del directorio (2-3 líneas)"
          className="w-full min-h-[90px] p-4 text-sm bg-white border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          maxLength={300}
        />
        <p className="text-xs text-muted-foreground text-right">{(form.extracto || "").length}/300</p>
      </div>
    </div>
  );
}