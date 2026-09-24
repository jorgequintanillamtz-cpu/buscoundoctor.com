import { useEffect, useMemo, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Heart, ArrowLeft, Star, FileText, ShieldCheck, Calendar, Crown, History, Inbox, Mail, LogOut, Gift, UserRound, Settings, Search, X, BookOpen, ClipboardList } from "lucide-react";
import { AdminBadgeProvider, useAdminBadges } from "@/components/adminBadges";
import { base44 } from "@/api/base44Client";
import { SHOW_PREMIUM } from "@/lib/featureFlags";

// Agrupado por secciones (en vez de una lista plana) para que el menú se
// pueda escanear de un vistazo: Resumen primero; luego Operación, con las 4
// colas de revisión que alimentan la Bandeja de entrada juntas y en el
// mismo orden que ahí (Doctores, Verificaciones, Blog, Reseñas), Referidos
// justo después de Doctores (mismo panorama, sin cola propia de
// aprobación), seguidas de lo operativo que no es cola de aprobación
// (Solicitudes, Premium) y el Historial como bitácora al final.
//
// "Catálogo médico" y "Configuración" juntan lo que antes eran 9 enlaces
// sueltos (3 bancos de taxonomía + 6 pantallas de configuración/contenido
// que casi nunca se tocan) en 2 destinos -- cada uno abre una pantalla con
// pestañas o tarjetas (AdminCatalogoMedico.jsx / AdminConfigHub.jsx) que
// lleva a las pantallas de siempre, sin perder nada, solo sacándolas de la
// vista de reojo del día a día. Menú de 19 enlaces bajó a 12. "Guías"
// (biblioteca de PDFs, entidad Guide) se queda como enlace propio -- no es
// parte de los bancos de taxonomía (Specialty/Subspecialty/Condition) que
// comparten useTaxonomyBank, así que no entra a esas pestañas.
const adminNavSections = [
  {
    label: "Resumen",
    items: [
      { path: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "Operación",
    items: [
      { path: "/admin/bandeja", label: "Bandeja de entrada", icon: Inbox },
      { path: "/admin/doctores", label: "Doctores", icon: Users },
      { path: "/admin/registros", label: "Registros", icon: ClipboardList },
      { path: "/admin/referidos", label: "Referidos", icon: Gift },
      { path: "/admin/verificaciones", label: "Verificar documentos", icon: ShieldCheck },
      { path: "/admin/blog", label: "Blog", icon: FileText },
      { path: "/admin/resenas", label: "Reseñas", icon: Star },
      { path: "/admin/solicitudes", label: "Solicitudes de cita", icon: Calendar },
      { path: "/admin/correos", label: "Correos de pacientes", icon: Mail },
      ...(SHOW_PREMIUM ? [{ path: "/admin/premium", label: "Premium", icon: Crown }] : []),
      { path: "/admin/historial", label: "Historial", icon: History },
    ],
  },
  {
    label: "Listas médicas",
    items: [
      { path: "/admin/catalogo-medico", label: "Catálogo médico", icon: Heart },
      { path: "/admin/guias", label: "Guías", icon: BookOpen },
    ],
  },
  {
    label: "Configuración",
    items: [
      { path: "/admin/configuracion", label: "Catálogos, planes y contenido", icon: Settings },
    ],
  },
];

// Versión plana de todos los items, usada por el nav horizontal de móvil
// (ahí no caben encabezados de sección, es un solo scroll).
const adminNavItems = adminNavSections.flatMap((section) => section.items);

// Círculo rojo con el número de pendientes, junto al item del menú que
// corresponda (Doctores, Verificaciones). No se muestra si no hay nada
// pendiente.
function PendingBadge({ count }) {
  if (!count) return null;
  return (
    <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
      {count > 99 ? "99+" : count}
    </span>
  );
}

// Layout exclusivo del panel de administración (dueños de la plataforma).
// El panel de médicos vive por completo aparte, en /panel-medico.
export default function AdminLayout() {
  return (
    <AdminBadgeProvider>
      <AdminLayoutContent />
    </AdminBadgeProvider>
  );
}

function AdminLayoutContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { pendingCounts } = useAdminBadges();
  // Buscador arriba del menú (escritorio): para no tener que escanear los
  // 12 enlaces a ojo, escribe y filtra en vivo; Enter salta directo si solo
  // queda una coincidencia. Se limpia solo al cambiar de página, para que
  // la próxima vez que abras el menú se vea completo de nuevo.
  const [navFilter, setNavFilter] = useState("");
  useEffect(() => { setNavFilter(""); }, [location.pathname]);

  const filteredNavSections = useMemo(() => {
    const q = navFilter.trim().toLowerCase();
    if (!q) return adminNavSections;
    return adminNavSections
      .map((section) => ({ ...section, items: section.items.filter((item) => item.label.toLowerCase().includes(q)) }))
      .filter((section) => section.items.length > 0);
  }, [navFilter]);

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key !== "Enter") return;
    const matches = filteredNavSections.flatMap((s) => s.items);
    if (matches.length === 1) navigate(matches[0].path);
  };

  const handleLogout = () => base44.auth.logout(false).then(() => navigate("/"));

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <aside className="hidden lg:flex w-64 flex-col border-r border-border/50 bg-card min-h-screen sticky top-0">
          <div className="p-5 border-b border-border/50">
            <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
              <ArrowLeft className="w-4 h-4" />
              Volver al sitio
            </Link>
            <h2 className="font-heading font-bold text-lg text-foreground">Panel de Administración</h2>
          </div>
          <div className="px-3 pt-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground/60 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={navFilter}
                onChange={(e) => setNavFilter(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Buscar en el menú..."
                className="w-full text-sm bg-muted/60 rounded-xl pl-8 pr-7 py-2 outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
              />
              {navFilter && (
                <button type="button" onClick={() => setNavFilter("")} aria-label="Limpiar búsqueda" className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-5">
            {filteredNavSections.length === 0 && (
              <p className="px-3 text-sm text-muted-foreground">Sin resultados para "{navFilter}"</p>
            )}
            {filteredNavSections.map((section) => (
              <div key={section.label}>
                <p className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/70">
                  {section.label}
                </p>
                <div className="flex flex-col gap-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive(item)
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="flex-1">{item.label}</span>
                      <PendingBadge count={pendingCounts[item.path]} />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <div className="p-3 border-t border-border/50 space-y-0.5">
            <Link
              to="/admin/cuenta"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === "/admin/cuenta"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <UserRound className="w-4 h-4" />
              Mi cuenta
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </aside>

        <div className="flex-1 min-h-screen">
          <div className="lg:hidden sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border/50 px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowLeft className="w-4 h-4" />
                Sitio
              </Link>
              <h2 className="font-heading font-bold text-foreground">Admin</h2>
              <div className="flex items-center gap-3">
                <Link to="/admin/cuenta" aria-label="Mi cuenta" className="flex items-center text-muted-foreground">
                  <UserRound className="w-4 h-4" />
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Cerrar sesión"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
              {adminNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive(item)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                  <PendingBadge count={pendingCounts[item.path]} />
                </Link>
              ))}
            </div>
          </div>
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
