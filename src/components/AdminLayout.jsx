import { useEffect, useMemo, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Heart, Star, FileText, ShieldCheck, Calendar, Crown, History, Inbox, Mail, LogOut, Gift, UserRound, Settings, Search, X, BookOpen, ClipboardList, Menu } from "lucide-react";
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

  // Cajón del menú en celular. Se cierra solo al cambiar de pantalla o con
  // Escape, y mientras está abierto la página de atrás no se desplaza.
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [menuOpen]);
  // Total de pendientes para el puntito rojo del botón ☰ (así se ve que hay
  // algo por atender sin tener que abrir el menú).
  const totalPending = Object.values(pendingCounts || {}).reduce((a, n) => a + (Number(n) || 0), 0);

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

  // Contenido del menú: el mismo en el escritorio (barra lateral fija) y en el
  // celular (cajón que se abre con el botón ☰), para tener una sola lista que
  // mantener. `onNavigate` cierra el cajón al elegir una opción.
  const sidebarContent = (onNavigate) => (
    <>
            <div className="p-5 border-b border-border/50">
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
                        onClick={onNavigate}
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
                onClick={onNavigate}
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
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <aside className="hidden lg:flex w-64 flex-col border-r border-border/50 bg-card min-h-screen sticky top-0">
          {sidebarContent()}
        </aside>

        {/* min-w-0: sin él, esta columna (hija de un flex) se estira al ancho
            de las pastillas del menú móvil (~1850px) en vez de quedarse del
            ancho de la pantalla, y todo el contenido se sale por la derecha. */}
        <div className="flex-1 min-w-0 min-h-screen">
          <div className="lg:hidden sticky top-0 z-40 bg-card/90 backdrop-blur-lg border-b border-border/50 px-3 py-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menú"
              className="relative p-2 -ml-1 rounded-lg text-foreground hover:bg-muted"
            >
              <Menu className="w-6 h-6" />
              {totalPending > 0 && (
                <span className="absolute top-1 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                  {totalPending > 99 ? "99+" : totalPending}
                </span>
              )}
            </button>
            <h2 className="font-heading font-bold text-foreground truncate">
              {(adminNavItems.find((i) => (i.exact ? location.pathname === i.path : location.pathname.startsWith(i.path))) || {}).label || "Admin"}
            </h2>
            <Link to="/admin/cuenta" aria-label="Mi cuenta" className="p-2 -mr-1 rounded-lg text-muted-foreground hover:bg-muted">
              <UserRound className="w-5 h-5" />
            </Link>
          </div>

          {/* Cajón del menú (solo celular y tableta): panel desde la izquierda
              con el mismo menú del escritorio, y un fondo oscuro que lo cierra. */}
          {menuOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Menú de administración">
              <div className="w-[85%] max-w-sm bg-card h-full overflow-y-auto overscroll-contain flex flex-col shadow-xl">
                <div className="flex items-center justify-end px-3 pt-3">
                  <button type="button" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú" className="p-2 rounded-lg text-muted-foreground hover:bg-muted">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {sidebarContent(() => setMenuOpen(false))}
              </div>
              <button type="button" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} className="flex-1 bg-black/50" />
            </div>
          )}
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
