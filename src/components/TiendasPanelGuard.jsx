import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/lib/supabaseClient";
import LoadingLogo from "@/components/LoadingLogo";
import { TiendasProfileNotice } from "@/components/TiendasProfileNotice";
import { esDelDirectorio } from "@/lib/specialistOrigin";

// Para las pantallas del panel que viven fuera de DoctorPanel
// (/panel-medico/storefront, /productos, /pagos, /resumen): antes de montar la
// pantalla, revisa (solo lectura) si el perfil de quien entra es de tiendas.
// Si lo es, muestra el aviso; si no (doctor del directorio, sin sesión, admin
// o sin perfil), monta la pantalla de siempre, que hace sus propias consultas.
export default function TiendasPanelGuard({ children }) {
  const [state, setState] = useState("loading"); // loading | tiendas | ok

  useEffect(() => {
    let active = true;
    (async () => {
      const u = await base44.auth.me().catch(() => null);
      if (!active) return;
      if (!u) { setState("ok"); return; }
      const own = await base44.entities.Specialist.filter({ owner_user_id: u.id }).catch(() => []);
      if (!active) return;
      let specialist = own[0];
      if (!specialist) {
        const { data: asst } = await supabase.from("specialist_assistant").select("specialist_id").eq("user_id", u.id).maybeSingle();
        if (asst?.specialist_id) specialist = await base44.entities.Specialist.get(asst.specialist_id).catch(() => null);
      }
      if (!active) return;
      setState(specialist && !esDelDirectorio(specialist) ? "tiendas" : "ok");
    })();
    return () => { active = false; };
  }, []);

  if (state === "ok") return children;
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      {state === "loading" ? (
        <div className="flex items-center justify-center min-h-[40vh]"><LoadingLogo /></div>
      ) : (
        <TiendasProfileNotice />
      )}
    </div>
  );
}
