import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { base44 } from "@/api/base44Client";

// Bloquea el acceso a rutas exclusivas de administrador.
// - Si nadie ha iniciado sesión: lo manda a iniciar sesión (y regresa aquí después).
// - Si inició sesión pero no es admin (ej. un médico): lo manda a su propio panel.
export default function RequireAdmin() {
  const [status, setStatus] = useState("loading"); // loading | ok | denied | no-auth

  useEffect(() => {
    let active = true;
    (async () => {
      const isAuth = await base44.auth.isAuthenticated().catch(() => false);
      if (!active) return;
      if (!isAuth) {
        setStatus("no-auth");
        return;
      }
      const u = await base44.auth.me().catch(() => null);
      if (!active) return;
      const isAdmin = u && (u.role === "admin" || u.role === "superadmin");
      setStatus(isAdmin ? "ok" : "denied");
    })();
    return () => { active = false; };
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "no-auth") {
    base44.auth.redirectToLogin(window.location.href);
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "denied") {
    return <Navigate to="/admin/mi-perfil" replace />;
  }

  return <Outlet />;
}
