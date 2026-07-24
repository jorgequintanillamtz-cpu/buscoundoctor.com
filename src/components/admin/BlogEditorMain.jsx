import { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, X, Eye, Edit3, Bold, Italic, Link, List, ListOrdered, Quote, Image, Minus, AlignLeft } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { generateBlogSlug } from "@/pages/admin/BlogEditor";

function TBtn({ onClick, title, children, active }) {
  return (
    <button type="button" title={title} onClick={onClick}
      className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium transition-colors select-none
        ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
      {children}
    </button>
  );
}

function Toolbar({ textareaRef, value, onChange, onInsertImage, uploadingInline }) {
  const insert = (before, after = "", placeholder = "") => {
    const el = textareaRef.current;
    if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const sel = value.slice(s, e) || placeholder;
    onChange(value.slice(0, s) + before + sel + after + value.slice(e));
    setTimeout(() => { el.focus(); el.setSelectionRange(s + before.length, s + before.length + sel.length); }, 0);
  };
  const insertLine = (prefix) => {
    const el = textareaRef.current;
    if (!el) return;
    const s = el.selectionStart;
    const ls = value.lastIndexOf("\n", s - 1) + 1;
    const already = value.slice(ls).startsWith(prefix);
    const newVal = already
      ? value.slice(0, ls) + value.slice(ls + prefix.length)
      : value.slice(0, ls) + prefix + value.slice(ls);
    onChange(newVal);
    setTimeout(() => { el.focus(); el.setSelectionRange(s + (already ? -prefix.length : prefix.length), s + (already ? -prefix.length : prefix.length)); }, 0);
  };

  const insertBlock = (block) => {
    const el = textareaRef.current;
    if (!el) return;
    const s = el.selectionStart;
    const newVal = value.slice(0, s) + "\n" + block + "\n" + value.slice(s);
    onChange(newVal);
    setTimeout(() => el.focus(), 0);
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 bg-muted/40 border-b border-border/50">
      <TBtn onClick={() => insertLine("## ")} title="H2">H2</TBtn>
      <TBtn onClick={() => insertLine("### ")} title="H3">H3</TBtn>
      <TBtn onClick={() => insertLine("#### ")} title="H4">H4</TBtn>
      <span className="w-px h-4 bg-border/60 mx-1" />
      <TBtn onClick={() => insert("**", "**", "texto")} title="Negrita"><Bold className="w-3.5 h-3.5" /></TBtn>
      <TBtn onClick={() => insert("*", "*", "texto")} title="Cursiva"><Italic className="w-3.5 h-3.5" /></TBtn>
      <TBtn onClick={() => insert("~~", "~~", "texto")} title="Tachado">~~</TBtn>
      <span className="w-px h-4 bg-border/60 mx-1" />
      <TBtn onClick={() => insertLine("> ")} title="Cita"><Quote className="w-3.5 h-3.5" /></TBtn>
      <TBtn onClick={() => insertLine("- ")} title="Lista desordenada"><List className="w-3.5 h-3.5" /></TBtn>
      <TBtn onClick={() => insertLine("1. ")} title="Lista ordenada"><ListOrdered className="w-3.5 h-3.5" /></TBtn>
      <TBtn onClick={() => insertLine("---\n")} title="Separador"><Minus className="w-3.5 h-3.5" /></TBtn>
      <span className="w-px h-4 bg-border/60 mx-1" />
      <TBtn onClick={() => insert("[", "](url)", "texto del enlace")} title="Enlace"><Link className="w-3.5 h-3.5" /></TBtn>
      <TBtn onClick={() => insertBlock("## Tabla de Contenido\n- [Sección 1](#sección-1)\n- [Sección 2](#sección-2)")} title="TOC">TOC</TBtn>
      <TBtn onClick={() => insertBlock("## Preguntas frecuentes\n\n**¿Pregunta 1?**\nRespuesta aquí.\n\n**¿Pregunta 2?**\nRespuesta aquí.")} title="FAQ">FAQ</TBtn>
      <TBtn onClick={() => insertBlock("> 💡 **Dato destacado:** Escribe aquí un dato relevante.")} title="Dato destacado">Dato</TBtn>
      <TBtn onClick={onInsertImage} title="Insertar imagen" active={uploadingInline}>
        <Image className="w-3.5 h-3.5" />
      </TBtn>
    </div>
  );
}

