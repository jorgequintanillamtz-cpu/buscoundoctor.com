import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Gift, Loader2, Users, CheckCircle2, Clock, Trophy, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAdminBadges } from "@/components/adminBadges";
import { formatDateOnly } from "@/lib/dateLabels";

function KpiCard({ label, value, tone = "navy" }) {
  const bg = tone === "navy" ? "bg-brand-navy" : "bg-brand-blue";
  return (
    <div className={`rounded-xl p-3.5 ${bg}`}>
      <p className="text-sm font-semibold text-white/90 mb-1">{label}</p>
      <p className="font-heading font-extrabold text-3xl text-white leading-tight">{value}</p>
    </div>
  );
}

// Panorama completo del programa de referidos ("invita a un colega"): quién
// ha invitado más, cuánto se ha acreditado, y todos los invitados con su
// estado. A diferencia de "Invita a un colega" del propio doctor
// (ShareProfile.jsx), aquí el admin ya ve todo (RLS lo deja, is_admin()), no
// hace falta la RPC list_my_referrals.
export default function AdminReferidos() {
  const { refresh: refreshBadges } = useAdminBadges();
  const [specialists, setSpecialists] = useState([]);
  const [premiumPrice, setPremiumPrice] = useState(1999);
  const [loading, setLoading] = useState(true);
  const [creditingId, setCreditingId] = useState(null);

  const load = async () => {
    const [specs, plans] = await Promise.all([
      base44.entities.Specialist.list(),
      base44.entities.Plan.filter({ slug: "premium" }).catch(() => []),
    ]);
    setSpecialists(specs.filter((s) => !s.deleted_at));
    if (plans[0]?.price_monthly) setPremiumPrice(Number(plans[0].price_monthly));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const specialistsById = useMemo(() => Object.fromEntries(specialists.map((s) => [s.id, s])), [specialists]);

  const referred = useMemo(() => specialists.filter((s) => s.referred_by_id), [specialists]);
  const rewarded = useMemo(() => referred.filter((s) => s.referral_rewarded_at), [referred]);
  const awaitingReward = useMemo(
    () => referred.filter((s) => !s.referral_rewarded_at && s.publication_status === "published" && s.active),
    [referred]
  );

  // Ranking de quién ha invitado más -- solo cuenta a médicos que SÍ tienen
  // al menos un referido, ordenado por total invitado.
  const leaderboard = useMemo(() => {
    const byReferrer = {};
    referred.forEach((s) => {
      const id = s.referred_by_id;
      if (!byReferrer[id]) byReferrer[id] = { id, invited: 0, rewarded: 0 };
      byReferrer[id].invited += 1;
      if (s.referral_rewarded_at) byReferrer[id].rewarded += 1;
    });
    return Object.values(byReferrer)
      .map((row) => ({ ...row, referrer: specialistsById[row.id] }))
      .filter((row) => row.referrer)
      .sort((a, b) => b.invited - a.invited)
      .slice(0, 10);
  }, [referred, specialistsById]);

  const credit = async (specialistId) => {
    setCreditingId(specialistId);
    try {
      await base44.functions.invoke("creditReferralReward", { specialist_id: specialistId });
      toast.success("Mes de Premium acreditado");
      await load();
      refreshBadges();
    } catch (e) {
      toast.error("No se pudo acreditar: " + e.message);
    }
    setCreditingId(null);
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
      <div className="flex items-center gap-3 mb-1">
        <Gift className="w-6 h-6 text-primary" />
        <h1 className="font-heading font-bold text-2xl text-foreground">Referidos</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        El programa "invita a un colega": quién ha invitado, a quién, y cuánto se ha acreditado. El premio nunca se
        da solo — se acredita aquí o desde la Bandeja / la pantalla de revisión de cada doctor.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-8">
        <KpiCard label="Invitaciones totales" value={referred.length} tone="navy" />
        <KpiCard label="Premios acreditados" value={rewarded.length} tone="blue" />
        <KpiCard label="Esperando acreditar" value={awaitingReward.length} tone="navy" />
        <KpiCard label="Valor acreditado" value={`$${(rewarded.length * premiumPrice).toLocaleString("es-MX")}`} tone="blue" />
      </div>

      {referred.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-2xl p-10 text-center">
          <Gift className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium text-foreground">Todavía nadie ha invitado a un colega con su código.</p>
        </div>
      ) : (
        <>
          {leaderboard.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-heading font-semibold text-sm text-foreground">Quién ha invitado más</h2>
              </div>
              <div className="bg-card border border-border/50 rounded-2xl divide-y divide-border/50 max-w-2xl">
                {leaderboard.map((row) => (
                  <div key={row.id} className="flex items-center gap-3 p-3.5">
                    <div className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center flex-shrink-0 text-violet-700 text-xs font-bold">
                      {(row.referrer.full_name || "D")[0]}
                    </div>
                    <Link to={`/admin/doctores/revisar/${row.referrer.id}`} className="flex-1 min-w-0 text-sm font-medium text-foreground hover:text-primary truncate">
                      {row.referrer.full_name}
                    </Link>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{row.invited} invitado{row.invited !== 1 ? "s" : ""}</span>
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">{row.rewarded} premiado{row.rewarded !== 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-heading font-semibold text-sm text-foreground">Todos los referidos ({referred.length})</h2>
            </div>
            <div className="space-y-3 max-w-2xl">
              {referred
                .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                .map((doc) => {
                  const referrer = specialistsById[doc.referred_by_id];
                  const isVisible = doc.publication_status === "published" && doc.active;
                  return (
                    <div key={doc.id} className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-3 flex-wrap">
                      <div className="flex-1 min-w-[220px]">
                        <Link to={`/admin/doctores/revisar/${doc.id}`} className="text-sm font-semibold text-foreground hover:text-primary">
                          {doc.full_name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Invitado por <span className="font-medium text-foreground">{referrer?.full_name || "—"}</span>
                          {" · "}{formatDateOnly(doc.created_date)}
                        </p>
                      </div>
                      {doc.referral_rewarded_at ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full flex-shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Premio acreditado
                        </span>
                      ) : isVisible ? (
                        <Button size="sm" className="rounded-xl gap-1.5 flex-shrink-0" disabled={creditingId === doc.id} onClick={() => credit(doc.id)}>
                          {creditingId === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gift className="w-3.5 h-3.5" />}
                          Acreditar
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full flex-shrink-0">
                          <Clock className="w-3.5 h-3.5" /> Aún en revisión
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
