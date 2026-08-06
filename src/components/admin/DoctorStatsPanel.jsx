import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Eye, MousePointerClick, CalendarCheck, TrendingUp, Stethoscope } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import {
  startOfMonth, endOfMonth, isWithinInterval, parseISO,
  eachDayOfInterval, eachMonthOfInterval, subDays, subMonths, format,
} from "date-fns";
import { es } from "date-fns/locale";

const SOURCE_PAGE_LABELS = {
  home: "Home",
  directorio: "Directorio (/especialistas)",
  especialidad: "Página de especialidad",
  especialidad_zona: "Especialidad + zona",
  similares: "Médicos similares",
  otro: "Otro",
};

function KpiCard({ icon: Icon, label, value, cardBg, cardBorder, iconColor, labelBg, labelText }) {
  return (
    <div className={`rounded-xl border p-3.5 ${cardBg} ${cardBorder}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 bg-white/70 ${iconColor}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="font-heading font-extrabold text-4xl text-foreground leading-tight">{value.toLocaleString("es-MX")}</p>
      <span className={`inline-block text-[10px] font-semibold mt-1.5 px-2 py-0.5 rounded-full truncate max-w-full ${labelBg} ${labelText}`}>
        {label}
      </span>
    </div>
  );
}

// Panel de estadísticas de médicos (impresiones, clicks, citas agendadas),
// incrustado dentro del Dashboard central en vez de vivir en su propia
// página, para que el dueño no tenga que saltar entre pantallas.
export default function DoctorStatsPanel() {
  const [range, setRange] = useState("30d"); // "30d" | "12m"

  const { data: impressions = [], isLoading: loadingImp } = useQuery({
    queryKey: ["doctor-impressions"],
    queryFn: () => base44.entities.DoctorImpression.list("-date", 3000),
  });
  const { data: clicks = [], isLoading: loadingClicks } = useQuery({
    queryKey: ["doctor-clicks"],
    queryFn: () => base44.entities.DoctorClick.list("-created_date", 1000),
  });
  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ["doctor-contacts"],
    queryFn: () => base44.entities.DoctorContact.list("-date", 3000),
  });

  const loading = loadingImp || loadingClicks || loadingContacts;

  const now = useMemo(() => new Date(), []);
  const monthStart = useMemo(() => startOfMonth(now), [now]);
  const monthEnd = useMemo(() => endOfMonth(now), [now]);

  // ---- KPIs del mes actual ----
  const kpis = useMemo(() => {
    const impressionsThisMonth = impressions
      .filter((i) => i.date && isWithinInterval(parseISO(i.date), { start: monthStart, end: monthEnd }))
      .reduce((sum, i) => sum + (i.count || 0), 0);

    const clicksThisMonth = clicks.filter(
      (c) => c.created_date && isWithinInterval(parseISO(c.created_date), { start: monthStart, end: monthEnd })
    ).length;

    const contactsThisMonth = contacts
      .filter((c) => c.date && isWithinInterval(parseISO(c.date), { start: monthStart, end: monthEnd }))
      .reduce((sum, c) => sum + (c.count || 0), 0);

    return { impressionsThisMonth, clicksThisMonth, contactsThisMonth };
  }, [impressions, clicks, contacts, monthStart, monthEnd]);

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
    // 12 meses
    const months = eachMonthOfInterval({ start: subMonths(now, 11), end: now });
    return months.map((month) => {
      const monthKey = format(month, "yyyy-MM");
      const mStart = startOfMonth(month);
      const mEnd = endOfMonth(month);
      const imp = impressions
        .filter((i) => i.date && i.date.startsWith(monthKey))
        .reduce((s, i) => s + (i.count || 0), 0);
      const clk = clicks.filter(
        (c) => c.created_date && isWithinInterval(parseISO(c.created_date), { start: mStart, end: mEnd })
      ).length;
      const cta = contacts
        .filter((c) => c.date && c.date.startsWith(monthKey))
        .reduce((s, c) => s + (c.count || 0), 0);
      return { label: format(month, "MMM yy", { locale: es }), Impresiones: imp, "Clicks al perfil": clk, "Citas agendadas": cta };
    });
  }, [range, impressions, clicks, contacts, now]);

  // ---- Top doctores por citas agendadas (mes actual) ----
  const doctorSpecialtyMap = useMemo(() => {
    const map = {};
    clicks.forEach((c) => { if (c.doctor_id && c.specialty && !map[c.doctor_id]) map[c.doctor_id] = c.specialty; });
    return map;
  }, [clicks]);

  const topDoctors = useMemo(() => {
    const totals = {};
    contacts
      .filter((c) => c.date && isWithinInterval(parseISO(c.date), { start: monthStart, end: monthEnd }))
      .forEach((c) => {
        if (!totals[c.doctor_id]) totals[c.doctor_id] = { doctor_id: c.doctor_id, doctor_name: c.doctor_name, total: 0 };
        totals[c.doctor_id].total += c.count || 0;
      });
    return Object.values(totals)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map((d) => ({ ...d, specialty: doctorSpecialtyMap[d.doctor_id] || "—" }));
  }, [contacts, monthStart, monthEnd, doctorSpecialtyMap]);

  // ---- Clicks por origen (mes actual) ----
  const clicksBySource = useMemo(() => {
    const totals = {};
    clicks
      .filter((c) => c.created_date && isWithinInterval(parseISO(c.created_date), { start: monthStart, end: monthEnd }))
      .forEach((c) => {
        const key = c.source_page || "otro";
        totals[key] = (totals[key] || 0) + 1;
      });
    const maxVal = Math.max(1, ...Object.values(totals));
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, count, pct: Math.round((count / maxVal) * 100) }));
  }, [clicks, monthStart, monthEnd]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Stethoscope className="w-8 h-8 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div>
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
        <KpiCard icon={Eye} label="Impresiones este mes" value={kpis.impressionsThisMonth} cardBg="bg-brand-bluePale" cardBorder="border-brand-blue/15" iconColor="text-brand-blue" labelBg="bg-white/60" labelText="text-brand-blue" />
        <KpiCard icon={MousePointerClick} label="Clicks al perfil este mes" value={kpis.clicksThisMonth} cardBg="bg-slate-200" cardBorder="border-slate-300" iconColor="text-brand-navy" labelBg="bg-white/60" labelText="text-brand-navy" />
        <KpiCard icon={CalendarCheck} label="Citas agendadas este mes" value={kpis.contactsThisMonth} cardBg="bg-emerald-100" cardBorder="border-emerald-200" iconColor="text-emerald-700" labelBg="bg-emerald-200/70" labelText="text-emerald-800" />
      </div>

      {/* Gráfica */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-heading font-semibold text-sm text-foreground">Actividad en el tiempo</h3>
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
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2F6FED" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2F6FED" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorClk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0B1E4D" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0B1E4D" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCta" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={range === "30d" ? 3 : 0} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid hsl(var(--border))" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="Impresiones" stroke="#2F6FED" fill="url(#colorImp)" strokeWidth={2} />
            <Area type="monotone" dataKey="Clicks al perfil" stroke="#0B1E4D" fill="url(#colorClk)" strokeWidth={2} />
            <Area type="monotone" dataKey="Citas agendadas" stroke="#10B981" fill="url(#colorCta)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top doctores */}
        <div className="bg-card rounded-2xl border border-border/50 p-5">
          <h3 className="font-heading font-semibold text-sm text-foreground mb-4">Top doctores por citas agendadas (este mes)</h3>
          {topDoctors.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aún no hay citas agendadas este mes.</p>
          ) : (
            <div className="space-y-1">
              {topDoctors.map((d, i) => (
                <div key={d.doctor_id} className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-heading font-bold text-muted-foreground w-5 flex-shrink-0">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{d.doctor_name || "Sin nombre"}</p>
                      <p className="text-xs text-muted-foreground truncate">{d.specialty}</p>
                    </div>
                  </div>
                  <span className="text-sm font-heading font-bold text-foreground flex-shrink-0">{d.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clicks por origen */}
        <div className="bg-card rounded-2xl border border-border/50 p-5">
          <h3 className="font-heading font-semibold text-sm text-foreground mb-4">Clicks al perfil por origen (este mes)</h3>
          {clicksBySource.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aún no hay clicks este mes.</p>
          ) : (
            <div className="space-y-3">
              {clicksBySource.map((s) => (
                <div key={s.key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-foreground">{SOURCE_PAGE_LABELS[s.key] || s.key}</span>
                    <span className="text-muted-foreground">{s.count}</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-brand-blue rounded-full" style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
