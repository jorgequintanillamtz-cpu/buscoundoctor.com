import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, MailX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import Logo from "@/components/Logo";

// Enlace de baja de los correos de recuperación de registro ("Si no fuiste tú o prefieres no recibir
// más correos... date de baja aquí"). Pide un clic de confirmación a propósito: los lectores de correo
// y los antivirus abren los enlaces solos, y una baja que se aplicara con solo abrir la página podría
// darse de baja por accidente (mismo motivo por el que el registro usa códigos y no enlaces mágicos).
export default function BajaCorreos() {
  const [params] = useSearchParams();
  const draftId = params.get("draft") || "";
  const [state, setState] = useState("idle"); // idle | loading | done | error

  useEffect(() => {
    document.title = "Darme de baja de los correos | BuscoUnDoctor";
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) { robots = document.createElement("meta"); robots.setAttribute("name", "robots"); document.head.appendChild(robots); }
    robots.setAttribute("content", "noindex, nofollow");
  }, []);

  const confirm = async () => {
    setState("loading");
    try {
      await base44.functions.invoke("unsubscribeRegistrationEmails", { draft_id: draftId });
      setState("done");
    } catch {
      setState("error");
    }
  };

  const validId = /^[0-9a-f-]{36}$/i.test(draftId);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-background">
      <div className="w-full max-w-md bg-card border border-border/50 rounded-3xl p-7 shadow-sm text-center">
        <Logo to="/" className="h-9 mx-auto mb-5" />
        {state === "done" ? (
          <>
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
            <h1 className="font-heading font-bold text-xl text-foreground">Listo, te dimos de baja</h1>
            <p className="text-sm text-muted-foreground mt-2">No te enviaremos más correos sobre este registro. Si fue un error, puedes registrarte cuando quieras.</p>
            <Link to="/" className="inline-block mt-5 text-sm text-primary hover:underline">Ir al inicio</Link>
          </>
        ) : !validId ? (
          <>
            <h1 className="font-heading font-bold text-xl text-foreground">Enlace no válido</h1>
            <p className="text-sm text-muted-foreground mt-2">Abre el enlace completo que viene en el correo. Si necesitas ayuda, responde ese correo y te ayudamos.</p>
          </>
        ) : (
          <>
            <MailX className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h1 className="font-heading font-bold text-xl text-foreground">¿Quieres dejar de recibir estos correos?</h1>
            <p className="text-sm text-muted-foreground mt-2">Son los recordatorios para terminar un registro de médico en BuscoUnDoctor. Si no fuiste tú quien empezó ese registro, también puedes darte de baja aquí.</p>
            {state === "error" && <p className="text-sm text-red-500 mt-3">No se pudo procesar. Intenta de nuevo o responde el correo y te ayudamos.</p>}
            <Button onClick={confirm} disabled={state === "loading"} className="w-full min-h-[48px] rounded-xl mt-5 gap-2">
              {state === "loading" && <Loader2 className="w-4 h-4 animate-spin" />}
              Sí, darme de baja
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
