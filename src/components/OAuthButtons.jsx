import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/icons/GoogleIcon";
import MicrosoftIcon from "@/components/icons/MicrosoftIcon";

// Botones "Continuar con Google / Microsoft" -- solo pinta el de los
// proveedores que ya están prendidos en Supabase (ver useOAuthProviders).
// `itemClassName` deja que quien lo usa ajuste cada botón a su propio
// layout (ej. "sm:col-span-2" dentro del grid de StepShell). Con
// `withDivider` agrega la rayita "o" debajo, para separarlos de lo que sigue.
export default function OAuthButtons({ providers, loadingProvider, onSelect, itemClassName = "", withDivider = false }) {
  if (!providers.google && !providers.microsoft) return null;

  const base = `w-full min-h-[44px] rounded-xl gap-2.5 bg-white hover:bg-muted/40 ${itemClassName}`;

  return (
    <>
      {providers.google && (
        <Button type="button" variant="outline" onClick={() => onSelect("google")} disabled={!!loadingProvider} className={base}>
          {loadingProvider === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
          Continuar con Google
        </Button>
      )}
      {providers.microsoft && (
        <Button type="button" variant="outline" onClick={() => onSelect("microsoft")} disabled={!!loadingProvider} className={base}>
          {loadingProvider === "microsoft" ? <Loader2 className="w-4 h-4 animate-spin" /> : <MicrosoftIcon />}
          Continuar con Microsoft
        </Button>
      )}
      {withDivider && (
        <div className={`flex items-center gap-3 text-xs text-muted-foreground ${itemClassName}`}>
          <div className="h-px flex-1 bg-border" /> o <div className="h-px flex-1 bg-border" />
        </div>
      )}
    </>
  );
}
