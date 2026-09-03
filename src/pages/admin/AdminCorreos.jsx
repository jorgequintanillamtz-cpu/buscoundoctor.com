import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  Mail, Search, Download, Copy, Stethoscope, Users, MapPin, Heart, Send, CheckCircle2, XCircle,
} from "lucide-react";
import { usePaginatedList } from "@/api/usePaginatedList";
import Pagination from "@/components/admin/Pagination";

// Etiquetas en español para cada "type" de EmailLog — se usan tanto en la
// tabla de "Correos enviados" como en su filtro por tipo.
const EMAIL_TYPE_LABELS = {
  bienvenida_doctor: "Bienvenida a doctor",
  perfil_aprobado: "Perfil aprobado",
  perfil_rechazado: "Perfil rechazado",
  documento_aprobado: "Documento aprobado",
  documento_rechazado: "Documento rechazado",
  articulo_aprobado: "Artículo aprobado",
  articulo_rechazado: "Artículo rechazado",
  nueva_solicitud_cita: "Nueva solicitud de cita",
  contacto_publico: "Formulario de contacto",
  nuevo_registro_doctor_admin: "Aviso: nuevo registro de doctor",
  prueba: "Prueba",
};

function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

const SEXO_LABELS = { masculino: "Masculino", femenino: "Femenino" };

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

// Base de datos de pacientes para publicidad segmentada / seguimiento: una
// fila por cada solicitud de cita que sí trajo correo (la tarjeta "Agendar
// cita" del perfil lo pide; el formulario rápido del directorio no siempre).
// El sexo NO lo llena el paciente — es un dato que Jorge agrega a mano desde
// aquí mismo (por eso está protegido por RLS admin-only en el schema), útil
// para armar campañas dirigidas junto con la edad, la ciudad y la
// especialidad que cada quien buscaba.
export default function AdminCorreos() {
  const [view, setView] = useState("pacientes"); // pacientes | enviados

  return (
    <div className="max-w-6xl">
      <div className="flex items-center gap-3 mb-1">
        <Mail className="w-6 h-6 text-primary" />
        <h1 className="font-heading font-bold text-2xl text-foreground">Correos</h1>
      </div>
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setView("pacientes")}
          className={`text-sm font-medium rounded-xl px-3.5 py-1.5 transition-colors ${view === "pacientes" ? "bg-brand-navy text-white" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`}
        >
          Correos de pacientes
        </button>
        <button
          type="button"
          onClick={() => setView("enviados")}
          className={`text-sm font-medium rounded-xl px-3.5 py-1.5 transition-colors ${view === "enviados" ? "bg-brand-navy text-white" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`}
        >
          Correos enviados
        </button>
      </div>
      {view === "pacientes" ? <PatientEmailsPanel /> : <SentEmailsPanel />}
    </div>
  );
}

