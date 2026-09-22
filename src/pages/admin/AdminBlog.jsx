import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, EyeOff, Clock, Stethoscope, CheckCircle2, XCircle, Loader2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import moment from "moment";
import { logActivity } from "@/api/activityLog";
import { notifyBlogApproved, notifyBlogRejected, findSpecialistById } from "@/api/doctorNotify";
import { usePaginatedList } from "@/api/usePaginatedList";
import Pagination from "@/components/admin/Pagination";
import { useAdminBadges } from "@/components/adminBadges";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

// Tarjeta de un artículo enviado por un doctor y esperando revisión: mismo
// patrón de aprobar/rechazar (con motivo obligatorio) que ya usamos para
// los documentos de verificación, para que la experiencia del admin sea
// consistente en todo el panel.
export function PendingBlogCard({ post, onReviewed }) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const { refresh: refreshBadges } = useAdminBadges();

  const approve = async () => {
    setReviewing(true);
    try {
      await base44.entities.BlogPost.update(post.id, {
        published: true,
        review_status: "approved",
        rejection_reason: "",
      });
      toast.success(`Artículo "${post.title}" aprobado y publicado`);
      logActivity({
        type: "blog_aprobado",
        description: `Se aprobó y publicó el artículo "${post.title}" de ${post.author || "un doctor"}`,
        specialistId: post.submitted_by_specialist_id,
        specialistName: post.author || "",
      });
      findSpecialistById(post.submitted_by_specialist_id).then((specialist) => {
        if (specialist) notifyBlogApproved(specialist, post.title, post.slug);
      });
      onReviewed();
      refreshBadges();
    } catch (e) {
      toast.error("Error: " + e.message);
    }
    setReviewing(false);
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) { toast.error("El motivo de rechazo es obligatorio"); return; }
    setReviewing(true);
    try {
      await base44.entities.BlogPost.update(post.id, {
        published: false,
        review_status: "rejected",
        rejection_reason: rejectReason.trim(),
      });
      toast.success(`Artículo "${post.title}" rechazado`);
      logActivity({
        type: "blog_rechazado",
        description: `Se rechazó el artículo "${post.title}" de ${post.author || "un doctor"}. Motivo: ${rejectReason.trim()}`,
        specialistId: post.submitted_by_specialist_id,
        specialistName: post.author || "",
      });
      findSpecialistById(post.submitted_by_specialist_id).then((specialist) => {
        if (specialist) notifyBlogRejected(specialist, post.title, rejectReason.trim());
      });
      setRejecting(false);
      setRejectReason("");
      onReviewed();
      refreshBadges();
    } catch (e) {
      toast.error("Error: " + e.message);
    }
    setReviewing(false);
  };

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 space-y-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{post.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
          <span className="bg-brand-bluePale text-brand-navy px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
            <UserRound className="w-3 h-3" /> {post.author || "Doctor"}
          </span>
          <span>Enviado el {moment(post.created_date).format("DD MMM YYYY")}</span>
        </p>
      </div>

      {post.excerpt && <p className="text-sm text-muted-foreground">{post.excerpt}</p>}

      {post.image && (
        <img src={post.image} alt="" className="w-full max-h-40 object-cover rounded-xl" />
      )}

      <Link
        to={`/admin/blog/editar/${post.id}`}
        className="text-primary hover:underline text-sm flex items-center gap-1.5 w-fit"
      >
        <Pencil className="w-3.5 h-3.5" /> Ver / editar contenido completo
      </Link>

      <div className="pt-2 border-t border-border/40">
        {rejecting ? (
          <div className="space-y-2">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo de rechazo (obligatorio, el doctor lo verá)"
              className="w-full text-sm border border-input rounded-xl p-2 min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" className="rounded-xl" disabled={reviewing} onClick={confirmReject}>
                {reviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Confirmar rechazo
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { setRejecting(false); setRejectReason(""); }}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="rounded-xl gap-1.5" disabled={reviewing} onClick={approve}>
              {reviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              Aprobar y publicar
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl gap-1.5" disabled={reviewing} onClick={() => setRejecting(true)}>
              <XCircle className="w-3.5 h-3.5 text-red-500" />
              Rechazar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminBlog() {
  const { confirm, dialogProps } = useConfirmDialog();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const data = await base44.entities.BlogPost.list("-created_date");
    setPosts(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pendingPosts = useMemo(
    () => posts.filter((p) => p.submitted_by_specialist_id && p.review_status === "pending_review"),
    [posts]
  );
  // El listado general no repite lo que ya se muestra arriba en la cola de pendientes.
  const otherPosts = useMemo(
    () => posts.filter((p) => !(p.submitted_by_specialist_id && p.review_status === "pending_review")),
    [posts]
  );
  const { pageItems: pagedPosts, page: postsPage, setPage: setPostsPage, totalPages: postsTotalPages } =
    usePaginatedList(otherPosts, { pageSize: 20 });

  const togglePublish = async (post) => {
    const newPublished = !post.published;
    const updates = { published: newPublished };
    if (post.submitted_by_specialist_id) {
      updates.review_status = newPublished ? "approved" : "pending_review";
    }
    await base44.entities.BlogPost.update(post.id, updates);
    toast.success(post.published ? "Artículo despublicado" : "Artículo publicado");
    load();
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: "¿Eliminar este artículo?", confirmLabel: "Eliminar" });
    if (!ok) return;
    await base44.entities.BlogPost.delete(id);
    toast.success("Artículo eliminado");
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
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

      {/* Cola de artículos enviados por doctores, esperando aprobar o rechazar */}
      {pendingPosts.length > 0 && (
        <div className="mb-8">
          <h2 className="font-heading font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
            Pendientes de revisión
            <span className="text-xs bg-amber-500 text-white rounded-full px-2 py-0.5">{pendingPosts.length}</span>
          </h2>
          <div className="space-y-3 max-w-2xl">
            {pendingPosts.map((post) => (
              <PendingBlogCard key={post.id} post={post} onReviewed={load} />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {pagedPosts.map(post => (
          <div key={post.id} className="bg-card rounded-2xl border border-border/50 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-semibold text-foreground line-clamp-1">{post.title}</h3>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                {post.submitted_by_specialist_id && (
                  <span className="bg-brand-bluePale text-brand-navy px-2 py-0.5 rounded-full font-medium">Enviado por médico</span>
                )}
                {post.submitted_by_specialist_id && post.review_status === "rejected" && (
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Rechazado</span>
                )}
                {post.category && <span className="bg-accent text-accent-foreground px-2 py-0.5 rounded-full">{post.category}</span>}
                <span>{moment(post.created_date).format("DD MMM YYYY")}</span>
                {post.scheduled_at && !post.published ? (
                  <span className="flex items-center gap-1 text-amber-600">
                    <Clock className="w-3 h-3" />
                    Prog. {moment(post.scheduled_at).format("DD MMM · HH:mm")}
                  </span>
                ) : (
                  <span className={`flex items-center gap-1 ${post.published ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {post.published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {post.published ? "Publicado" : "Borrador"}
                  </span>
                )}
              </div>
              {post.review_status === "rejected" && post.rejection_reason && (
                <p className="text-xs text-red-500 mt-1">Motivo de rechazo: {post.rejection_reason}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => togglePublish(post)} aria-label={post.published ? "Despublicar artículo" : "Publicar artículo"} className="p-2 rounded-lg hover:bg-muted transition-colors" title={post.published ? "Despublicar" : "Publicar"}>
                {post.published ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-primary" />}
              </button>
              <Link to={`/admin/blog/editar/${post.id}`} aria-label="Editar artículo" className="p-2 rounded-lg hover:bg-muted transition-colors">
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </Link>
              <button onClick={() => handleDelete(post.id)} aria-label="Eliminar artículo" className="p-2 rounded-lg hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          </div>
        ))}
        {posts.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">No hay artículos aún.</div>
        )}
      </div>
      <Pagination
        page={postsPage}
        totalPages={postsTotalPages}
        onPageChange={setPostsPage}
        total={otherPosts.length}
        pageSize={20}
      />
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
