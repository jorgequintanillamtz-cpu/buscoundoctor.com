import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Crown, DollarSign, TrendingUp, Plus, Loader2, Trash2,
  ChevronDown, ChevronUp, Stethoscope, Receipt,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import {
  startOfMonth, endOfMonth, isWithinInterval, parseISO,
  eachMonthOfInterval, subMonths, format,
} from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

const METHOD_LABELS = {
  transferencia: "Transferencia",
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  otro: "Otro",
};

const EMPTY_PAYMENT = { specialist_id: "", amount: "999", payment_date: new Date().toISOString().slice(0, 10), period_label: "", method: "transferencia", notes: "" };

function KpiCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5">
      <Icon className={`w-6 h-6 ${color} mb-3`} />
      <p className="font-heading font-bold text-2xl text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

const fmtMoney = (n) => `$${(n || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—");

// Panel de negocio del plan Premium: como el cobro es manual (transferencia,
// efectivo, etc.), aquí el dueño marca quién está Premium y registra cada
// pago que recibe, para tener control real de cuánto dinero está generando
// el plan sin depender de un procesador de pagos.
export default function AdminPremium() {
  const [specialists, setSpecialists] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_PAYMENT);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [specs, pays] = await Promise.all([
      base44.entities.Specialist.list(),
      base44.entities.PremiumPayment.list("-payment_date", 1000),
    ]);
    setSpecialists(specs);
    setPayments(pays);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const premiumDoctors = useMemo(() => specialists.filter((s) => s.plan_slug === "premium"), [specialists]);

  // Ingresos y último pago por doctor, calculados a partir de TODOS los
  // pagos registrados (aunque el doctor ya no sea Premium hoy, su historial
  // de ingresos sigue contando para el negocio).
  const revenueByDoctor = useMemo(() => {
    const map = {};
    payments.forEach((p) => {
      if (!p.specialist_id) return;
      if (!map[p.specialist_id]) map[p.specialist_id] = { total: 0, last: null, list: [] };
      map[p.specialist_id].total += p.amount || 0;
      map[p.specialist_id].list.push(p);
      if (!map[p.specialist_id].last || (p.payment_date && p.payment_date > map[p.specialist_id].last)) {
        map[p.specialist_id].last = p.payment_date;
      }
    });
    Object.values(map).forEach((v) => v.list.sort((a, b) => (b.payment_date || "").localeCompare(a.payment_date || "")));
    return map;
  }, [payments]);

  const premiumRows = useMemo(
    () =>
      premiumDoctors
        .map((doc) => ({
          ...doc,
          totalRevenue: revenueByDoctor[doc.id]?.total || 0,
          lastPayment: revenueByDoctor[doc.id]?.last || null,
          payments: revenueByDoctor[doc.id]?.list || [],
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue),
    [premiumDoctors, revenueByDoctor]
  );

  const now = useMemo(() => new Date(), []);
  const monthStart = useMemo(() => startOfMonth(now), [now]);
  const monthEnd = useMemo(() => endOfMonth(now), [now]);

  const totalRevenue = useMemo(() => payments.reduce((sum, p) => sum + (p.amount || 0), 0), [payments]);
  const revenueThisMonth = useMemo(
    () =>
      payments
        .filter((p) => p.payment_date && isWithinInterval(parseISO(p.payment_date), { start: monthStart, end: monthEnd }))
        .reduce((sum, p) => sum + (p.amount || 0), 0),
    [payments, monthStart, monthEnd]
  );
  const avgPerDoctor = premiumDoctors.length ? totalRevenue / premiumDoctors.length : 0;

  // Ingresos por mes, últimos 6 meses.
  const chartData = useMemo(() => {
    const months = eachMonthOfInterval({ start: subMonths(now, 5), end: now });
    return months.map((month) => {
      const mStart = startOfMonth(month);
      const mEnd = endOfMonth(month);
      const total = payments
        .filter((p) => p.payment_date && isWithinInterval(parseISO(p.payment_date), { start: mStart, end: mEnd }))
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      return { label: format(month, "MMM yy", { locale: es }), Ingresos: total };
    });
  }, [payments, now]);

  const togglePremium = async (id, nombre, currentPlan) => {
    const next = currentPlan === "premium" ? "gratis" : "premium";
    if (next === "gratis" && !confirm(`¿Quitar el plan Premium a ${nombre}? Su historial de pagos se conserva.`)) return;
    const prevActivatedAt = specialists.find((d) => d.id === id)?.premium_activated_at;
    const nextActivatedAt = next === "premium" ? new Date().toISOString() : prevActivatedAt;
    setSpecialists((prev) => prev.map((d) => (d.id === id ? { ...d, plan_slug: next, premium_activated_at: nextActivatedAt } : d)));
    try {
      await base44.entities.Specialist.update(id, { plan_slug: next, premium_activated_at: nextActivatedAt || null });
      toast.success(next === "premium" ? `${nombre} ahora es Premium` : `${nombre} ahora es Gratis`);
    } catch (e) {
      setSpecialists((prev) => prev.map((d) => (d.id === id ? { ...d, plan_slug: currentPlan, premium_activated_at: prevActivatedAt } : d)));
      toast.error("No se pudo actualizar: " + e.message);
    }
  };

  const openPaymentDialog = (specialistId) => {
    setForm({ ...EMPTY_PAYMENT, specialist_id: specialistId || premiumRows[0]?.id || "" });
    setDialogOpen(true);
  };

  const handleSavePayment = async () => {
    if (!form.specialist_id) { toast.error("Elige un doctor"); return; }
    const amountNum = Number(form.amount);
    if (!amountNum || amountNum <= 0) { toast.error("El monto debe ser mayor a 0"); return; }
    if (!form.payment_date) { toast.error("La fecha es obligatoria"); return; }
    setSaving(true);
    try {
      await base44.entities.PremiumPayment.create({
        specialist_id: form.specialist_id,
        amount: amountNum,
        payment_date: form.payment_date,
        period_label: form.period_label.trim(),
        method: form.method,
        notes: form.notes.trim(),
      });
      toast.success("Pago registrado");
      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error("Error: " + e.message);
    }
    setSaving(false);
  };

  const handleDeletePayment = async (id) => {
    if (!confirm("¿Eliminar este pago del historial?")) return;
    try {
      await base44.entities.PremiumPayment.delete(id);
      toast.success("Pago eliminado");
      load();
    } catch (e) {
      toast.error("Error: " + e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Crown className="w-6 h-6 text-purple-500" fill="currentColor" />
          <h1 className="font-heading font-bold text-2xl text-foreground">Premium</h1>
        </div>
        <Button className="rounded-xl gap-2" onClick={() => openPaymentDialog(null)} disabled={premiumRows.length === 0}>
          <Plus className="w-4 h-4" /> Registrar pago
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Cobro manual: marca el plan de cada doctor en Doctores, y registra aquí cada pago que recibas para llevar el control de ingresos.
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={Crown} label="Doctores Premium" value={premiumDoctors.length} color="text-purple-500" />
        <KpiCard icon={DollarSign} label="Ingresos este mes" value={fmtMoney(revenueThisMonth)} color="text-emerald-600" />
        <KpiCard icon={TrendingUp} label="Ingresos totales" value={fmtMoney(totalRevenue)} color="text-blue-500" />
        <KpiCard icon={Receipt} label="Promedio por doctor" value={fmtMoney(avgPerDoctor)} color="text-orange-500" />
      </div>

      {/* Gráfica de ingresos por mes */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 mb-6">
        <h2 className="font-heading font-semibold text-sm text-foreground mb-4">Ingresos por mes (últimos 6 meses)</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              formatter={(value) => fmtMoney(value)}
              contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid hsl(var(--border))" }}
            />
            <Bar dataKey="Ingresos" fill="#a855f7" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla de doctores Premium */}
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50">
          <h2 className="font-heading font-semibold text-sm text-foreground">Doctores en plan Premium ({premiumRows.length})</h2>
        </div>
        {premiumRows.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground px-5">
            <Crown className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Todavía no hay doctores en plan Premium.</p>
            <p className="text-xs mt-1">Márcalos como Premium desde la pestaña Doctores.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {premiumRows.map((doc) => (
              <div key={doc.id}>
                <div className="flex items-center gap-4 px-5 py-4 flex-wrap">
                  {doc.profile_photo ? (
                    <img src={doc.profile_photo} alt={doc.full_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0 flex items-center justify-center text-muted-foreground text-sm font-bold">
                      {(doc.full_name || "D")[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-[160px]">
                    <p className="font-medium text-foreground truncate">{doc.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.specialty}{doc.premium_activated_at ? ` · Premium desde ${fmtDate(doc.premium_activated_at)}` : ""}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-heading font-bold text-foreground">{fmtMoney(doc.totalRevenue)}</p>
                    <p className="text-xs text-muted-foreground">Último pago: {fmtDate(doc.lastPayment)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button size="sm" variant="outline" className="rounded-lg h-8 gap-1.5" onClick={() => openPaymentDialog(doc.id)}>
                      <Plus className="w-3.5 h-3.5" /> Pago
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg h-8 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
                      onClick={() => togglePremium(doc.id, doc.full_name, "premium")}
                    >
                      Quitar Premium
                    </Button>
                    <button
                      type="button"
                      aria-label="Ver pagos"
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                      onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                    >
                      {expandedId === doc.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {expandedId === doc.id && (
                  <div className="px-5 pb-4 bg-muted/30">
                    {doc.payments.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3">Sin pagos registrados todavía.</p>
                    ) : (
                      <div className="space-y-1.5 pt-2">
                        {doc.payments.map((p) => (
                          <div key={p.id} className="flex items-center justify-between text-sm bg-card rounded-lg px-3 py-2 border border-border/40">
                            <div className="min-w-0">
                              <span className="font-medium text-foreground">{fmtMoney(p.amount)}</span>
                              <span className="text-muted-foreground"> · {fmtDate(p.payment_date)} · {METHOD_LABELS[p.method] || p.method}</span>
                              {p.period_label && <span className="text-muted-foreground"> · {p.period_label}</span>}
                              {p.notes && <p className="text-xs text-muted-foreground truncate">{p.notes}</p>}
                            </div>
                            <button
                              type="button"
                              aria-label="Eliminar pago"
                              className="p-1.5 rounded-lg hover:bg-destructive/10 flex-shrink-0"
                              onClick={() => handleDeletePayment(p.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Registrar pago Premium</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Doctor *</label>
              <select
                value={form.specialist_id}
                onChange={(e) => setForm((prev) => ({ ...prev, specialist_id: e.target.value }))}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="">Selecciona un doctor</option>
                {premiumRows.map((d) => (
                  <option key={d.id} value={d.id}>{d.full_name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Monto (MXN) *</label>
                <Input
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Fecha *</label>
                <Input
                  type="date"
                  value={form.payment_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, payment_date: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Método</label>
              <select
                value={form.method}
                onChange={(e) => setForm((prev) => ({ ...prev, method: e.target.value }))}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
              >
                {Object.entries(METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Periodo cubierto</label>
              <Input
                value={form.period_label}
                onChange={(e) => setForm((prev) => ({ ...prev, period_label: e.target.value }))}
                placeholder="Ej: Agosto 2026"
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notas</label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Opcional"
                className="rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button onClick={handleSavePayment} disabled={saving} className="rounded-xl">
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                Registrar pago
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
