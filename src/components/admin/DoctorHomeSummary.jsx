import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Eye, MousePointerClick, Stethoscope } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";
import { eachDayOfInterval, subDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

// Mini resumen de actividad para el tab "Inicio" del panel del médico:
// últimos 7 días, en formato compacto (sin ejes, tipo sparkline).
export default function DoctorHomeSummary({ specialistId }) {
  const { data: clicks = [], isLoading: loadingClicks } = useQuery({
    queryKey: ["doctor-clicks-mini", specialistId],
    queryFn: () => base44.entities.DoctorClick.filter({ doctor_id: specialistId }, "-created_date", 200),
    enabled: !!specialistId,
  });
  const { data: impressions = [], isLoading: loadingImp } = useQuery({
    queryKey: ["doctor-impressions-mini", specialistId],
    queryFn: () => base44.entities.DoctorImpression.filter({ doctor_id: specialistId }, "-date", 200),
    enabled: !!specialistId,
  });

  const loading = loadingClicks || loadingImp;

  const { chartData, totalImpressions, totalClicks } = useMemo(() => {
    const now = new Date();
    const days = eachDayOfInterval({ start: subDays(now, 6), end: now });
    let totalImp = 0;
    let totalClk = 0;
    const data = days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const imp = impressions.filter((i) => i.date === dayStr).reduce((s, i) => s + (i.count || 0), 0);
      const clk = clicks.filter((c) => c.created_date && format(parseISO(c.created_date), "yyyy-MM-dd") === dayStr).length;
      totalImp += imp;
      totalClk += clk;
      return { label: format(day, "d MMM", { locale: es }), Impresiones: imp, Clicks: clk };
    });
    return { chartData: data, totalImpressions: totalImp, totalClicks: totalClk };
  }, [impressions, clicks]);

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 p-5 flex items-center justify-center h-[140px]">
        <Stethoscope className="w-6 h-6 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading font-semibold text-sm text-foreground">Actividad de los últimos 7 días</h3>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex gap-6 flex-shrink-0">
          <div>
            <div className="flex items-center gap-1.5 text-brand-blue">
              <Eye className="w-4 h-4" />
              <span className="font-heading font-bold text-xl text-foreground">{totalImpressions}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Impresiones</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-brand-navy">
              <MousePointerClick className="w-4 h-4" />
              <span className="font-heading font-bold text-xl text-foreground">{totalClicks}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Clicks al perfil</p>
          </div>
        </div>
        <div className="w-full flex-1" style={{ height: 90 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="miniImp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2F6FED" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2F6FED" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="miniClk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0B1E4D" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0B1E4D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11, padding: "4px 8px" }} labelStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="Impresiones" stroke="#2F6FED" fill="url(#miniImp)" strokeWidth={2} />
              <Area type="monotone" dataKey="Clicks" stroke="#0B1E4D" fill="url(#miniClk)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
