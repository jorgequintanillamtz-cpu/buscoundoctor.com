import { Outlet, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { LayoutDashboard, Users, Heart, MapPin, FileText, ArrowLeft, Star, HelpCircle, UserRound, LogOut, BarChart3 } from "lucide-react";

const adminNavItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { path: "/admin/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { path: "/admin/especialistas", label: "Especialistas", icon: Users },
  { path: "/admin/especialidades", label: "Especialidades", icon: Heart },
  { path: "/admin/zonas", label: "Zonas", icon: MapPin },
  { path: "/admin/blog", label: "Blog", icon: FileText },
  { path: "/admin/doctores", label: "Doctores", icon: Users },
  { path: "/admin/resenas", label: "Reseñas", icon: Star },
  { path: "/admin/faqs", label: "FAQs SEO", icon: HelpCircle },
];

const doctorNavItems = [
  { path: "/admin/mi-perfil", label: "Mi Perfil", icon: UserRound, exact: true },
];

export default function AdminLayout() {
  const location = useLocation();
  const [role, setRole] = useState("loading"); // loading | admin | doctor | none

  useEffect(() => {
    let active = true;
    (async () => {
      const u = await base44.auth.me().catch(() => null);
      if (!active) return;
      if (!u) { setRole("none"); return; }
      setRole(u.role === "admin" || u.role === "superadmin" ? "admin" : "doctor");
    })();
    return () => { active = false; };
  }, []);

  const isDoctor = role === "doctor";
  const navItems = isDoctor ? doctorNavItems : adminNavItems;
  const panelTitle = isDoctor ? "Panel de Médico" : "Panel de Administración";

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  // El panel del médico usa un tema oscuro (navy); el de admin conserva el tema claro.
  const asideClass = isDoctor
    ? "hidden lg:flex w-64 flex-col bg-brand-navy min-h-screen sticky top-0"
    : "hidden lg:flex w-64 flex-col border-r border-border/50 bg-card min-h-screen sticky top-0";

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <aside className={asideClass}>
          <div className={`p-5 ${isDoctor ? "border-b border-white/10" : "border-b border-border/50"}`}>
            <Link
              to="/"
              className={`flex items-center gap-2 text-sm transition-colors mb-4 ${isDoctor ? "text-white/60 hover:text-white" : "text-muted-foreground hover:text-foreground"}`}
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al sitio
            </Link>
            <h2 className={`font-heading font-bold text-lg ${isDoctor ? "text-white" : "text-foreground"}`}>{panelTitle}</h2>
            {isDoctor && (
              <p className="text-xs text-white/50 mt-1">Edita la información de tu perfil médico.</p>
            )}
          </div>
          <nav className="flex-1 p-3">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item)
                      ? isDoctor
                        ? "bg-brand-blue text-white"
                        : "bg-primary text-primary-foreground"
                      : isDoctor
                      ? "text-white/70 hover:bg-white/5 hover:text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
          {isDoctor && (
            <div className="p-3 border-t border-white/10">
              <Link
                to="/"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Salir del panel
              </Link>
            </div>
          )}
        </aside>

        <div className="flex-1 min-h-screen">
          <div className="lg:hidden sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border/50 px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowLeft className="w-4 h-4" />
                Sitio
              </Link>
              <h2 className="font-heading font-bold text-foreground">{isDoctor ? "Mi Panel" : "Admin"}</h2>
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
              {navItems.map((item) => (
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
