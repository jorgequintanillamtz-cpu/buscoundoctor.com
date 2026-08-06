import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import DoctorStatsPanel from "@/components/admin/DoctorStatsPanel";
import {
  Users, Heart, MapPin, FileText, Calendar, Stethoscope,
  ShieldCheck, Star, ClipboardList, TrendingUp, CheckCircle2, Crown, BarChart3,
} from "lucide-react";

// Paleta por tipo de alerta: cuando hay algo pendiente (urgent), la tarjeta
// toma este color; en 0 se queda neutra (gris). Todas las clases están
// escritas literalmente aquí para que Tailwind las detecte en el build.
const ALERT_HUES = {
  amber: { bg: "bg-amber-50", border: "border-amber-200 hover:border-amber-300", iconBg: "bg-amber-100", iconText: "text-amber-600", valueText: "text-amber-700" },
  blue: { bg: "bg-blue-50", border: "border-blue-200 hover:border-blue-300", iconBg: "bg-blue-100", iconText: "text-blue-600", valueText: "text-blue-700" },
  pink: { bg: "bg-pink-50", border: "border-pink-200 hover:border-pink-300", iconBg: "bg-pink-100", iconText: "text-pink-600", valueText: "text-pink-700" },
  orange: { bg: "bg-orange-50", border: "border-orange-200 hover:border-orange-300", iconBg: "bg-orange-100", iconText: "text-orange-600", valueText: "text-orange-700" },
};

function AlertCard({ to, icon: Icon, label, count, hue }) {
  const urgent = count > 0;
  const c = ALERT_HUES[hue];
  return (
    <Link
      to={to}
      className={`flex items-center gap-2.5 rounded-xl border p-3 transition-colors ${
        urgent ? `${c.bg} ${c.border}` : "bg-card border-border/50 hover:border-border"
      }`}
    >
      <span
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          urgent ? `${c.iconBg} ${c.iconText}` : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0">
        <p className={`font-heading font-bold text-lg leading-none ${urgent ? c.valueText : "text-foreground"}`}>
          {count}
        </p>
        <span
          className={`inline-block text-[10px] font-semibold leading-tight mt-1.5 px-2 py-0.5 rounded-full truncate max-w-full ${
            urgent ? `${c.iconBg} ${c.iconText}` : "bg-muted text-muted-foreground"
          }`}
        >
          {label}
        </span>
      </div>
    </Link>
  );
}

function StatCard({ icon: Icon, label, value, iconBg, iconColor }) {
  return (
    <div className="bg-card rounded-xl border border-border/50 p-3.5">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${iconBg} ${iconColor}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="font-heading font-bold text-lg text-foreground leading-tight">{value}</p>
      <span className={`inline-block text-[10px] font-semibold mt-1.5 px-2 py-0.5 rounded-full truncate max-w-full ${iconBg} ${iconColor}`}>
        {label}
      </span>
    </div>
  );
}

// Chip de título de sección: mismo patrón de color que las tarjetas de esa
// sección, para que se note de un vistazo a qué grupo pertenece cada bloque.
function SectionLabel({ icon: Icon, children, bg, text }) {
  return (
    <h2 className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${bg} ${text} px-2.5 py-1 rounded-full mb-3`}>
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </h2>
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
      <section className="mb-6">
        <SectionLabel icon={ShieldCheck} bg="bg-amber-50" text="text-amber-700">Pendientes</SectionLabel>
        <div className="bg-amber-50/30 border border-amber-100 rounded-2xl p-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <AlertCard to="/admin/verificaciones" icon={ShieldCheck} label="Cédulas por revisar" count={alerts.pendingDocs} hue="amber" />
            <AlertCard to="/admin/doctores" icon={Users} label="Doctores en revisión" count={alerts.pendingDoctors} hue="blue" />
            <AlertCard to="/admin/resenas" icon={Star} label="Reseñas sin aprobar" count={alerts.pendingReviews} hue="pink" />
            <AlertCard to="/admin/solicitudes" icon={ClipboardList} label="Solicitudes sin contactar" count={alerts.pendingRequests} hue="orange" />
          </div>
        </div>
      </section>

      {/* Negocio: qué tan sano está el directorio */}
      <section className="mb-6">
        <SectionLabel icon={TrendingUp} bg="bg-blue-50" text="text-blue-700">Negocio</SectionLabel>
        <div className="bg-blue-50/30 border border-blue-100 rounded-2xl p-3">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
            <StatCard icon={CheckCircle2} label="Doctores activos" value={`${business.activeDoctors} / ${business.totalDoctors}`} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
            <StatCard icon={FileText} label="Publicados / borrador" value={`${business.publishedDoctors} / ${business.draftDoctors}`} iconBg="bg-blue-50" iconColor="text-blue-600" />
            <StatCard icon={Crown} label="Doctores en Premium" value={`${business.premiumDoctors} / ${business.totalDoctors}`} iconBg="bg-purple-50" iconColor="text-purple-600" />
            <StatCard icon={TrendingUp} label="Registros nuevos (30 días)" value={business.newLast30} iconBg="bg-indigo-50" iconColor="text-indigo-600" />
            <StatCard icon={Calendar} label="Solicitudes de cita (total)" value={business.totalRequests} iconBg="bg-orange-50" iconColor="text-orange-600" />
          </div>
        </div>
      </section>

      {/* Estadísticas: impresiones, clicks y citas agendadas de todos los
          doctores. Antes vivía en /admin/estadisticas como página aparte;
          se fusionó aquí para no tener que saltar entre pantallas. */}
      <section className="mb-6">
        <SectionLabel icon={BarChart3} bg="bg-purple-50" text="text-purple-700">Estadísticas</SectionLabel>
        <div className="bg-purple-50/30 border border-purple-100 rounded-2xl p-3">
          <DoctorStatsPanel />
        </div>
      </section>

      {/* Catálogo: contenido de soporte del sitio */}
      <section>
        <SectionLabel icon={Heart} bg="bg-emerald-50" text="text-emerald-700">Catálogo</SectionLabel>
        <div className="bg-emerald-50/30 border border-emerald-100 rounded-2xl p-3">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
            <StatCard icon={Heart} label="Especialidades" value={catalog.specialties} iconBg="bg-pink-50" iconColor="text-pink-600" />
            <StatCard icon={MapPin} label="Zonas" value={catalog.zones} iconBg="bg-orange-50" iconColor="text-orange-600" />
            <StatCard icon={FileText} label="Artículos" value={catalog.posts} iconBg="bg-sky-50" iconColor="text-sky-600" />
          </div>
        </div>
      </section>
    </div>
  );
}
