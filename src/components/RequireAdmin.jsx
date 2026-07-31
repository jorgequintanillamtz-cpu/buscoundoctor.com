import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Stethoscope } from "lucide-react";

// Bloquea el acceso a rutas exclusivas de administrador.
// - Si no hay un usuario real (sin sesión, o sesión anónima de app pública): lo manda a iniciar sesión.
// - Si hay usuario real pero no es admin (ej. un médico): lo manda a su propio panel.
export default function RequireAdmin() {
  const [status, setStatus] = useState("loading"); // loading | ok | denied | no-auth

  useEffect(() => {
    let active = true;
    (async () => {
      const u = await base44.auth.me().catch(() => null);
      if (!active) return;
      if (!u) {
        setStatus("no-auth");
        return;
      }
      const isAdmin = u.role === "admin" || u.role === "superadmin";
      setStatus(isAdmin ? "ok" : "denied");
    })();
    return () => { active = false; };
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-8 h-8 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  if (status === "no-auth") {
    base44.auth.redirectToLogin(window.location.href);
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-8 h-8 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  if (status === "denied") {
    return <Navigate to="/panel-medico" replace />;
  }

  return <Outlet />;
}
