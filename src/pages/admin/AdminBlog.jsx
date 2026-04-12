import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import moment from "moment";

export default function AdminBlog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const data = await base44.entities.BlogPost.list("-created_date");
    setPosts(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const togglePublish = async (post) => {
    await base44.entities.BlogPost.update(post.id, { published: !post.published });
    toast.success(post.published ? "Artículo despublicado" : "Artículo publicado");
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este artículo?")) return;
    await base44.entities.BlogPost.delete(id);
    toast.success("Artículo eliminado");
    load();
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-bold text-2xl text-foreground">Blog</h1>
        <Link to="/admin/blog/nuevo">
          <Button className="gap-2 rounded-xl">
            <Plus className="w-4 h-4" /> Nuevo artículo
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {posts.map(post => (
          <div key={post.id} className="bg-card rounded-2xl border border-border/50 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-semibold text-foreground line-clamp-1">{post.title}</h3>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                {post.category && <span className="bg-accent text-accent-foreground px-2 py-0.5 rounded-full">{post.category}</span>}
                <span>{moment(post.created_date).format("DD MMM YYYY")}</span>
                <span className={`flex items-center gap-1 ${post.published ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {post.published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {post.published ? "Publicado" : "Borrador"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => togglePublish(post)} className="p-2 rounded-lg hover:bg-muted transition-colors" title={post.published ? "Despublicar" : "Publicar"}>
                {post.published ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-primary" />}
              </button>
              <Link to={`/admin/blog/editar/${post.id}`} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </Link>
              <button onClick={() => handleDelete(post.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          </div>
        ))}
        {posts.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">No hay artículos aún.</div>
        )}
      </div>
    </div>
  );
}