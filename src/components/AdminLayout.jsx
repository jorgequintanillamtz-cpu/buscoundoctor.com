import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Heart, MapPin, FileText, ArrowLeft, Star, HelpCircle, BarChart3, ImageIcon, Tag, ShieldCheck } from "lucide-react";

const adminNavItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { path: "/admin/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { path: "/admin/verificaciones", label: "Verificaciones", icon: ShieldCheck },
  { path: "/admin/especialidades", label: "Especialidades", icon: Heart },
  { path: "/admin/zonas", label: "Zonas", icon: MapPin },
  { path: "/admin/imagenes", label: "Imágenes del sitio", icon: ImageIcon },
  { path: "/admin/blog", label: "Blog", icon: FileText },
  { path: "/admin/doctores", label: "Doctores", icon: Users },
  { path: "/admin/resenas", label: "Reseñas", icon: Star },
  { path: "/admin/faqs", label: "FAQs SEO", icon: HelpCircle },
  { path: "/admin/planes", label: "Planes y precios", icon: Tag },
];

// Layout exclusivo del panel de administración (dueños de la plataforma).
// El panel de médicos vive por completo aparte, en /panel-medico.
export default function AdminLayout() {
  const location = useLocation();

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

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
          <nav className="flex-1 p-3">
            <div className="flex flex-col gap-1">
              {adminNavItems.map((item) => (
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
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </aside>

        <div className="flex-1 min-h-screen">
          <div className="lg:hidden sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border/50 px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowLeft className="w-4 h-4" />
                Sitio
              </Link>
              <h2 className="font-heading font-bold text-foreground">Admin</h2>
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
