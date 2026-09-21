import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, BarChart3, ExternalLink, Stethoscope, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import {
  isWithinInterval, parseISO, eachDayOfInterval, eachMonthOfInterval,
  subDays, subMonths, startOfMonth, endOfMonth, format,
} from "date-fns";
import { es } from "date-fns/locale";

const SOURCE_PAGE_LABELS = {
  home: "Inicio",
  directorio: "Directorio",
  especialidad: "Página de especialidad",
  especialidad_zona: "Especialidad + zona",
  similares: "Médicos similares",
  otro: "Otro",
};

function KpiCard({ value, label, sub }) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5">
      <p className="text-sm font-semibold text-foreground mb-1">{label}</p>
      <p className="font-heading font-extrabold text-3xl text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

export default function DoctorDashboardHome({ specialist, isOwnProfile = true, onNavigate }) {
  const specialistId = specialist?.id;
  const [range, setRange] = useState("30d"); // "7d" | "30d" | "12m"

  const { data: impressions = [], isLoading: loadingImp } = useQuery({
    queryKey: ["doctor-impressions-home", specialistId],
    queryFn: () => base44.entities.DoctorImpression.filter({ doctor_id: specialistId }, "-date", 500),
    enabled: !!specialistId,
  });
  const { data: clicks = [], isLoading: loadingClicks } = useQuery({
    queryKey: ["doctor-clicks-home", specialistId],
    queryFn: () => base44.entities.DoctorClick.filter({ doctor_id: specialistId }, "-created_date", 500),
    enabled: !!specialistId,
  });
  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ["doctor-contacts-home", specialistId],
    queryFn: () => base44.entities.DoctorContact.filter({ doctor_id: specialistId }, "-date", 500),
    enabled: !!specialistId,
  });

  const loading = loadingImp || loadingClicks || loadingContacts;
  const hasAnyData = impressions.length > 0 || clicks.length > 0 || contacts.length > 0;

  const now = useMemo(() => new Date(), []);
  const last30Start = useMemo(() => subDays(now, 29), [now]);

  // ---- KPIs (últimos 30 días, como en la referencia) ----
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
    if (range === "12m") {
      const months = eachMonthOfInterval({ start: subMonths(now, 11), end: now });
      return months.map((month) => {
        const monthKey = format(month, "yyyy-MM");
        const mStart = startOfMonth(month);
        const mEnd = endOfMonth(month);
        const imp = impressions.filter((i) => i.date && i.date.startsWith(monthKey)).reduce((s, i) => s + (i.count || 0), 0);
        const clk = clicks.filter((c) => c.created_date && isWithinInterval(parseISO(c.created_date), { start: mStart, end: mEnd })).length;
        const cta = contacts.filter((c) => c.date && c.date.startsWith(monthKey)).reduce((s, c) => s + (c.count || 0), 0);
        return { label: format(month, "MMM yy", { locale: es }), "Veces que te vieron": imp, "Visitas a tu perfil": clk, "Quieren agendar": cta };
      });
    }
    const daysBack = range === "7d" ? 6 : 29;
    const days = eachDayOfInterval({ start: subDays(now, daysBack), end: now });
    return days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const imp = impressions.filter((i) => i.date === dayStr).reduce((s, i) => s + (i.count || 0), 0);
      const clk = clicks.filter((c) => c.created_date && format(parseISO(c.created_date), "yyyy-MM-dd") === dayStr).length;
      const cta = contacts.filter((c) => c.date === dayStr).reduce((s, c) => s + (c.count || 0), 0);
      return { label: format(day, "d MMM", { locale: es }), "Veces que te vieron": imp, "Visitas a tu perfil": clk, "Quieren agendar": cta };
    });
  }, [range, impressions, clicks, contacts, now]);

  // ---- De dónde vienen los clicks (últimos 30 días) ----
  const clicksBySource = useMemo(() => {
    const totals = {};
    clicks
      .filter((c) => c.created_date && isWithinInterval(parseISO(c.created_date), { start: last30Start, end: now }))
      .forEach((c) => {
        const key = c.source_page || "otro";
        totals[key] = (totals[key] || 0) + 1;
      });
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, count }));
  }, [clicks, last30Start, now]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado de bienvenida + acciones */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          {isOwnProfile ? (
            <>
              <h1 className="font-heading font-bold text-xl text-foreground">Hola, {specialist?.full_name?.replace(/^(dr\.?|dra\.?)\s+/i, "").split(" ")[0] || "doctor"} 👋</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Así va tu perfil en BuscoUnDoctor</p>
            </>
          ) : (
            <>
              <h1 className="font-heading font-bold text-xl text-foreground">Resumen de actividad</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Estadísticas del perfil de {specialist?.full_name || "este médico"} (vista de administrador)</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {specialist?.slug && (
            <Button variant="outline" size="sm" className="rounded-xl gap-1.5" asChild>
              <a href={`/especialista/${specialist.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
                Ver perfil público
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Aviso de perfil incompleto: un médico nuevo veía puros ceros sin
          ninguna pista de qué hacer. Usa el mismo porcentaje que el menú
          lateral y la pantalla "Llena tu perfil" (completeness_score). */}
      {isOwnProfile && (specialist?.completeness_score ?? 0) < 100 && (
        <div className="bg-brand-navy rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <p className="text-sm font-heading font-semibold text-white">Tu perfil está {specialist?.completeness_score || 0}% completo</p>
            </div>
            <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${specialist?.completeness_score || 0}%` }} />
            </div>
            <p className="text-xs text-white/70">Un perfil completo les genera más confianza a tus pacientes y aparece mejor en el directorio.</p>
          </div>
          <Button onClick={() => onNavigate?.("completar")} className="rounded-xl gap-1.5 min-h-[44px] bg-white text-brand-navy hover:bg-white/90 flex-shrink-0 w-full sm:w-auto">
            Llenar mi perfil
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard value={kpis.impressions30} label="Veces que te vieron este mes" sub={isOwnProfile ? "Tu perfil apareció en el directorio" : "Veces que apareció en el directorio"} />
        <KpiCard value={kpis.clicks30} label="Visitas a tu perfil este mes" sub={isOwnProfile ? "Pacientes que entraron a tu perfil" : "Visitas al perfil"} />
        <KpiCard value={kpis.contacts30} label="Pacientes que quieren agendar" sub="Solicitudes de cita este mes" />
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
                <h2 className="font-heading font-semibold text-sm text-foreground">Actividad</h2>
              </div>
              <div className="flex items-center bg-muted rounded-full p-1">
                {[["7d", "7 días"], ["30d", "30 días"], ["12m", "12 meses"]].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setRange(key)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${range === key ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="homeImp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2F6FED" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2F6FED" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="homeClk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0B1E4D" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0B1E4D" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="homeCta" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={range === "12m" ? 0 : range === "30d" ? 3 : 0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid hsl(var(--border))" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Veces que te vieron" stroke="#2F6FED" fill="url(#homeImp)" strokeWidth={2} />
                <Area type="monotone" dataKey="Visitas a tu perfil" stroke="#0B1E4D" fill="url(#homeClk)" strokeWidth={2} />
                <Area type="monotone" dataKey="Quieren agendar" stroke="#10B981" fill="url(#homeCta)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground leading-relaxed mt-4 pt-4 border-t border-border/40">
              <strong className="text-foreground">Veces que te vieron</strong> = tu perfil apareció en el directorio.{" "}
              <strong className="text-foreground">Visitas a tu perfil</strong> = un paciente entró a verlo.{" "}
              <strong className="text-foreground">Quieren agendar</strong> = un paciente pidió una cita contigo.
            </p>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tu card en el directorio */}
        <div className="bg-card rounded-2xl border border-border/50 p-5">
          <h2 className="font-heading font-semibold text-sm text-foreground mb-4">{isOwnProfile ? "Tu card en el directorio" : "Card en el directorio"}</h2>
          <div className="flex items-start gap-4 p-4 rounded-xl border border-border/50">
            <div className="w-16 h-16 rounded-2xl bg-accent flex-shrink-0 flex items-center justify-center overflow-hidden">
              {specialist?.profile_photo ? (
                <img src={specialist.profile_photo} alt={specialist.full_name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-heading font-bold text-lg text-primary">
                  {specialist?.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-heading font-semibold text-sm text-foreground truncate">{specialist?.full_name}</p>
              <p className="text-xs text-primary font-medium mt-0.5">{specialist?.specialty || "Sin especialidad"}</p>
              <p className="text-xs text-muted-foreground mt-1">{specialist?.zone || specialist?.location || "Sin zona"}</p>
            </div>
          </div>
          {specialist?.slug && (
            <Button variant="outline" size="sm" className="rounded-xl gap-1.5 w-full mt-3" asChild>
              <a href={`/especialista/${specialist.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5" />
                {isOwnProfile ? "Ver cómo se ve tu perfil" : "Ver perfil público"}
              </a>
            </Button>
          )}
        </div>

        {/* De dónde vienen los clicks */}
        <div className="bg-card rounded-2xl border border-border/50 p-5">
          <h2 className="font-heading font-semibold text-sm text-foreground mb-4">{isOwnProfile ? "Por dónde te encuentran (últimos 30 días)" : "Por dónde encuentran al médico (últimos 30 días)"}</h2>
          {clicksBySource.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aún no hay visitas este mes.</p>
          ) : (
            <div className="space-y-3">
              {clicksBySource.map((s) => {
                const maxVal = Math.max(...clicksBySource.map((x) => x.count));
                const pct = Math.round((s.count / maxVal) * 100);
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-foreground">{SOURCE_PAGE_LABELS[s.key] || s.key}</span>
                      <span className="text-muted-foreground">{s.count}</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-brand-blue rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
