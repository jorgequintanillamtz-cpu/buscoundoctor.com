import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  Mail, Search, Download, Copy, Stethoscope, Users, Send, Heart,
} from "lucide-react";
import { usePaginatedList } from "@/api/usePaginatedList";
import Pagination from "@/components/admin/Pagination";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

// Escapa un valor para una celda CSV: si trae coma, comillas o salto de
// línea, lo envuelve en comillas y duplica las comillas internas (regla
// estándar del formato CSV).
function csvCell(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename, rows) {
  // ﻿ (BOM) al inicio: sin esto, Excel abre acentos y "ñ" como
  // caracteres corruptos porque asume Latin-1 en vez de UTF-8.
  const csv = "﻿" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Base de datos de leads para marketing/seguimiento: agrupa por correo todas
// las solicitudes de cita que sí trajeron uno (la tarjeta "Agendar cita" del
// perfil pide correo; el formulario rápido del directorio todavía pide
// teléfono y puede no traer correo). Por cada correo único se junta qué
// especialidad(es) buscó, cuántas veces escribió y cuándo fue la primera y
// última vez — así Jorge puede ver de un vistazo qué está buscando la gente
// que deja su correo, y exportarlo para contactarlos por su cuenta.
export default function AdminCorreos() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");

  useEffect(() => {
    base44.entities.AppointmentRequest.list("-created_date", 5000).then((data) => {
      setRequests(data);
      setLoading(false);
    });
  }, []);

  const leads = useMemo(() => {
    const map = new Map();
    for (const r of requests) {
      const email = (r.email || "").trim().toLowerCase();
      if (!email) continue;
      if (!map.has(email)) {
        map.set(email, {
          email,
          specialties: new Set(),
          names: new Set(),
          count: 0,
          firstDate: r.created_date,
          lastDate: r.created_date,
        });
      }
      const entry = map.get(email);
      if (r.specialty) entry.specialties.add(r.specialty);
      if (r.patient_name) entry.names.add(r.patient_name);
      entry.count += 1;
      if (new Date(r.created_date) < new Date(entry.firstDate)) entry.firstDate = r.created_date;
      if (new Date(r.created_date) > new Date(entry.lastDate)) entry.lastDate = r.created_date;
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));
  }, [requests]);

  const specialtiesPresent = useMemo(() => {
    const set = new Set();
    leads.forEach((l) => l.specialties.forEach((s) => set.add(s)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [leads]);

  const filteredLeads = useMemo(() => {
    let list = leads;
    if (specialtyFilter) list = list.filter((l) => l.specialties.has(specialtyFilter));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (l) =>
          l.email.includes(q) ||
          Array.from(l.names).some((n) => n.toLowerCase().includes(q)) ||
          Array.from(l.specialties).some((s) => s.toLowerCase().includes(q))
      );
    }
    return list;
  }, [leads, specialtyFilter, search]);

  const { pageItems: pagedLeads, page, setPage, totalPages } = usePaginatedList(filteredLeads, {
    pageSize: 30,
    resetKey: `${specialtyFilter}|${search}`,
  });

  const topSpecialty = useMemo(() => {
    const counts = new Map();
    leads.forEach((l) => l.specialties.forEach((s) => counts.set(s, (counts.get(s) || 0) + 1)));
    let best = null;
    counts.forEach((count, name) => { if (!best || count > best.count) best = { name, count }; });
    return best;
  }, [leads]);

  const copyEmail = async (email) => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success("Correo copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const exportCsv = () => {
    const rows = [
      ["Correo", "Especialidad(es) buscada(s)", "Nombre(s)", "Solicitudes", "Primera solicitud", "Última solicitud"],
      ...filteredLeads.map((l) => [
        l.email,
        Array.from(l.specialties).join(" / "),
        Array.from(l.names).join(" / "),
        l.count,
        fmtDate(l.firstDate),
        fmtDate(l.lastDate),
      ]),
    ];
    downloadCsv(`correos-buscoundoctor-${new Date().toISOString().split("T")[0]}.csv`, rows);
    toast.success(`${filteredLeads.length} correo${filteredLeads.length !== 1 ? "s" : ""} exportado${filteredLeads.length !== 1 ? "s" : ""}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-1">
        <Mail className="w-6 h-6 text-primary" />
        <h1 className="font-heading font-bold text-2xl text-foreground">Correos de pacientes</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Todos los correos que dejaron pacientes al solicitar una cita, agrupados por persona, con la especialidad que buscaban. Útil para armar campañas o dar seguimiento por tu cuenta.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-heading font-bold text-foreground">{leads.length}</p>
            <p className="text-xs text-muted-foreground">Correos únicos</p>
          </div>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
            <Send className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-heading font-bold text-foreground">{requests.filter((r) => r.email).length}</p>
            <p className="text-xs text-muted-foreground">Solicitudes con correo</p>
          </div>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Heart className="w-5 h-5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-heading font-bold text-foreground truncate">{topSpecialty?.name || "—"}</p>
            <p className="text-xs text-muted-foreground">Especialidad más buscada</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border/50 rounded-2xl p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-muted/50 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por correo, nombre o especialidad..."
            className="bg-transparent text-sm outline-none flex-1"
          />
        </div>
        <select
          value={specialtyFilter}
          onChange={(e) => setSpecialtyFilter(e.target.value)}
          className="text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Todas las especialidades</option>
          {specialtiesPresent.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button
          type="button"
          onClick={exportCsv}
          disabled={filteredLeads.length === 0}
          className="inline-flex items-center gap-1.5 text-sm font-medium bg-brand-navy text-white rounded-xl px-3.5 py-2 hover:bg-brand-navy/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Exportar CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
        {filteredLeads.length === 0 ? (
          <div className="text-center py-20">
            <Mail className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              {leads.length === 0 ? "Todavía no hay correos registrados" : "Sin resultados para los filtros aplicados"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border/50">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Correo</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Especialidad(es) buscada(s)</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre(s)</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Solicitudes</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Última vez</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {pagedLeads.map((l) => (
                  <tr key={l.email} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <a href={`mailto:${l.email}`} className="font-medium text-foreground hover:text-primary hover:underline">
                          {l.email}
                        </a>
                        <button
                          type="button"
                          onClick={() => copyEmail(l.email)}
                          aria-label="Copiar correo"
                          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {Array.from(l.specialties).length > 0 ? (
                          Array.from(l.specialties).map((s) => (
                            <span key={s} className="text-xs font-medium text-primary bg-accent px-2 py-0.5 rounded-full">{s}</span>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">{Array.from(l.names).join(", ") || "—"}</td>
                    <td className="px-4 py-3.5 text-foreground font-medium">{l.count}</td>
                    <td className="px-4 py-3.5 text-muted-foreground text-xs">{fmtDate(l.lastDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={filteredLeads.length} pageSize={30} />
    </div>
  );
}
