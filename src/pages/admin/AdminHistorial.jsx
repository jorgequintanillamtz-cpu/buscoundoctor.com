import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { History, Search, Stethoscope } from "lucide-react";
import { ACTIVITY_TYPE_LABELS, ACTIVITY_POSITIVE, ACTIVITY_NEGATIVE } from "@/api/activityLog";
import { usePaginatedList } from "@/api/usePaginatedList";
import Pagination from "@/components/admin/Pagination";

function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-MX", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// Verde para movimientos positivos (activar, aprobar, registrar pago), rojo
// para los negativos (desactivar, rechazar, eliminar), azul de marca para
// los neutros (ajustes de monto/día de cobro).
function toneFor(type) {
  if (ACTIVITY_POSITIVE.has(type)) return { dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" };
  if (ACTIVITY_NEGATIVE.has(type)) return { dot: "bg-red-500", badge: "bg-red-100 text-red-700" };
  return { dot: "bg-brand-blue", badge: "bg-brand-bluePale text-brand-navy" };
}

// Bitácora de todo lo que pasa en el admin: cambios de plan Premium, pruebas,
// pagos, activar/desactivar perfiles, aprobaciones y rechazos de doctores,
// documentos y reseñas. Cada página relevante registra sus movimientos vía
// src/api/activityLog.js; aquí solo se listan y se pueden filtrar por tipo.
// Rango de fecha rápido: "todo" no filtra nada, los demás son días hacia
// atrás desde ahora.
const RANGE_OPTIONS = [
  { key: "todo", label: "Todo" },
  { key: "7", label: "Últimos 7 días" },
  { key: "30", label: "Últimos 30 días" },
  { key: "90", label: "Últimos 90 días" },
];

export default function AdminHistorial() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [rangeFilter, setRangeFilter] = useState("todo");
  const [search, setSearch] = useState("");

  useEffect(() => {
    base44.entities.ActivityLog.list("-created_date", 1000).then((data) => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  const typesPresent = useMemo(() => {
    const set = new Set(logs.map((l) => l.type).filter(Boolean));
    return Array.from(set).sort((a, b) =>
      (ACTIVITY_TYPE_LABELS[a] || a).localeCompare(ACTIVITY_TYPE_LABELS[b] || b, "es")
    );
  }, [logs]);

  const filteredLogs = useMemo(() => {
    let list = logs;
    if (typeFilter) list = list.filter((l) => l.type === typeFilter);
    if (rangeFilter !== "todo") {
      const since = new Date();
      since.setDate(since.getDate() - Number(rangeFilter));
      list = list.filter((l) => l.created_date && new Date(l.created_date) >= since);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (l) =>
          (l.specialist_name || "").toLowerCase().includes(q) ||
          (l.description || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [logs, typeFilter, rangeFilter, search]);

  const { pageItems: pagedLogs, page, setPage, totalPages } = usePaginatedList(filteredLogs, {
    pageSize: 30,
    resetKey: `${typeFilter}|${rangeFilter}|${search}`,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-1">
        <History className="w-6 h-6 text-primary" />
        <h1 className="font-heading font-bold text-2xl text-foreground">Historial</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Cada movimiento importante que ha pasado en el admin: cambios de plan, pagos, aprobaciones, activaciones y más.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por doctor o descripción..."
            className="rounded-xl pl-9"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos los tipos de movimiento</option>
          {typesPresent.map((t) => (
            <option key={t} value={t}>{ACTIVITY_TYPE_LABELS[t] || t}</option>
          ))}
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

      {filteredLogs.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-2xl p-8 text-center text-muted-foreground">
          {logs.length === 0 ? "Todavía no hay movimientos registrados." : "Ningún movimiento coincide con el filtro."}
        </div>
      ) : (
        <div className="bg-card border border-border/50 rounded-2xl divide-y divide-border/50 overflow-hidden">
          {pagedLogs.map((log) => {
            const tone = toneFor(log.type);
            return (
              <div key={log.id} className="flex items-start gap-3 px-4 py-3.5">
                <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${tone.dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${tone.badge}`}>
                      {ACTIVITY_TYPE_LABELS[log.type] || log.type}
                    </span>
                    <span className="text-xs text-muted-foreground">{fmtDateTime(log.created_date)}</span>
                    {log.specialist_name && (
                      <button
                        type="button"
                        onClick={() => setSearch(log.specialist_name)}
                        className="text-xs font-medium text-brand-blue hover:underline"
                        title={`Ver solo los movimientos de ${log.specialist_name}`}
                      >
                        {log.specialist_name}
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-foreground">{log.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={filteredLogs.length} pageSize={30} />
    </div>
  );
}
