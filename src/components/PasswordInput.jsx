import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Campo de contraseña con ojito para ver lo que se escribe (así se evitan
// errores de dedo, sobre todo en el celular). `withLockIcon` pone el candado
// a la izquierda, como en los formularios de registro e inicio de sesión.
export default function PasswordInput({ value, onChange, placeholder, autoComplete = "new-password", withLockIcon = false, className, ...rest }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      {withLockIcon && <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />}
      <Input
        {...rest}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn("rounded-xl pr-11", withLockIcon && "pl-9", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
