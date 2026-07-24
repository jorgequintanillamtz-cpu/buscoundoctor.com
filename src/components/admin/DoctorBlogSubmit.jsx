import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Loader2, Send, Clock, CheckCircle2, XCircle, Image as ImageIcon, Bold, Heading2, List, CheckCircle, Circle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STATUS_INFO = {
  pending_review: { label: "En revisión", color: "text-amber-600 bg-amber-50", icon: Clock },
  approved: { label: "Aprobado y publicado", color: "text-emerald-600 bg-emerald-50", icon: CheckCircle2 },
  rejected: { label: "No aprobado", color: "text-red-600 bg-red-50", icon: XCircle },
};

function slugify(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function ToolBtn({ onClick, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center gap-1"
    >
      {children}
    </button>
  );
}

function ChecklistItem({ ok, label }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {ok ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" /> : <Circle className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />}
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

export default function DoctorBlogSubmit({ specialistId, specialistName, specialty }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [keyword, setKeyword] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const contentRef = useRef(null);

  const load = useCallback(async () => {
    if (!specialistId) { setLoading(false); return; }
    setLoading(true);
    try {
      const list = await base44.entities.BlogPost.filter({ submitted_by_specialist_id: specialistId });
      setDrafts(list.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch {
      toast.error("Error al cargar tus artículos");
    }
    setLoading(false);
  }, [specialistId]);

  useEffect(() => { load(); }, [load]);

  const insertAtCursor = (before, after = "") => {
    const el = contentRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end);
    const newText = content.slice(0, start) + before + selected + after + content.slice(end);
    setContent(newText);
    // Recoloca el cursor después de insertar
    setTimeout(() => {
      el.focus();
      const pos = start + before.length + selected.length + after.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
    } catch {
      toast.error("Error al subir la imagen");
    }
    setUploadingImage(false);
    e.target.value = "";
  };

  const wordCount = useMemo(() => content.trim().split(/\s+/).filter(Boolean).length, [content]);

  const checklist = useMemo(() => {
    const titleOk = title.trim().length >= 10;
    const contentOk = wordCount >= 300;
    const imageOk = !!imageUrl;
    const keywordOk = keyword.trim().length > 0;
    const keywordInTitle = keywordOk && title.toLowerCase().includes(keyword.trim().toLowerCase());
    return [
      { ok: titleOk, label: "El título tiene al menos 10 caracteres" },
      { ok: keywordOk, label: "Escribiste sobre qué tema es el artículo" },
      { ok: keywordInTitle, label: "El tema aparece también en el título" },
      { ok: contentOk, label: `El artículo tiene al menos 300 palabras (llevas ${wordCount})` },
      { ok: imageOk, label: "Tiene una imagen destacada" },
    ];
  }, [title, content, imageUrl, keyword, wordCount]);

  const submit = async () => {
    if (!title.trim()) { toast.error("Escribe un título"); return; }
    if (content.trim().length < 200) { toast.error("El contenido debe tener al menos 200 caracteres"); return; }
    setSaving(true);
    try {
      // Busca el ID de la especialidad del médico, para vincular el artículo autom\u00e1ticamente
      let specialtyId = null;
      if (specialty) {
        const matches = await base44.entities.Specialty.filter({ name: specialty }).catch(() => []);
        if (matches.length > 0) specialtyId = matches[0].id;
      }
      const excerpt = content.trim().replace(/[#*_]/g, "").slice(0, 160);
      await base44.entities.BlogPost.create({
        title: title.trim(),
        slug: slugify(title) + "-" + Date.now().toString().slice(-5),
        content: content.trim(),
        excerpt,
        image: imageUrl || "",
        image_alt: imageUrl ? title.trim() : "",
        meta_title: title.trim().slice(0, 60),
        meta_description: excerpt,
        primary_keyword: keyword.trim(),
        category: specialty || "",
        specialty_id: specialtyId,
        author: specialistName || "",
        author_title: specialty || "",
        published: false,
        review_status: "pending_review",
        submitted_by_specialist_id: specialistId,
      });
      setTitle("");
      setKeyword("");
      setContent("");
      setImageUrl("");
      toast.success("Artículo enviado para revisión");
      await load();
    } catch (e) {
      toast.error("Error al enviar: " + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
        <div>
          <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Escribir artículo de blog
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Escribe con tus palabras — nosotros nos encargamos de la parte técnica (SEO). Se envía a revisión antes de publicarse.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block">Título del artículo</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Ej: 5 señales de que debes visitar a un ${specialty || "especialista"}`} className="rounded-xl text-sm" />
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">¿Sobre qué tema es? (una frase corta, como la buscaría un paciente en Google)</label>
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={`Ej: dolor de espalda en Monterrey`} className="rounded-xl text-sm" />
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Imagen destacada</label>
            <label className="flex items-center gap-3 border border-dashed border-border rounded-xl p-3 cursor-pointer hover:bg-accent/30 transition-colors">
              {imageUrl ? (
                <img src={imageUrl} alt="Imagen destacada" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                  {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <ImageIcon className="w-5 h-5 text-muted-foreground" />}
                </div>
              )}
              <span className="text-sm text-muted-foreground">{imageUrl ? "Cambiar imagen" : "Subir una foto para tu artículo"}</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
            </label>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Contenido</label>
            <div className="border border-input rounded-xl overflow-hidden">
              <div className="flex items-center gap-0.5 px-2 py-1.5 bg-muted/40 border-b border-border/50">
                <ToolBtn onClick={() => insertAtCursor("**", "**")} title="Negrita"><Bold className="w-3.5 h-3.5" /> Negrita</ToolBtn>
                <ToolBtn onClick={() => insertAtCursor("\n\n## ", "")} title="Subtítulo"><Heading2 className="w-3.5 h-3.5" /> Subtítulo</ToolBtn>
                <ToolBtn onClick={() => insertAtCursor("\n- ", "")} title="Lista"><List className="w-3.5 h-3.5" /> Lista</ToolBtn>
              </div>
              <textarea
                ref={contentRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full min-h-[220px] px-3 py-2.5 text-sm focus:outline-none resize-none"
                placeholder={`Escribe tu artículo aquí, como si le explicaras algo a un paciente sobre ${specialty || "tu especialidad"}. Usa los botones de arriba para resaltar texto importante o agregar subtítulos.`}
              />
            </div>
          </div>

          {/* Checklist simple y amigable */}
          <div className="bg-accent/20 rounded-xl p-3 space-y-1.5">
            {checklist.map((item, i) => <ChecklistItem key={i} ok={item.ok} label={item.label} />)}
          </div>

          <div className="flex justify-end">
            <Button onClick={submit} disabled={saving} className="rounded-xl gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar para revisión
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : drafts.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tus artículos enviados</p>
          {drafts.map((d) => {
            const st = STATUS_INFO[d.review_status] || STATUS_INFO.pending_review;
            return (
              <div key={d.id} className="flex items-center justify-between gap-3 border border-border/50 rounded-xl p-3">
                <p className="text-sm font-medium truncate">{d.title}</p>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 flex-shrink-0 ${st.color}`}>
                  <st.icon className="w-3 h-3" /> {st.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
