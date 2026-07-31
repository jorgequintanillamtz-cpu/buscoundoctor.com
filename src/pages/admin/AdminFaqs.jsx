import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Filter, HelpCircle, CheckCircle, Clock, FileText, Trash2, Edit, Zap, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import FaqGeneratorModal from "@/components/admin/FaqGeneratorModal";
import FaqBulkModal from "@/components/admin/FaqBulkModal";

const STATUS_CONFIG = {
  borrador: { label: "Borrador", className: "bg-amber-100 text-amber-700" },
  publicado: { label: "Publicado", className: "bg-green-100 text-green-700" },
  programado: { label: "Programado", className: "bg-blue-100 text-blue-700" },
};

const CIUDADES = [
  "Monterrey", "San Pedro Garza García", "San Nicolás de los Garza",
  "Guadalupe", "Apodaca", "Escobedo", "Santa Catarina",
];

export default function AdminFaqs() {
  const [pages, setPages] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEspecialidad, setFilterEspecialidad] = useState("");
  const [filterCiudad, setFilterCiudad] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const loadPages = async () => {
    setLoading(true);
    const data = await base44.entities.FaqPage.list("-updated_date", 200);
    setPages(data);
    setLoading(false);
  };

  useEffect(() => { loadPages(); }, []);
  useEffect(() => {
    base44.entities.Specialty.filter({ active: true }).then((list) => {
      setEspecialidades(list.map((s) => s.name).sort((a, b) => a.localeCompare(b, "es")));
    }).catch(() => {});
  }, []);


  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta página de FAQs y todas sus preguntas?")) return;
    setDeleting(id);
    const items = await base44.entities.FaqItem.filter({ faq_page_id: id });
    await Promise.all(items.map(i => base44.entities.FaqItem.delete(i.id)));
    await base44.entities.FaqPage.delete(id);
    toast.success("Página eliminada");
    setDeleting(null);
    loadPages();
  };

  const handleToggleStatus = async (page) => {
    const newStatus = page.status === "publicado" ? "borrador" : "publicado";
    await base44.entities.FaqPage.update(page.id, { status: newStatus });
    toast.success(newStatus === "publicado" ? "Publicado" : "Movido a borrador");
    loadPages();
  };

  const filtered = pages.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !search || p.specialty?.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q) || p.title?.toLowerCase().includes(q);
    const matchEsp = !filterEspecialidad || p.specialty === filterEspecialidad;
    const matchCity = !filterCiudad || p.city === filterCiudad;
    const matchStatus = !filterEstado || p.status === filterEstado;
    return matchSearch && matchEsp && matchCity && matchStatus;
  });

  const totalFaqs = pages.reduce((s, p) => s + (p.faq_count || 0), 0);
  const published = pages.filter(p => p.status === "publicado").length;

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">FAQs SEO</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pages.length} páginas · {totalFaqs} preguntas · {published} publicadas
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowBulkModal(true)} className="rounded-xl gap-2">
            <Zap className="w-4 h-4" />
            Generación Masiva
          </Button>
          <Button onClick={() => setShowModal(true)} className="rounded-xl gap-2">
            <Plus className="w-4 h-4" />
            Crear FAQs
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Páginas totales", value: pages.length, icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "FAQs generadas", value: totalFaqs, icon: HelpCircle, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Publicadas", value: published, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
          { label: "Borradores", value: pages.filter(p => p.status === "borrador").length, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border/50 rounded-2xl p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-muted/50 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por especialidad o ciudad..."
            className="bg-transparent text-sm outline-none flex-1"
          />
        </div>
        <select value={filterEspecialidad} onChange={e => setFilterEspecialidad(e.target.value)}
          className="text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="">Todas las especialidades</option>
          {especialidades.map(e => <option key={e}>{e}</option>)}
        </select>
        <select value={filterCiudad} onChange={e => setFilterCiudad(e.target.value)}
          className="text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="">Todas las ciudades</option>
          {CIUDADES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
          className="text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="publicado">Publicado</option>
          <option value="programado">Programado</option>
        </select>
        {(filterEspecialidad || filterCiudad || filterEstado || search) && (
          <button onClick={() => { setFilterEspecialidad(""); setFilterCiudad(""); setFilterEstado(""); setSearch(""); }}
            className="text-xs text-muted-foreground hover:text-foreground underline">
            Limpiar
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <HelpCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              {pages.length === 0 ? "No hay FAQs aún" : "Sin resultados para los filtros aplicados"}
            </p>
            {pages.length === 0 && (
              <Button onClick={() => setShowModal(true)} className="mt-4 rounded-xl gap-2">
                <Plus className="w-4 h-4" /> Crear primera FAQ
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border/50">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Especialidad</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ciudad</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">FAQs</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actualizado</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filtered.map(page => {
                  const cfg = STATUS_CONFIG[page.status] || STATUS_CONFIG.borrador;
                  return (
                    <tr key={page.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-foreground">{page.specialty}</span>
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">/faq/{page.slug}</p>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">{page.city}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 text-foreground font-medium">
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                          {page.faq_count || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => handleToggleStatus(page)}
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className} hover:opacity-80 transition-opacity`}
                        >
                          {cfg.label}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs">
                        {page.updated_date ? new Date(page.updated_date).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/admin/faqs/editar/${page.id}`}>
                            <Button variant="ghost" size="icon" aria-label="Editar FAQ" className="h-8 w-8 rounded-lg">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost" size="icon"
                            aria-label="Eliminar FAQ"
                            className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                            onClick={() => handleDelete(page.id)}
                            disabled={deleting === page.id}
                          >
                            {deleting === page.id
                              ? <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                              : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <FaqGeneratorModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); loadPages(); }} />
      )}
      {showBulkModal && (
        <FaqBulkModal onClose={() => setShowBulkModal(false)} onSuccess={() => { setShowBulkModal(false); loadPages(); }} />
      )}
    </div>
  );
}