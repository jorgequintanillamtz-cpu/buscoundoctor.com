import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Heart, MapPin, FileText, ArrowLeft, Star, HelpCircle, ImageIcon, Tag, ShieldCheck, Calendar, ShieldPlus, Crown, History, Inbox, Eye, Mail, ListChecks, GraduationCap, LogOut } from "lucide-react";
import { AdminBadgeProvider, useAdminBadges } from "@/components/adminBadges";
import { base44 } from "@/api/base44Client";

// Agrupado por secciones (en vez de una lista plana de 13 links) para que
// el menú se pueda escanear de un vistazo: Resumen primero; luego
// Operación, con las 4 colas de revisión que alimentan la Bandeja de
// entrada juntas y en el mismo orden que ahí (Doctores, Verificaciones,
// Blog, Reseñas), seguidas de lo operativo que no es cola de aprobación
// (Solicitudes, Premium) y el Historial como bitácora al final; luego
// Bancos, los 3 catálogos de taxonomía médica que alimentan la búsqueda
// (especialidades, subespecialidades, enfermedades) -- viven juntos y con
// nombre consistente a propósito, en vez de regados en otras secciones;
// después Contenido (solo texto/imagen del sitio, sin cola de revisión); y
// Configuración al final (lo que casi nunca cambia).
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
      { path: "/admin/verificaciones", label: "Verificar documentos", icon: ShieldCheck },
      { path: "/admin/blog", label: "Blog", icon: FileText },
      { path: "/admin/resenas", label: "Reseñas", icon: Star },
      { path: "/admin/solicitudes", label: "Solicitudes de cita", icon: Calendar },
      { path: "/admin/correos", label: "Correos de pacientes", icon: Mail },
      { path: "/admin/premium", label: "Premium", icon: Crown },
      { path: "/admin/historial", label: "Historial", icon: History },
    ],
  },
  {
    label: "Listas médicas",
    items: [
      { path: "/admin/especialidades", label: "Especialidades", icon: Heart },
      { path: "/admin/subespecialidades", label: "Subespecialidades", icon: GraduationCap },
      { path: "/admin/enfermedades", label: "Enfermedades", icon: ListChecks },
    ],
  },
  {
    label: "Contenido",
    items: [
      { path: "/admin/faqs", label: "Preguntas frecuentes", icon: HelpCircle },
      { path: "/admin/imagenes", label: "Imágenes del sitio", icon: ImageIcon },
      { path: "/admin/vista-registro", label: "Vista previa del registro", icon: Eye },
    ],
  },
  {
    label: "Configuración",
    items: [
      { path: "/admin/ciudades", label: "Ciudades", icon: MapPin },
      { path: "/admin/catalogos", label: "Catálogos", icon: ShieldPlus },
      { path: "/admin/planes", label: "Planes y precios", icon: Tag },
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

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
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
          <nav className="flex-1 p-3 space-y-5">
            {adminNavSections.map((section) => (
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
          <div className="p-3 border-t border-border/50">
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
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Cerrar sesión"
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <LogOut className="w-4 h-4" />
              </button>
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
