import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Users, Heart, MapPin, FileText, Calendar, Stethoscope,
  ShieldCheck, Star, ClipboardList, TrendingUp, CheckCircle2, Crown,
} from "lucide-react";

function AlertCard({ to, icon: Icon, label, count }) {
  const urgent = count > 0;
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 rounded-2xl border p-4 transition-colors ${
        urgent
          ? "bg-amber-50 border-amber-200 hover:border-amber-300"
          : "bg-card border-border/50 hover:border-border"
      }`}
    >
      <span
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          urgent ? "bg-amber-100 text-amber-600" : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <p className={`font-heading font-bold text-xl leading-none ${urgent ? "text-amber-700" : "text-foreground"}`}>
          {count}
        </p>
        <p className="text-xs text-muted-foreground leading-tight mt-1">{label}</p>
      </div>
    </Link>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5">
      <Icon className={`w-6 h-6 ${color} mb-3`} />
      <p className="font-heading font-bold text-2xl text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    async function load() {
      const [specialists, specialties, zones, posts, requests, documents, reviews] = await Promise.all([
        base44.entities.Specialist.list(),
        base44.entities.Specialty.list(),
        base44.entities.Zone.list(),
        base44.entities.BlogPost.list(),
        base44.entities.AppointmentRequest.list(),
        base44.entities.SpecialistDocument.list(),
        base44.entities.Review.list(),
      ]);

      const pendingDocs = documents.filter(
        (d) => d.upload_status === "uploaded" || d.upload_status === "under_review"
      ).length;
      const pendingDoctors = specialists.filter((s) => s.publication_status === "pending_review").length;
      const pendingReviews = reviews.filter((r) => !r.approved).length;
      const pendingRequests = requests.filter((r) => (r.status || "pendiente") === "pendiente").length;

      const activeDoctors = specialists.filter((s) => s.active).length;
      const publishedDoctors = specialists.filter((s) => s.publication_status === "published").length;
      const draftDoctors = specialists.filter((s) => s.publication_status === "draft").length;
      const premiumDoctors = specialists.filter((s) => s.plan_slug === "premium").length;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const newLast30 = specialists.filter(
        (s) => s.created_date && new Date(s.created_date) >= thirtyDaysAgo
      ).length;

      setData({
        catalog: { specialties: specialties.length, zones: zones.length, posts: posts.length },
        alerts: { pendingDocs, pendingDoctors, pendingReviews, pendingRequests },
        business: {
          activeDoctors,
          totalDoctors: specialists.length,
          publishedDoctors,
          draftDoctors,
          newLast30,
          totalRequests: requests.length,
          premiumDoctors,
        },
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  const { catalog, alerts, business } = data;
  const totalPending = alerts.pendingDocs + alerts.pendingDoctors + alerts.pendingReviews + alerts.pendingRequests;

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl text-foreground mb-1">Dashboard</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {totalPending > 0
          ? `Tienes ${totalPending} cosa${totalPending !== 1 ? "s" : ""} pendiente${totalPending !== 1 ? "s" : ""} de revisar.`
          : "No hay nada pendiente por ahora."}
      </p>

      {/* Pendientes: lo primero que se ve, con link directo a cada bandeja */}
      <section className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Pendientes</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AlertCard to="/admin/verificaciones" icon={ShieldCheck} label="Cédulas por revisar" count={alerts.pendingDocs} />
          <AlertCard to="/admin/doctores" icon={Users} label="Doctores en revisión" count={alerts.pendingDoctors} />
          <AlertCard to="/admin/resenas" icon={Star} label="Reseñas sin aprobar" count={alerts.pendingReviews} />
          <AlertCard to="/admin/solicitudes" icon={ClipboardList} label="Solicitudes sin contactar" count={alerts.pendingRequests} />
        </div>
      </section>

      {/* Negocio: qué tan sano está el directorio */}
      <section className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Negocio</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={CheckCircle2} label="Doctores activos" value={`${business.activeDoctors} / ${business.totalDoctors}`} color="text-emerald-600" />
          <StatCard icon={FileText} label="Publicados / borrador" value={`${business.publishedDoctors} / ${business.draftDoctors}`} color="text-blue-500" />
          <StatCard icon={Crown} label="Doctores en Premium" value={`${business.premiumDoctors} / ${business.totalDoctors}`} color="text-purple-500" />
          <StatCard icon={TrendingUp} label="Registros nuevos (30 días)" value={business.newLast30} color="text-purple-500" />
          <StatCard icon={Calendar} label="Solicitudes de cita (total)" value={business.totalRequests} color="text-orange-500" />
        </div>
      </section>

      {/* Catálogo: contenido de soporte del sitio */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Catálogo</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={Heart} label="Especialidades" value={catalog.specialties} color="text-pink-500" />
          <StatCard icon={MapPin} label="Zonas" value={catalog.zones} color="text-orange-500" />
          <StatCard icon={FileText} label="Artículos" value={catalog.posts} color="text-blue-500" />
        </div>
      </section>
    </div>
  );
}
