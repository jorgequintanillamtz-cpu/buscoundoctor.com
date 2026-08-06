import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, BarChart3, Stethoscope } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import {
  startOfMonth, endOfMonth, isWithinInterval, parseISO,
  eachDayOfInterval, eachMonthOfInterval, subDays, subMonths, format,
} from "date-fns";
import { es } from "date-fns/locale";

function KpiCard({ label, sub, value }) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5">
      <p className="text-sm font-semibold text-foreground mb-1">{label}</p>
      <p className="font-heading font-extrabold text-3xl text-foreground">{value.toLocaleString("es-MX")}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

export default function DoctorStatsFull({ specialistId }) {
  const [range, setRange] = useState("30d"); // "30d" | "12m"

  const { data: impressions = [], isLoading: loadingImp } = useQuery({
    queryKey: ["doctor-impressions-full", specialistId],
    queryFn: () => base44.entities.DoctorImpression.filter({ doctor_id: specialistId }, "-date", 500),
    enabled: !!specialistId,
  });
  const { data: clicks = [], isLoading: loadingClicks } = useQuery({
    queryKey: ["doctor-clicks-full", specialistId],
    queryFn: () => base44.entities.DoctorClick.filter({ doctor_id: specialistId }, "-created_date", 500),
    enabled: !!specialistId,
  });
  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ["doctor-contacts-full", specialistId],
    queryFn: () => base44.entities.DoctorContact.filter({ doctor_id: specialistId }, "-date", 500),
    enabled: !!specialistId,
  });

  const loading = loadingImp || loadingClicks || loadingContacts;
  const hasAnyData = impressions.length > 0 || clicks.length > 0 || contacts.length > 0;

  const now = useMemo(() => new Date(), []);
  const last30Start = useMemo(() => subDays(now, 29), [now]);

  // ---- KPIs (últimos 30 días) ----
  const kpis = useMemo(() => {
    const impressions30 = impressions
      .filter((i) => i.date && isWithinInterval(parseISO(i.date), { start: last30Start, end: now }))
      .reduce((sum, i) => sum + (i.count || 0), 0);

    const clicks30 = clicks.filter(
      (c) => c.created_date && isWithinInterval(parseISO(c.created_date), { start: last30Start, end: now })
    ).length;

    const contacts30 = contacts
      .filter((c) => c.date && isWithinInterval(parseISO(c.date), { start: last30Start, end: now }))
      .reduce((sum, c) => sum + (c.count || 0), 0);

    return { impressions30, clicks30, contacts30 };
  }, [impressions, clicks, contacts, last30Start, now]);

  // ---- Datos de la gráfica ----
  const chartData = useMemo(() => {
    if (range === "30d") {
      const days = eachDayOfInterval({ start: subDays(now, 29), end: now });
      return days.map((day) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const imp = impressions.filter((i) => i.date === dayStr).reduce((s, i) => s + (i.count || 0), 0);
        const clk = clicks.filter((c) => c.created_date && format(parseISO(c.created_date), "yyyy-MM-dd") === dayStr).length;
        const cta = contacts.filter((c) => c.date === dayStr).reduce((s, c) => s + (c.count || 0), 0);
        return { label: format(day, "d MMM", { locale: es }), Impresiones: imp, "Clicks al perfil": clk, "Citas agendadas": cta };
      });
    }
    const months = eachMonthOfInterval({ start: subMonths(now, 11), end: now });
    return months.map((month) => {
      const monthKey = format(month, "yyyy-MM");
      const mStart = startOfMonth(month);
      const mEnd = endOfMonth(month);
      const imp = impressions.filter((i) => i.date && i.date.startsWith(monthKey)).reduce((s, i) => s + (i.count || 0), 0);
      const clk = clicks.filter((c) => c.created_date && isWithinInterval(parseISO(c.created_date), { start: mStart, end: mEnd })).length;
      const cta = contacts.filter((c) => c.date && c.date.startsWith(monthKey)).reduce((s, c) => s + (c.count || 0), 0);
      return { label: format(month, "MMM yy", { locale: es }), Impresiones: imp, "Clicks al perfil": clk, "Citas agendadas": cta };
    });
  }, [range, impressions, clicks, contacts, now]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Impresiones"
          sub="Tu perfil apareció en pantalla — últimos 30 días"
          value={kpis.impressions30}
        />
        <KpiCard
          label="Clicks al perfil"
          sub="Un paciente entró a tu perfil — últimos 30 días"
          value={kpis.clicks30}
        />
        <KpiCard
          label="Citas agendadas"
          sub="Solicitudes de cita — últimos 30 días"
          value={kpis.contacts30}
        />
      </div>

      {/* Gráfica o estado vacío */}
      <div className="bg-card rounded-2xl border border-border/50 p-5">
        {!hasAnyData ? (
          <div className="flex flex-col items-center justify-center text-center py-14">
            <BarChart3 className="w-9 h-9 text-muted-foreground/40 mb-3" />
            <p className="font-heading font-semibold text-sm text-foreground">Sin datos aún</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Las estadísticas aparecerán conforme los pacientes visiten tu perfil.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-heading font-semibold text-sm text-foreground">Actividad en el tiempo</h2>
              </div>
              <div className="flex items-center bg-muted rounded-full p-1">
                <button
                  onClick={() => setRange("30d")}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${range === "30d" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  30 días
                </button>
                <button
                  onClick={() => setRange("12m")}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${range === "12m" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  12 meses
                </button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="fullImp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2F6FED" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2F6FED" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fullClk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0B1E4D" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0B1E4D" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fullCta" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={range === "30d" ? 3 : 0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid hsl(var(--border))" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Impresiones" stroke="#2F6FED" fill="url(#fullImp)" strokeWidth={2} />
                <Area type="monotone" dataKey="Clicks al perfil" stroke="#0B1E4D" fill="url(#fullClk)" strokeWidth={2} />
                <Area type="monotone" dataKey="Citas agendadas" stroke="#10B981" fill="url(#fullCta)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        <strong className="text-foreground">Impresiones</strong> = tu perfil apareció en el directorio.{" "}
        <strong className="text-foreground">Clicks</strong> = un paciente entró a tu perfil.{" "}
        <strong className="text-foreground">Citas agendadas</strong> = un paciente solicitó agendar contigo.
      </p>
    </div>
  );
}
