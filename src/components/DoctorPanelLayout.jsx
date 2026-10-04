import { Outlet, Link } from "react-router-dom";
import { LogOut } from "lucide-react";

// Layout exclusivo del panel de médicos. Vive fuera de /admin por completo —
// es un área separada de raíz, no una variante del panel de administración.
export default function DoctorPanelLayout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <aside className="hidden lg:flex w-64 flex-col bg-brand-navy min-h-screen sticky top-0">
          <div className="p-5 border-b border-white/10">
            <h2 className="font-heading font-bold text-lg text-white">Panel de Médico</h2>
            <p className="text-xs text-white/50 mt-1">Administra tu perfil en BuscoUnDoctor.</p>
          </div>
          <div className="flex-1" />
          <div className="p-3 border-t border-white/10">
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Salir del panel
            </Link>
          </div>
        </aside>

        <div className="flex-1 min-h-screen">
          <div className="lg:hidden sticky top-0 z-40 bg-brand-navy px-4 py-3 flex items-center justify-between">
            <div className="w-10" />
            <h2 className="font-heading font-bold text-white">Panel de Médico</h2>
            <div className="w-10" />
          </div>
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
