import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import ReactQuill from "react-quill";

export default function BlogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [form, setForm] = useState({
    title: "", slug: "", excerpt: "", content: "", category: "", author: "Equipo BuscounDoctor", published: false,
  });
  const [loading, setLoading] = useState(isEditing);

  useEffect(() => {
    if (isEditing) {
      async function load() {
        const posts = await base44.entities.BlogPost.list();
        const post = posts.find(p => p.id === id);
        if (post) {
          setForm({
            title: post.title || "", slug: post.slug || "", excerpt: post.excerpt || "",
            content: post.content || "", category: post.category || "",
            author: post.author || "Equipo BuscounDoctor", published: post.published || false,
          });
        }
        setLoading(false);
      }
      load();
    }
  }, [id, isEditing]);

  const update = (f, v) => setForm(prev => ({ ...prev, [f]: v }));

  const handleSave = async () => {
    const data = {
      ...form,
      slug: form.slug || form.title.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/g, "-").replace(/(^-|-$)/g, ""),
    };

    if (isEditing) {
      await base44.entities.BlogPost.update(id, data);
      toast.success("Artículo actualizado");
    } else {
      await base44.entities.BlogPost.create(data);
      toast.success("Artículo creado");
    }
    navigate("/admin/blog");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate("/admin/blog")} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ChevronLeft className="w-4 h-4" />
        Volver al blog
      </button>

      <h1 className="font-heading font-bold text-2xl text-foreground mb-6">
        {isEditing ? "Editar artículo" : "Nuevo artículo"}
      </h1>

      <div className="space-y-5">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Título *</label>
          <Input value={form.title} onChange={e => update("title", e.target.value)} className="rounded-xl h-11" placeholder="Título del artículo" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Slug</label>
            <Input value={form.slug} onChange={e => update("slug", e.target.value)} className="rounded-xl" placeholder="auto-generado" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Categoría</label>
            <Input value={form.category} onChange={e => update("category", e.target.value)} className="rounded-xl" placeholder="Salud Mental, etc." />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Extracto</label>
          <Input value={form.excerpt} onChange={e => update("excerpt", e.target.value)} className="rounded-xl" placeholder="Resumen breve del artículo" />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Autor</label>
          <Input value={form.author} onChange={e => update("author", e.target.value)} className="rounded-xl" />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Contenido</label>
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <ReactQuill
              value={form.content}
              onChange={v => update("content", v)}
              className="[&_.ql-editor]:min-h-[300px]"
              modules={{
                toolbar: [
                  [{ header: [1, 2, 3, false] }],
                  ["bold", "italic", "underline"],
                  [{ list: "ordered" }, { list: "bullet" }],
                  ["link", "image"],
                  ["clean"],
                ],
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch checked={form.published} onCheckedChange={v => update("published", v)} />
          <span className="text-sm font-medium">Publicar artículo</span>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => navigate("/admin/blog")} className="rounded-xl">Cancelar</Button>
          <Button onClick={handleSave} className="rounded-xl">{isEditing ? "Guardar cambios" : "Crear artículo"}</Button>
        </div>
      </div>
    </div>
  );
}