import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Trash2, Loader2, Image as ImageIcon, Send, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function PostsManager({ specialistId }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    if (!specialistId) { setLoading(false); return; }
    setLoading(true);
    try {
      const list = await base44.entities.SpecialistPost.filter({ specialist_id: specialistId });
      setPosts(list.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch {
      toast.error("Error al cargar publicaciones");
    }
    setLoading(false);
  }, [specialistId]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
    } catch {
      toast.error("Error al subir la foto");
    }
    setUploading(false);
    e.target.value = "";
  };

  const publish = async () => {
    if (!imageUrl) { toast.error("Sube una foto primero"); return; }
    if (!caption.trim()) { toast.error("Escribe una descripción de qué pasó"); return; }
    setSaving(true);
    try {
      await base44.entities.SpecialistPost.create({ specialist_id: specialistId, image_url: imageUrl, caption: caption.trim() });
      setImageUrl("");
      setCaption("");
      toast.success("Publicación creada");
      await load();
    } catch (e) {
      toast.error("Error al publicar: " + e.message);
    }
    setSaving(false);
  };

  const remove = async (id) => {
    setSaving(true);
    try {
      await base44.entities.SpecialistPost.delete(id);
      toast.success("Publicación eliminada");
      setConfirmId(null);
      await load();
    } catch (e) {
      toast.error("Error al eliminar: " + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
      <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">Publicaciones</h2>

      <div className="border border-border/50 rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <label className="w-20 h-20 rounded-xl border border-dashed border-border overflow-hidden cursor-pointer hover:bg-accent/30 transition-colors flex-shrink-0 relative">
            {imageUrl ? (
              <img src={imageUrl} alt="Nueva publicación" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                <span className="text-[10px]">Foto</span>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
          <textarea
            value={caption}
            onChange={(e) => { if (e.target.value.length <= 1000) setCaption(e.target.value); }}
            className="flex-1 min-h-[80px] px-3 py-2 text-sm border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            placeholder="Cuéntale a tus pacientes qué pasó (ej. un evento, una campaña de salud, un logro)..."
          />
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={publish} disabled={saving || !imageUrl || !caption.trim()} className="rounded-xl gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Publicar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Stethoscope className="w-6 h-6 text-primary animate-bounce" strokeWidth={1.75} />
        </div>
      ) : posts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Aún no tienes publicaciones.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {posts.map((p) => (
            <div key={p.id} className="border border-border/60 rounded-xl overflow-hidden">
              <img src={p.image_url} alt={p.caption} className="w-full h-36 object-cover" />
              <div className="p-3 space-y-2">
                <p className="text-xs text-foreground leading-relaxed line-clamp-3">{p.caption}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{new Date(p.created_date).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}</span>
                  {confirmId === p.id ? (
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="destructive" onClick={() => remove(p.id)} className="h-6 text-[11px] px-2">Eliminar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)} className="h-6 text-[11px] px-2">No</Button>
                    </div>
                  ) : (
                    <Button size="icon" variant="ghost" onClick={() => setConfirmId(p.id)} className="h-6 w-6 text-destructive"><Trash2 className="w-3 h-3" /></Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
