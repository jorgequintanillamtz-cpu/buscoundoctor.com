import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Loader2, Send, Clock, CheckCircle2, XCircle } from "lucide-react";
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

export default function DoctorBlogSubmit({ specialistId, specialistName, specialty }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

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

  const submit = async () => {
    if (!title.trim()) { toast.error("Escribe un título"); return; }
    if (content.trim().length < 200) { toast.error("El contenido debe tener al menos 200 caracteres"); return; }
    setSaving(true);
    try {
      await base44.entities.BlogPost.create({
        title: title.trim(),
        slug: slugify(title) + "-" + Date.now().toString().slice(-5),
        content: content.trim(),
        excerpt: content.trim().slice(0, 160),
        author: specialistName || "",
        published: false,
        review_status: "pending_review",
        submitted_by_specialist_id: specialistId,
      });
      setTitle("");
      setContent("");
      toast.success("Artículo enviado para revisión");
      await load();
    } catch (e) {
      toast.error("Error al enviar: " + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
      <div>
        <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" /> Escribir artículo de blog
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Tu artículo se envía a revisión — no se publica automáticamente. Nuestro equipo lo revisa antes de que aparezca en el sitio.
        </p>
      </div>

      <div className="border border-border/50 rounded-xl p-4 space-y-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título del artículo" className="rounded-xl text-sm" />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full min-h-[180px] px-3 py-2 text-sm border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          placeholder={`Escribe tu artículo aquí. Por ejemplo, algo útil relacionado con ${specialty || "tu especialidad"}...`}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{content.trim().length} caracteres (mínimo 200)</span>
          <Button size="sm" onClick={submit} disabled={saving} className="rounded-xl gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar para revisión
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : drafts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Tus artículos enviados</p>
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
