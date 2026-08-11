import { base44 } from "@/api/base44Client";
import { loadPremiumStatuses, mergePremiumStatus, computeLateDoctors } from "@/api/premiumStatus";

// Cuenta lo que necesita atención del dueño en cada sección, para mostrar
// el círculo rojo en el menú del admin. Mismos criterios que usa cada
// página para su propio conteo interno (AdminDoctores, AdminVerificaciones,
// AdminBlog, AdminPremium). "/admin/bandeja" es la suma de las 4 colas,
// para la Bandeja de entrada unificada.
export async function loadPendingCounts() {
  const [specialists, docs, posts, payments, premiumStatuses] = await Promise.all([
    base44.entities.Specialist.list(),
    base44.entities.SpecialistDocument.list("-created_date", 500),
    base44.entities.BlogPost.list("-created_date", 500),
    base44.entities.PremiumPayment.list("-payment_date", 1000),
    loadPremiumStatuses(),
  ]);

  // Los doctores en la papelera no cuentan para ninguna cola: ya no son
  // relevantes operativamente hasta que se restauren.
  const activeSpecialists = specialists.filter((s) => !s.deleted_at);
  const specialistsById = Object.fromEntries(specialists.map((s) => [s.id, s]));

  const pendingDoctors = activeSpecialists.filter(
    (s) => s.publication_status === "pending_review" || (s.publication_status === "draft" && s.owner_user_id)
  ).length;

  const pendingDocuments = docs.filter(
    (d) => (d.upload_status === "uploaded" || d.upload_status === "under_review") && !specialistsById[d.specialist_id]?.deleted_at
  ).length;

  const pendingBlogPosts = posts.filter(
    (p) => p.submitted_by_specialist_id && p.review_status === "pending_review" && !specialistsById[p.submitted_by_specialist_id]?.deleted_at
  ).length;

  const lateDoctors = computeLateDoctors(mergePremiumStatus(activeSpecialists, premiumStatuses), payments).length;

  return {
    "/admin/doctores": pendingDoctors,
    "/admin/verificaciones": pendingDocuments,
    "/admin/blog": pendingBlogPosts,
    "/admin/premium": lateDoctors,
    "/admin/bandeja": pendingDoctors + pendingDocuments + pendingBlogPosts + lateDoctors,
  };
}
