import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import DoctorStatsPanel from "@/components/admin/DoctorStatsPanel";
import {
  Users, Heart, MapPin, FileText, Stethoscope,
  ShieldCheck, Star, ClipboardList, TrendingUp, CheckCircle2, Crown, BarChart3, DollarSign,
} from "lucide-react";

const fmtMoney = (n) => `$${(n || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

// Mismos colores de marca que se usan en el resto del sitio (countdown,
// footer, botones): azul y navy sólidos con texto blanco, en vez de los
// tonos pastel apagados. Dos variantes para dar un poco de ritmo visual.
const STAT_TONES = {
  blue: { bg: "bg-brand-blue", iconBg: "bg-white/20", iconText: "text-white", labelBg: "bg-white/20", labelText: "text-white" },
  navy: { bg: "bg-brand-navy", iconBg: "bg-white/15", iconText: "text-white", labelBg: "bg-white/15", labelText: "text-white" },
};

// Pendientes usa ámbar sólido (no pastel) cuando hay algo por revisar, para
// que la urgencia se note; en 0 se queda neutra.
function AlertCard({ to, icon: Icon, label, count }) {
  const urgent = count > 0;
  return (
    <Link
      to={to}
      className={`flex items-center gap-2.5 rounded-xl border p-3 transition-colors ${
        urgent ? "bg-amber-500 border-amber-500 hover:bg-amber-600" : "bg-card border-border/50 hover:border-border"
      }`}
    >
      <span
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          urgent ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0">
        <p className={`font-heading font-bold text-lg leading-none ${urgent ? "text-white" : "text-foreground"}`}>
          {count}
        </p>
        <span
          className={`inline-block text-[10px] font-semibold leading-tight mt-1.5 px-2 py-0.5 rounded-full truncate max-w-full ${
            urgent ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
          }`}
        >
          {label}
        </span>
      </div>
    </Link>
  );
}

function StatCard({ icon: Icon, label, value, tone = "blue" }) {
  const c = STAT_TONES[tone];
  return (
    <div className={`rounded-xl p-3.5 ${c.bg}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${c.iconBg} ${c.iconText}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="font-heading font-bold text-lg text-white leading-tight">{value}</p>
      <span className={`inline-block text-[10px] font-semibold mt-1.5 px-2 py-0.5 rounded-full truncate max-w-full ${c.labelBg} ${c.labelText}`}>
        {label}
      </span>
    </div>
  );
}

// Chip de título de sección, en el mismo azul de marca que el resto del sitio.
function SectionLabel({ icon: Icon, children }) {
  return (
    <h2 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide bg-brand-bluePale text-brand-navy px-2.5 py-1 rounded-full mb-3">
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
      const [specialists, specialties, zones, posts, requests, documents, reviews, payments] = await Promise.all([
        base44.entities.Specialist.list(),
        base44.entities.Specialty.list(),
        base44.entities.Zone.list(),
        base44.entities.BlogPost.list(),
        base44.entities.AppointmentRequest.list(),
        base44.entities.SpecialistDocument.list(),
        base44.entities.Review.list(),
        base44.entities.PremiumPayment.list(),
      ]);

      const pendingDocs = documents.filter(
        (d) => d.upload_status === "uploaded" || d.upload_status === "under_review"
      ).length;
      const pendingDoctors = specialists.filter((s) => s.publication_status === "pending_review").length;
      const pendingReviews = reviews.filter((r) => !r.approved).length;
      const pendingRequests = requests.filter((r) => (r.status || "pendiente") === "pendiente").length;

      const activeDoctors = specialists.filter((s) => s.active).length;
      const premiumDoctors = specialists.filter((s) => s.plan_slug === "premium").length;

      // Valor ventas al mes = solo lo YA cobrado este mes (pagos registrados
      // en PremiumPayment con fecha dentro del mes en curso), no lo esperado.
      const now = new Date();
      const monthlyValue = payments
        .filter((p) => {
          if (!p.payment_date) return false;
          const d = new Date(p.payment_date);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        })
        .reduce((sum, p) => sum + (p.amount || 0), 0);

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
          newLast30,
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
        <SectionLabel icon={TrendingUp}>Resumen</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <StatCard icon={TrendingUp} label="Registros nuevos (30 días)" value={business.newLast30} tone="blue" />
          <StatCard icon={CheckCircle2} label="Doctores activos" value={business.activeDoctors} tone="navy" />
          <StatCard icon={Crown} label="Doctores premium" value={business.premiumDoctors} tone="blue" />
          <StatCard icon={DollarSign} label="Valor ventas al mes (cobrado)" value={fmtMoney(business.monthlyValue)} tone="navy" />
        </div>
      </section>

      {/* Estadísticas: impresiones, clicks y citas agendadas de todos los
          doctores. Antes vivía en /admin/estadisticas como página aparte;
          se fusionó aquí para no tener que saltar entre pantallas. */}
      <section className="mb-6">
        <SectionLabel icon={BarChart3}>Estadísticas</SectionLabel>
        <div className="bg-brand-bluePale/30 border border-brand-blue/10 rounded-2xl p-3">
          <DoctorStatsPanel />
        </div>
      </section>

      {/* Catálogo: contenido de soporte del sitio */}
      <section className="mb-6">
        <SectionLabel icon={Heart}>Catálogo</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
          <StatCard icon={Heart} label="Especialidades" value={catalog.specialties} tone="blue" />
          <StatCard icon={MapPin} label="Zonas" value={catalog.zones} tone="navy" />
          <StatCard icon={FileText} label="Artículos" value={catalog.posts} tone="blue" />
        </div>
      </section>

      {/* Pendientes: hasta abajo, con link directo a cada bandeja */}
      <section>
        <SectionLabel icon={ShieldCheck}>Pendientes</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <AlertCard to="/admin/verificaciones" icon={ShieldCheck} label="Cédulas por revisar" count={alerts.pendingDocs} />
          <AlertCard to="/admin/doctores" icon={Users} label="Doctores en revisión" count={alerts.pendingDoctors} />
          <AlertCard to="/admin/resenas" icon={Star} label="Reseñas sin aprobar" count={alerts.pendingReviews} />
          <AlertCard to="/admin/solicitudes" icon={ClipboardList} label="Solicitudes sin contactar" count={alerts.pendingRequests} />
        </div>
      </section>
    </div>
  );
}
