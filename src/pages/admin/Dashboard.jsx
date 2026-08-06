import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import DoctorStatsPanel from "@/components/admin/DoctorStatsPanel";
import {
  Stethoscope, TrendingUp, BarChart3,
} from "lucide-react";

const fmtMoney = (n) => `$${(n || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

// Mismos colores de marca que se usan en el resto del sitio (countdown,
// footer, botones): azul y navy sólidos con texto blanco, en vez de los
// tonos pastel apagados. Dos variantes para dar un poco de ritmo visual.
const STAT_TONES = {
  blue: { bg: "bg-brand-blue" },
  navy: { bg: "bg-brand-navy" },
};

function StatCard({ label, value, tone = "blue" }) {
  const c = STAT_TONES[tone];
  return (
    <div className={`rounded-xl p-3.5 ${c.bg}`}>
      <p className="text-sm font-semibold text-white/90 mb-1">{label}</p>
      <p className="font-heading font-extrabold text-4xl text-white leading-tight">{value}</p>
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
      const [specialists, payments] = await Promise.all([
        base44.entities.Specialist.list(),
        base44.entities.PremiumPayment.list(),
      ]);

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

  const { business } = data;

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl text-foreground mb-1">Dashboard</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Resumen general del negocio y actividad de la plataforma.
      </p>

      {/* Resumen: los 4 números que más le importan al dueño, hasta arriba */}
      <section className="mb-6">
        <SectionLabel icon={TrendingUp}>Resumen</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <StatCard label="Registros nuevos (30 días)" value={business.newLast30} tone="blue" />
          <StatCard label="Doctores activos" value={business.activeDoctors} tone="navy" />
          <StatCard label="Doctores premium" value={business.premiumDoctors} tone="blue" />
          <StatCard label="Valor ventas al mes (cobrado)" value={fmtMoney(business.monthlyValue)} tone="navy" />
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

    </div>
  );
}
