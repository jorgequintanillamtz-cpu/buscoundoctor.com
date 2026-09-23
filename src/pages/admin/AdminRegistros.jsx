import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ClipboardList, Search, Eye, CheckCircle2, AlertTriangle, Stethoscope } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePaginatedList } from "@/api/usePaginatedList";
import Pagination from "@/components/admin/Pagination";

const STEP_LABELS = { datos: "Datos", ubicacion: "Ubicación", fotos: "Fotos" };
const STEP_ORDER = ["datos", "ubicacion", "fotos"];

const RANGE_OPTIONS = [
  { key: "todo", label: "Todo" },
  { key: "7", label: "Últimos 7 días" },
  { key: "30", label: "Últimos 30 días" },
  { key: "90", label: "Últimos 90 días" },
];

function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function EstadoBadge({ r }) {
  if (r.owner_user_id) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5" /> Completado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full whitespace-nowrap">
      <AlertTriangle className="w-3.5 h-3.5" /> Abandonado en "{STEP_LABELS[r.registration_step] || r.registration_step}"
    </span>
  );
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="py-2 border-b border-border/40 last:border-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground font-medium break-words">{value}</p>
    </div>
  );
}

const RECOVERY_EMAIL_FIELDS = [
  { key: "recovery_email_1_sent_at", label: "Correo 1 (30 min después de empezar)" },
  { key: "recovery_email_2_sent_at", label: "Correo 2 (24h después del 1°)" },
  { key: "recovery_email_3_sent_at", label: "Correo 3 (4 días después del 2°)" },
];

// Estado de los 3 correos de recuperación de registro (ver CLAUDE.md §8g):
// si ya se mandó y cuándo, o si todavía no le toca. No hay forma de saber
// si el doctor lo abrió -- Resend sí puede avisar eso, pero necesita
// habilitarlo en la cuenta de Resend y un webhook nuevo que reciba el
// aviso; queda pendiente, es un cambio aparte.
function RecoveryEmailsStatus({ r }) {
  return (
    <div className="mb-4 bg-muted/40 rounded-xl p-3 space-y-2">
      <p className="text-xs font-semibold text-foreground">Correos de recuperación</p>
      {RECOVERY_EMAIL_FIELDS.map((f) => (
        <div key={f.key} className="flex items-center justify-between gap-3 text-xs">
          <span className="text-muted-foreground">{f.label}</span>
          {r[f.key] ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> Enviado {fmtDateTime(r[f.key])}
            </span>
          ) : (
            <span className="text-muted-foreground whitespace-nowrap">No enviado todavía</span>
          )}
        </div>
      ))}
    </div>
  );
}

