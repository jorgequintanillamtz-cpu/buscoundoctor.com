import { useState, useEffect } from "react";
import { supabaseUrl, supabaseAnonKey } from "@/lib/supabaseClient";

// ¿Ya están dadas de alta las llaves de Google/Microsoft en Supabase? Sin esto,
// quien le diera clic a un botón "Continuar con Google" sin configurar caería
// en una pantalla de error en inglés de Supabase, fea y confusa. Este endpoint
// es público (no necesita sesión) y Supabase lo expone justo para esto.
// Empieza todo apagado (nunca muestra un botón roto) y falla en silencio.
// Lo usan el registro (RegistroMedico.jsx) y el inicio de sesión (IniciarSesion.jsx).
export default function useOAuthProviders() {
  const [providers, setProviders] = useState({ google: false, microsoft: false });

  useEffect(() => {
    let active = true;
    fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: supabaseAnonKey } })
      .then((r) => r.json())
      .then((settings) => {
        if (!active) return;
        setProviders({
          google: !!settings?.external?.google,
          microsoft: !!settings?.external?.azure,
        });
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  return providers;
}
