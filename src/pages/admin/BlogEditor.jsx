import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Save, FileEdit, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import BlogEditorMain from "@/components/admin/BlogEditorMain";
import BlogEditorSidebar from "@/components/admin/BlogEditorSidebar";
import AIGeneratorModal from "@/components/admin/AIGeneratorModal";

export function generateBlogSlug(title) {
  return (title || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export const EMPTY_BLOG_FORM = {
  title: "",
  slug: "",
  content: "",
  excerpt: "",
  image: "",
  image_alt: "",
  meta_title: "",
  meta_description: "",
  primary_keyword: "",
  secondary_keywords: "",
  category: "",
  author: "",
  author_title: "",
  author_bio: "",
  author_photo: "",
  tags: [],
  published: false,
  featured: false,
  indexable: true,
  schema_type: "Article",
  scheduled_at: "",
  featured_specialists: [],
};

export default function BlogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [form, setForm] = useState(EMPTY_BLOG_FORM);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const autoSaveRef = useRef(null);
  const formRef = useRef(form);

  useEffect(() => { formRef.current = form; }, [form]);

  useEffect(() => {
    if (isEditing) {
      base44.entities.BlogPost.list().then(posts => {
        const post = posts.find(p => p.id === id);
        if (post) {
          setForm({
            ...EMPTY_BLOG_FORM,
            title: post.title || "",
            slug: post.slug || "",
            content: post.content || "",
            excerpt: post.excerpt || "",
            image: post.image || "",
            image_alt: post.image_alt || "",
            meta_title: post.meta_title || "",
            meta_description: post.meta_description || "",
            primary_keyword: post.primary_keyword || "",
            secondary_keywords: post.secondary_keywords || "",
            category: post.category || "",
            author: post.author || "",
            author_title: post.author_title || "",
            author_bio: post.author_bio || "",
            author_photo: post.author_photo || "",
            tags: post.tags || [],
            published: post.published || false,
            featured: post.featured || false,
            indexable: post.indexable !== false,
            schema_type: post.schema_type || "Article",
            scheduled_at: post.scheduled_at ? post.scheduled_at.slice(0, 16) : "",
            featured_specialists: post.featured_specialists || [],
          });
        }
        setLoading(false);
      });
    }
  }, [id, isEditing]);

  // Auto-save every 30s (only when editing existing)
  useEffect(() => {
    if (!isEditing) return;
    autoSaveRef.current = setInterval(async () => {
      const f = formRef.current;
      if (!f.title) return;
      try {
        await base44.entities.BlogPost.update(id, buildSaveData(f));
        setLastSaved(new Date());
      } catch {}
    }, 30000);
    return () => clearInterval(autoSaveRef.current);
  }, [id, isEditing]);

  const update = useCallback((field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      // Solo autogeneramos el slug a partir del título mientras el artículo
      // todavía no se ha guardado por primera vez (isEditing === false).
      // Una vez que ya tiene una URL real publicada, el título puede cambiar
      // sin que el slug se mueva solo debajo del artículo.
      if (field === "title" && !prev._slugManual && !isEditing) {
        next.slug = generateBlogSlug(value);
      }
      if (field === "slug") {
        next._slugManual = true;
      }
      return next;
    });
  }, [isEditing]);

  const buildSaveData = (f) => {
    const { _slugManual, ...rest } = f;
    return {
      ...rest,
      slug: f.slug || generateBlogSlug(f.title),
      scheduled_at: f.scheduled_at ? new Date(f.scheduled_at).toISOString() : null,
      published: f.scheduled_at ? false : f.published,
    };
  };

  const handleSaveDraft = async () => {
    if (!form.title) { toast.error("El título es obligatorio"); return; }
    setSaving(true);
    try {
      const data = buildSaveData(formRef.current);
      if (isEditing) {
        await base44.entities.BlogPost.update(id, data);
        toast.success("Borrador guardado");
      } else {
        const created = await base44.entities.BlogPost.create(data);
        toast.success("Artículo guardado");
        navigate(`/admin/blog/editar/${created.id}`, { replace: true });
      }
      setLastSaved(new Date());
    } catch (e) {
      toast.error("Error al guardar: " + e.message);
    }
    setSaving(false);
  };

  const handlePublish = async () => {
    if (!form.title) { toast.error("El título es obligatorio"); return; }
    if (form.image && !form.image_alt) { toast.error("Agrega el Alt Text de la imagen destacada antes de publicar"); return; }

    // Evita canibalización de keywords: revisa si otro artículo publicado
    // ya usa el mismo meta_title, meta_description o primary_keyword.
    try {
      const others = (await base44.entities.BlogPost.filter({ published: true })).filter(p => p.id !== id);
      const dupField = (val, getter) => val && others.find(p => getter(p) && getter(p).trim().toLowerCase() === val.trim().toLowerCase());
      const dupTitle = dupField(form.meta_title, p => p.meta_title);
      const dupDesc = dupField(form.meta_description, p => p.meta_description);
      const dupKw = dupField(form.primary_keyword, p => p.primary_keyword);
      if (dupTitle) { toast.error(`El meta título ya lo usa "${dupTitle.title}". Cámbialo para evitar canibalización de SEO.`); return; }
      if (dupDesc) { toast.error(`La meta descripción ya la usa "${dupDesc.title}". Cámbiala para evitar canibalización de SEO.`); return; }
      if (dupKw) { toast.error(`La keyword principal ya la usa "${dupKw.title}". Elige otra para evitar canibalización de SEO.`); return; }
    } catch {}

    setSaving(true);
    try {
      const data = { ...buildSaveData(formRef.current), published: true };
      if (isEditing) {
        await base44.entities.BlogPost.update(id, data);
        setForm(prev => ({ ...prev, published: true }));
        toast.success("Artículo publicado");
      } else {
        const created = await base44.entities.BlogPost.create(data);
        toast.success("Artículo publicado");
        navigate(`/admin/blog/editar/${created.id}`, { replace: true });
      }
      setLastSaved(new Date());
    } catch (e) {
      toast.error("Error al publicar: " + e.message);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-border/50 px-6 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/admin/blog")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Volver al blog
        </button>
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 mr-1">
              <Clock className="w-3 h-3" />
              Guardado {lastSaved.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-8"
            onClick={() => setShowAIModal(true)}>
            <Sparkles className="w-3.5 h-3.5" />
            Generar con IA
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-8"
            onClick={handleSaveDraft} disabled={saving}>
            {saving
              ? <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              : <FileEdit className="w-3.5 h-3.5" />}
            Guardar borrador
          </Button>
          <Button size="sm" className="rounded-xl gap-1.5 h-8"
            onClick={handlePublish} disabled={saving}>
            {saving
              ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Save className="w-3.5 h-3.5" />}
            {form.published ? "Actualizar artículo" : "Publicar artículo"}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-0 items-start">
        <div className="p-6 max-w-4xl">
          <BlogEditorMain form={form} update={update} onOpenAI={() => setShowAIModal(true)} />
        </div>
        <div className="xl:border-l border-border/50 p-5 xl:sticky xl:top-[57px] xl:max-h-[calc(100vh-57px)] xl:overflow-y-auto">
          <BlogEditorSidebar form={form} update={update} onSaveDraft={handleSaveDraft} onPublish={handlePublish} saving={saving} />
        </div>
      </div>

      {/* AI Modal */}
      {showAIModal && (
        <AIGeneratorModal form={form} update={update} onClose={() => setShowAIModal(false)} />
      )}
    </div>
  );
}