import { base44 } from "@/api/base44Client";

// Cuenta lo que necesita atención del dueño en cada sección, para mostrar
// el círculo rojo en el menú del admin. Mismos criterios que usa cada
// página para su propio conteo interno (AdminDoctores, AdminVerificaciones).
export async function loadPendingCounts() {
  const [specialists, docs, posts] = await Promise.all([
    base44.entities.Specialist.list(),
    base44.entities.SpecialistDocument.list("-created_date", 500),
    base44.entities.BlogPost.list("-created_date", 500),
  ]);

  const pendingDoctors = specialists.filter(
    (s) => s.publication_status === "pending_review" || (s.publication_status === "draft" && s.owner_user_id)
  ).length;

  const pendingDocuments = docs.filter(
    (d) => d.upload_status === "uploaded" || d.upload_status === "under_review"
  ).length;

  const pendingBlogPosts = posts.filter(
    (p) => p.submitted_by_specialist_id && p.review_status === "pending_review"
  ).length;

  return {
    "/admin/doctores": pendingDoctors,
    "/admin/verificaciones": pendingDocuments,
    "/admin/blog": pendingBlogPosts,
  };
}
