import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { UserRound, Stethoscope } from "lucide-react";

export default function MiPerfil() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading | admin | sin-perfil

  useEffect(() => {
    let active = true;
    (async () => {
      const u = await base44.auth.me().catch(() => null);
      if (!active) return;
      if (!u) { setStatus("sin-perfil"); return; }

      const isAdmin = u.role === "admin" || u.role === "superadmin";
      if (isAdmin) {
        setStatus("admin");
        return;
      }

      const own = await base44.entities.Specialist.filter({ owner_user_id: u.id });
      if (!active) return;
      if (own.length > 0) {
        navigate(`/admin/doctores/editar/${own[0].id}`, { replace: true });
      } else {
        setStatus("sin-perfil");
      }
    })();
    return () => { active = false; };
  }, [navigate]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-8 h-8 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  if (status === "admin") {
    return (
      <div className="max-w-lg py-16 text-center mx-auto">
        <UserRound className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h1 className="font-heading font-bold text-xl text-foreground">
          Como administrador no tienes un perfil de médico propio
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Esta sección es para que cada médico edite su propio perfil. Si buscas administrar los perfiles de todos los médicos, ve al listado completo.
        </p>
        <Button className="mt-5 rounded-xl" onClick={() => (window.location.href = "/admin/doctores")}>
          Ver listado de doctores
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg py-16 text-center mx-auto">
      <UserRound className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
      <h1 className="font-heading font-bold text-xl text-foreground">
        Aún no tienes un perfil de médico
      </h1>
      <p className="text-sm text-muted-foreground mt-2">
        No encontramos ningún perfil de especialista vinculado a tu cuenta. Si crees que esto es un error, contacta al equipo de BuscoUnDoctor.
      </p>
      <Button className="mt-5 rounded-xl" onClick={() => (window.location.href = "/registro-medico")}>
        Registrar mi perfil
      </Button>
    </div>
  );
}