export default function BlogEditorMain({ form, update }) {
  const featuredRef = useRef(null);
  const contentRef = useRef(null);
  const inlineImageRef = useRef(null);
  const [uploadingFeatured, setUploadingFeatured] = useState(false);
  const [uploadingInline, setUploadingInline] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const words = (form.content || "").trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(words / 200));

  const uploadFeatured = async (file) => {
    if (!file || !file.type.startsWith("image/")) { toast.error("Solo imágenes JPG, PNG o WEBP"); return; }
    if (file.size > 2 * 1024 * 1024) {
      toast.warning("La imagen pesa más de 2MB — puede hacer más lenta la carga de la página. Considera comprimirla antes de subirla.");
    }
    setUploadingFeatured(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      update("image", file_url);
      if (!form.image_alt) update("image_alt", form.title || "imagen destacada");
      toast.success("Imagen destacada cargada");
    } catch { toast.error("Error al subir imagen"); }
    setUploadingFeatured(false);
  };

  const handleFeaturedDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    uploadFeatured(e.dataTransfer.files[0]);
  };

  const handleInlineImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.warning("Esta imagen pesa más de 2MB — puede hacer más lenta la carga del artículo. Considera comprimirla.");
    }
    setUploadingInline(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const suggestedAlt = window.prompt("Describe brevemente esta imagen (alt text para SEO y accesibilidad):", file.name.split(".")[0]) || file.name.split(".")[0];
      const el = contentRef.current;
      const s = el ? el.selectionStart : (form.content || "").length;
      const end = el ? el.selectionEnd : s;
      const md = `![${suggestedAlt}](${file_url})\n`;
      const content = form.content || "";
      update("content", content.slice(0, s) + md + content.slice(end));
      toast.success("Imagen insertada");
    } catch { toast.error("Error al subir imagen"); }
    setUploadingInline(false);
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <textarea
          value={form.title}
          onChange={e => {
            if (e.target.value.length <= 120) update("title", e.target.value);
          }}
          placeholder="Escribe el título del artículo aquí..."
          rows={2}
          className="w-full px-5 pt-5 pb-2 text-2xl font-heading font-bold text-foreground placeholder:text-muted-foreground/40 bg-transparent border-0 focus:outline-none resize-none leading-tight"
        />
        <div className="flex items-center justify-between px-5 pb-4">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-1 mr-4 min-w-0">
            <span className="text-muted-foreground/50 shrink-0">/blog/</span>
            <input
              value={form.slug}
              onChange={e => update("slug", e.target.value.replace(/[^a-z0-9-]/g, ""))}
              className="text-sm text-primary bg-transparent border-0 focus:outline-none w-full placeholder:text-muted-foreground/40"
              placeholder="slug-del-articulo"
            />
          </div>
          <span className={`text-xs ${form.title.length > 100 ? "text-amber-600" : "text-muted-foreground"}`}>
            {form.title.length}/120
          </span>
        </div>
      </div>

      {/* Featured Image */}
      <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">Imagen destacada</p>
        {form.image ? (
          <div className="relative rounded-xl overflow-hidden bg-muted aspect-video">
            <img src={form.image} alt={form.image_alt} className="w-full h-full object-cover" />
            <div className="absolute top-2 right-2 flex gap-1.5">
              <button type="button" onClick={() => featuredRef.current?.click()}
                className="bg-white/90 hover:bg-white text-xs px-2 py-1 rounded-lg shadow text-foreground font-medium transition-colors">
                Cambiar
              </button>
              <button type="button" onClick={() => { update("image", ""); update("image_alt", ""); }}
                className="bg-white/90 hover:bg-white text-xs px-2 py-1 rounded-lg shadow text-destructive font-medium transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        ) : (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFeaturedDrop}
            onClick={() => featuredRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors
              ${dragOver ? "border-primary bg-accent/30" : "border-border/50 hover:border-primary/50 hover:bg-muted/30"}`}
          >
            <Upload className="w-6 h-6 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {uploadingFeatured ? "Subiendo..." : "Subir imagen destacada (1200×630px recomendada)"}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">JPG · PNG · WEBP</p>
          </div>
        )}
        {form.image && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Alt Text SEO</label>
            <input value={form.image_alt} onChange={e => update("image_alt", e.target.value)}
              className="w-full h-8 px-3 text-sm border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Descripción de la imagen para SEO" />
          </div>
        )}
        <input ref={featuredRef} type="file" accept="image/*" className="hidden" onChange={e => uploadFeatured(e.target.files[0])} />
      </div>

      {/* Content Editor */}
      <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-3 pb-0">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contenido</span>
          <div className="flex gap-1">
            <button type="button" onClick={() => setShowPreview(false)}
              className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ${!showPreview ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              <Edit3 className="w-3 h-3" /> Editar
            </button>
            <button type="button" onClick={() => setShowPreview(true)}
              className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ${showPreview ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              <Eye className="w-3 h-3" /> Vista previa
            </button>
          </div>
        </div>

        {!showPreview ? (
          <>
            <Toolbar
              textareaRef={contentRef}
              value={form.content || ""}
              onChange={v => update("content", v)}
              onInsertImage={() => inlineImageRef.current?.click()}
              uploadingInline={uploadingInline}
            />
            <textarea
              ref={contentRef}
              value={form.content || ""}
              onChange={e => update("content", e.target.value)}
              placeholder={"Escribe el contenido de tu artículo aquí...\n\n# Título principal (H1 – solo una vez)\n\n## Primera sección (H2)\n\nEscribe párrafos aquí. El texto se renderizará con formato al publicar.\n\n## Segunda sección\n\n- Elemento de lista\n- Otro elemento\n\n> Cita destacada aquí"}
              className="w-full min-h-[480px] px-5 py-4 font-mono text-sm text-foreground bg-white focus:outline-none resize-none leading-relaxed"
            />
            <input ref={inlineImageRef} type="file" accept="image/*" className="hidden" onChange={handleInlineImageUpload} />
          </>
        ) : (
          <div className="px-5 py-4 min-h-[480px] prose prose-slate max-w-none prose-headings:font-heading prose-img:rounded-xl prose-blockquote:border-l-4 prose-blockquote:border-primary prose-a:text-primary">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.content || "*Sin contenido aún*"}</ReactMarkdown>
          </div>
        )}

        <div className="px-5 py-2.5 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
          <span>{words} palabras · {readTime} min lectura</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${words >= 1500 ? "bg-green-100 text-green-700" : words >= 800 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
            {words >= 1500 ? "Ideal" : words >= 800 ? "Aceptable" : "Corto"}
          </span>
        </div>
      </div>

      {/* Excerpt */}
      <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Resumen / extracto</p>
          <span className={`text-xs ${(form.excerpt || "").length > 230 ? "text-amber-600" : "text-muted-foreground"}`}>{(form.excerpt || "").length}/250</span>
        </div>
        <textarea
          value={form.excerpt || ""}
          onChange={e => { if (e.target.value.length <= 250) update("excerpt", e.target.value); }}
          placeholder="Breve descripción que aparece en las tarjetas del blog (2-3 líneas)"
          rows={3}
          className="w-full px-3 py-2.5 text-sm border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
      </div>
    </div>
  );
}