// Todos los intentos de autoregistro público (/registro-medico), terminados
// o no. Se aíslan del resto de `specialist` por registration_step -- lo
// escribe save_registration_draft en cada paso del wizard, antes incluso de
// tener cuenta; un doctor creado por otro camino (ej. el editor del admin)
// nunca toca esa columna. La intención de fondo (Jorge, 2026-09-23): usar el
// correo capturado desde el paso 1 para, más adelante, armar una serie de
// correos que intente recuperar a quien no terminó -- esta pantalla es
// donde se ve a quién le tocaría.
export default function AdminRegistros() {
  const [specialists, setSpecialists] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState(""); // "" | "completado" | "abandonado"
  const [stepFilter, setStepFilter] = useState("");
  const [rangeFilter, setRangeFilter] = useState("todo");
  const [detail, setDetail] = useState(null);
  const [pageSize, setPageSize] = useState(30);

  useEffect(() => {
    Promise.all([
      base44.entities.Specialist.list("-created_date", 2000),
      base44.entities.SpecialistService.list("-created_date", 2000).catch(() => []),
    ]).then(([specs, svcs]) => {
      setSpecialists(specs.filter((s) => s.registration_step));
      setServices(svcs);
      setLoading(false);
    });
  }, []);

  const priceFor = (specialistId) => {
    const svc = services.find((s) => s.specialist_id === specialistId && s.name === "Consulta de primera vez");
    return svc?.price ? `$${Number(svc.price).toLocaleString("es-MX")} MXN` : "";
  };

  const filtered = useMemo(() => {
    let list = specialists;
    if (estadoFilter === "completado") list = list.filter((s) => s.owner_user_id);
    if (estadoFilter === "abandonado") list = list.filter((s) => !s.owner_user_id);
    if (stepFilter) list = list.filter((s) => s.registration_step === stepFilter);
    if (rangeFilter !== "todo") {
      const since = new Date();
      since.setDate(since.getDate() - Number(rangeFilter));
      list = list.filter((s) => s.created_date && new Date(s.created_date) >= since);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          (s.full_name || "").toLowerCase().includes(q) ||
          (s.email || "").toLowerCase().includes(q) ||
          (s.whatsapp || "").toLowerCase().includes(q) ||
          (s.specialty || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [specialists, estadoFilter, stepFilter, rangeFilter, search]);

  const { pageItems: paged, page, setPage, totalPages } = usePaginatedList(filtered, {
    pageSize,
    resetKey: `${estadoFilter}|${stepFilter}|${rangeFilter}|${search}|${pageSize}`,
  });

  const counts = useMemo(() => ({
    total: specialists.length,
    completados: specialists.filter((s) => s.owner_user_id).length,
    abandonados: specialists.filter((s) => !s.owner_user_id).length,
  }), [specialists]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center gap-3 mb-1">
        <ClipboardList className="w-6 h-6 text-primary" />
        <h1 className="font-heading font-bold text-2xl text-foreground">Registros</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Todos los que han empezado a registrarse en <code className="text-xs">/registro-medico</code>, terminaron o no, con lo que alcanzaron a llenar y en qué paso se quedaron.
      </p>

      <div className="grid grid-cols-3 gap-2.5 mb-5 max-w-md">
        <div className="bg-card border border-border/50 rounded-2xl p-3.5">
          <p className="text-2xl font-heading font-bold text-foreground">{counts.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-3.5">
          <p className="text-2xl font-heading font-bold text-emerald-600">{counts.completados}</p>
          <p className="text-xs text-muted-foreground">Completados</p>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-3.5">
          <p className="text-2xl font-heading font-bold text-amber-600">{counts.abandonados}</p>
          <p className="text-xs text-muted-foreground">Abandonados</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, correo, WhatsApp..." className="rounded-xl pl-9" />
        </div>
        <select value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
          <option value="">Todos los estados</option>
          <option value="completado">Solo completados</option>
          <option value="abandonado">Solo abandonados</option>
        </select>
        <select value={stepFilter} onChange={(e) => setStepFilter(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
          <option value="">Cualquier último paso</option>
          {STEP_ORDER.map((s) => <option key={s} value={s}>Último paso: {STEP_LABELS[s]}</option>)}
        </select>
        <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="h-10 rounded-xl border border-input bg-background px-3 text-sm" aria-label="Registros por página">
          <option value={30}>30 por página</option>
          <option value={50}>50 por página</option>
          <option value={100}>100 por página</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-5">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setRangeFilter(opt.key)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              rangeFilter === opt.key ? "bg-brand-navy text-white" : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              {specialists.length === 0 ? "Todavía no hay ningún intento de registro." : "Nada coincide con el filtro."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border/50">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Correo</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Especialidad</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Empezó</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {paged.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => setDetail(r)}
                        className="font-medium text-brand-blue hover:underline text-left"
                        title="Ver toda la información"
                      >
                        {r.full_name || "—"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.email || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.specialty || "—"}</td>
                    <td className="px-4 py-3"><EstadoBadge r={r} /></td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtDateTime(r.created_date)}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => setDetail(r)} aria-label="Ver detalle" className="p-1.5 rounded-lg hover:bg-muted">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={filtered.length} pageSize={pageSize} />

      <Dialog open={!!detail} onOpenChange={(open) => { if (!open) setDetail(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.full_name || "Sin nombre"}</DialogTitle>
              </DialogHeader>
              <div className="mb-3"><EstadoBadge r={detail} /></div>
              <RecoveryEmailsStatus r={detail} />
              <div className="space-y-0">
                <DetailRow label="Correo" value={detail.email} />
                <DetailRow label="WhatsApp" value={detail.whatsapp} />
                <DetailRow label="Especialidad" value={detail.specialty} />
                <DetailRow label="Subespecialidad (texto libre, legado)" value={detail.subspecialty} />
                <DetailRow label="Subespecialidades elegidas del banco" value={detail.subspecialties_relation?.length ? `${detail.subspecialties_relation.length} elegidas` : ""} />
                <DetailRow label="Cédula profesional" value={detail.professional_license_number} />
                <DetailRow label="Años de experiencia" value={detail.years_experience} />
                <DetailRow label="Precio de consulta de primera vez" value={priceFor(detail.id)} />
                <DetailRow label="Modalidad" value={detail.modality} />
                <DetailRow label="Ciudad / zona" value={detail.zone} />
                <DetailRow label="Dirección capturada" value={detail.address} />
                <DetailRow label="Foto de perfil" value={detail.profile_photo ? "Sí subió" : ""} />
                <DetailRow label="Fotos de galería" value={detail.gallery?.length ? `${detail.gallery.length} fotos` : ""} />
                <DetailRow label="Invitado por (solo si completó)" value={detail.referred_by_id ? "Sí, con código de invitación" : ""} />
                <DetailRow label="Último paso guardado" value={STEP_LABELS[detail.registration_step] || detail.registration_step} />
                <DetailRow label="Empezó el registro" value={fmtDateTime(detail.created_date)} />
              </div>
              {detail.profile_photo && (
                <img src={detail.profile_photo} alt="" className="w-20 h-20 rounded-xl object-cover mt-3" />
              )}
              {detail.owner_user_id && (
                <Link to={`/admin/doctores/editar/${detail.id}`} className="inline-block mt-4 text-sm font-medium text-brand-blue hover:underline">
                  Ver su perfil completo en Doctores →
                </Link>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