// Base de datos de pacientes para publicidad segmentada / seguimiento (vista
// original de esta página, ahora como un tab entre otros). Una fila por cada
// solicitud de cita que sí trajo correo.
function PatientEmailsPanel() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    base44.entities.AppointmentRequest.list("-created_date", 5000).then((data) => {
      setRequests(data.filter((r) => (r.email || "").trim()));
      setLoading(false);
    });
  }, []);

  const specialtiesPresent = useMemo(() => {
    const set = new Set(requests.map((r) => r.specialty).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [requests]);

  const citiesPresent = useMemo(() => {
    const set = new Set(requests.map((r) => r.city).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [requests]);

  const uniqueEmails = useMemo(() => new Set(requests.map((r) => (r.email || "").trim().toLowerCase())).size, [requests]);

  const topSpecialty = useMemo(() => {
    const counts = new Map();
    requests.forEach((r) => { if (r.specialty) counts.set(r.specialty, (counts.get(r.specialty) || 0) + 1); });
    let best = null;
    counts.forEach((count, name) => { if (!best || count > best.count) best = { name, count }; });
    return best;
  }, [requests]);

  const filtered = useMemo(() => {
    let list = requests;
    if (specialtyFilter) list = list.filter((r) => r.specialty === specialtyFilter);
    if (cityFilter) list = list.filter((r) => r.city === cityFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          (r.email || "").toLowerCase().includes(q) ||
          (r.patient_name || "").toLowerCase().includes(q) ||
          (r.specialty || "").toLowerCase().includes(q) ||
          (r.city || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [requests, specialtyFilter, cityFilter, search]);

  const { pageItems: pagedRequests, page, setPage, totalPages } = usePaginatedList(filtered, {
    pageSize: 30,
    resetKey: `${specialtyFilter}|${cityFilter}|${search}`,
  });

  const copyEmail = async (email) => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success("Correo copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const updateSexo = async (req, value) => {
    setSavingId(req.id);
    try {
      await base44.entities.AppointmentRequest.update(req.id, { sexo: value });
      setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, sexo: value } : r)));
    } catch {
      toast.error("No se pudo guardar");
    }
    setSavingId(null);
  };

  const exportCsv = () => {
    const rows = [
      ["Nombre del paciente", "Edad", "Especialidad buscada", "Ciudad", "Sexo", "Correo", "Fecha de subida"],
      ...filtered.map((r) => [
        r.patient_name || "",
        r.age || "",
        r.specialty || "",
        r.city || "",
        SEXO_LABELS[r.sexo] || "",
        r.email,
        fmtDate(r.created_date),
      ]),
    ];
    downloadCsv(`correos-buscoundoctor-${new Date().toISOString().split("T")[0]}.csv`, rows);
    toast.success(`${filtered.length} registro${filtered.length !== 1 ? "s" : ""} exportado${filtered.length !== 1 ? "s" : ""}`);
  };

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
        <Mail className="w-6 h-6 text-primary" />
        <h1 className="font-heading font-bold text-2xl text-foreground">Correos de pacientes</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Cada solicitud de cita que dejó un correo: nombre, edad, especialidad y ciudad que buscaba. El sexo lo llenas tú manualmente aquí — nadie más lo edita. Útil para campañas segmentadas o seguimiento por tu cuenta.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-heading font-bold text-foreground">{requests.length}</p>
            <p className="text-xs text-muted-foreground">Solicitudes con correo</p>
          </div>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-heading font-bold text-foreground">{uniqueEmails}</p>
            <p className="text-xs text-muted-foreground">Correos únicos</p>
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
            placeholder="Buscar por nombre, correo, especialidad o ciudad..."
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
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Todas las ciudades</option>
          {citiesPresent.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button
          type="button"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-1.5 text-sm font-medium bg-brand-navy text-white rounded-xl px-3.5 py-2 hover:bg-brand-navy/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Exportar CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Mail className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              {requests.length === 0 ? "Todavía no hay correos registrados" : "Sin resultados para los filtros aplicados"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border/50">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Paciente</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Edad</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Especialidad buscada</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ciudad</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sexo</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Correo</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Fecha de subida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {pagedRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-foreground whitespace-nowrap">{r.patient_name || "—"}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{r.age || "—"}</td>
                    <td className="px-4 py-3.5">
                      {r.specialty ? (
                        <span className="text-xs font-medium text-primary bg-accent px-2 py-0.5 rounded-full whitespace-nowrap">{r.specialty}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                      {r.city ? (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3 flex-shrink-0" /> {r.city}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <select
                        value={r.sexo || ""}
                        onChange={(e) => updateSexo(r, e.target.value)}
                        disabled={savingId === r.id}
                        className="text-xs border border-input rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                      >
                        <option value="">Sin dato</option>
                        <option value="masculino">Masculino</option>
                        <option value="femenino">Femenino</option>
                      </select>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <a href={`mailto:${r.email}`} className="text-foreground hover:text-primary hover:underline">
                          {r.email}
                        </a>
                        <button
                          type="button"
                          onClick={() => copyEmail(r.email)}
                          aria-label="Copiar correo"
                          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs whitespace-nowrap">{fmtDate(r.created_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={filtered.length} pageSize={30} />
    </div>
  );
}
