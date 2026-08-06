import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import DoctorStatsPanel from "@/components/admin/DoctorStatsPanel";
import {
  Users, Heart, MapPin, FileText, Calendar, Stethoscope,
  ShieldCheck, Star, ClipboardList, TrendingUp, CheckCircle2, Crown, BarChart3, DollarSign,
} from "lucide-react";

const fmtMoney = (n) => `$${(n || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

// Paleta por tipo de alerta: cuando hay algo pendiente (urgent), la tarjeta
// toma este color; en 0 se queda neutra (gris). Todas las clases están
// escritas literalmente aquí para que Tailwind las detecte en el build.
const ALERT_HUES = {
  amber: { bg: "bg-amber-100", border: "border-amber-200 hover:border-amber-300", iconBg: "bg-white/70", iconText: "text-amber-700", valueText: "text-amber-800", labelBg: "bg-amber-200/70", labelText: "text-amber-800" },
  blue: { bg: "bg-blue-100", border: "border-blue-200 hover:border-blue-300", iconBg: "bg-white/70", iconText: "text-blue-700", valueText: "text-blue-800", labelBg: "bg-blue-200/70", labelText: "text-blue-800" },
  pink: { bg: "bg-pink-100", border: "border-pink-200 hover:border-pink-300", iconBg: "bg-white/70", iconText: "text-pink-700", valueText: "text-pink-800", labelBg: "bg-pink-200/70", labelText: "text-pink-800" },
  orange: { bg: "bg-orange-100", border: "border-orange-200 hover:border-orange-300", iconBg: "bg-white/70", iconText: "text-orange-700", valueText: "text-orange-800", labelBg: "bg-orange-200/70", labelText: "text-orange-800" },
};

// Paleta para las tarjetas de métricas (Negocio / Catálogo): toda la caja se
// rellena de color, no solo el ícono. Clases escritas literalmente para que
// Tailwind las detecte en el build.
const STAT_HUES = {
  emerald: { bg: "bg-emerald-100", border: "border-emerald-200", iconBg: "bg-white/70", iconText: "text-emerald-700", labelBg: "bg-emerald-200/70", labelText: "text-emerald-800" },
  blue: { bg: "bg-blue-100", border: "border-blue-200", iconBg: "bg-white/70", iconText: "text-blue-700", labelBg: "bg-blue-200/70", labelText: "text-blue-800" },
  purple: { bg: "bg-purple-100", border: "border-purple-200", iconBg: "bg-white/70", iconText: "text-purple-700", labelBg: "bg-purple-200/70", labelText: "text-purple-800" },
  indigo: { bg: "bg-indigo-100", border: "border-indigo-200", iconBg: "bg-white/70", iconText: "text-indigo-700", labelBg: "bg-indigo-200/70", labelText: "text-indigo-800" },
  orange: { bg: "bg-orange-100", border: "border-orange-200", iconBg: "bg-white/70", iconText: "text-orange-700", labelBg: "bg-orange-200/70", labelText: "text-orange-800" },
  pink: { bg: "bg-pink-100", border: "border-pink-200", iconBg: "bg-white/70", iconText: "text-pink-700", labelBg: "bg-pink-200/70", labelText: "text-pink-800" },
  sky: { bg: "bg-sky-100", border: "border-sky-200", iconBg: "bg-white/70", iconText: "text-sky-700", labelBg: "bg-sky-200/70", labelText: "text-sky-800" },
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
            urgent ? `${c.labelBg} ${c.labelText}` : "bg-muted text-muted-foreground"
          }`}
        >
          {label}
        </span>
      </div>
    </Link>
  );
}

function StatCard({ icon: Icon, label, value, hue }) {
  const c = STAT_HUES[hue];
  return (
    <div className={`rounded-xl border p-3.5 ${c.bg} ${c.border}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${c.iconBg} ${c.iconText}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="font-heading font-bold text-lg text-foreground leading-tight">{value}</p>
      <span className={`inline-block text-[10px] font-semibold mt-1.5 px-2 py-0.5 rounded-full truncate max-w-full ${c.labelBg} ${c.labelText}`}>
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
      const premiumSpecialists = specialists.filter((s) => s.plan_slug === "premium");
      const premiumDoctors = premiumSpecialists.length;
      const monthlyValue = premiumSpecialists.reduce((sum, s) => sum + (s.monthly_amount || 999), 0);

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
          monthlyValue,
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

      {/* Resumen: los 4 números que más le importan al dueño, hasta arriba */}
      <section className="mb-6">
        <SectionLabel icon={TrendingUp} bg="bg-blue-50" text="text-blue-700">Resumen</SectionLabel>
        <div className="bg-blue-50/30 border border-blue-100 rounded-2xl p-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <StatCard icon={TrendingUp} label="Registros nuevos (30 días)" value={business.newLast30} hue="indigo" />
            <StatCard icon={CheckCircle2} label="Doctores activos" value={`${business.activeDoctors} / ${business.totalDoctors}`} hue="emerald" />
            <StatCard icon={Crown} label="Doctores premium" value={`${business.premiumDoctors} / ${business.totalDoctors}`} hue="purple" />
            <StatCard icon={DollarSign} label="Valor ventas al mes" value={fmtMoney(business.monthlyValue)} hue="blue" />
          </div>
        </div>
      </section>

      {/* Negocio: qué tan sano está el directorio */}
      <section className="mb-6">
        <SectionLabel icon={FileText} bg="bg-sky-50" text="text-sky-700">Negocio</SectionLabel>
        <div className="bg-sky-50/30 border border-sky-100 rounded-2xl p-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <StatCard icon={FileText} label="Publicados / borrador" value={`${business.publishedDoctors} / ${business.draftDoctors}`} hue="blue" />
            <StatCard icon={Calendar} label="Solicitudes de cita (total)" value={business.totalRequests} hue="orange" />
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
      <section className="mb-6">
        <SectionLabel icon={Heart} bg="bg-emerald-50" text="text-emerald-700">Catálogo</SectionLabel>
        <div className="bg-emerald-50/30 border border-emerald-100 rounded-2xl p-3">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
            <StatCard icon={Heart} label="Especialidades" value={catalog.specialties} hue="pink" />
            <StatCard icon={MapPin} label="Zonas" value={catalog.zones} hue="orange" />
            <StatCard icon={FileText} label="Artículos" value={catalog.posts} hue="sky" />
          </div>
        </div>
      </section>

      {/* Pendientes: movido hasta abajo, con link directo a cada bandeja */}
      <section>
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
    </div>
  );
}
