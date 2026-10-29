import { useState } from "react";
import { User } from "lucide-react";

// Foto del doctor en las listas de recomendados (CLAUDE.md §8r). Solo llega `photo` si el doctor ya tiene
// cuenta y subió una foto; si no (o si la imagen no carga), se muestra la silueta gris de siempre.
// `shape` cambia la forma (por defecto redonda; la copia /recomendaciones-nueva la usa rectangular).
export default function RecommendedAvatar({ photo, name, className = "w-12 h-12", shape = "rounded-full" }) {
  const [broken, setBroken] = useState(false);
  if (photo && !broken) {
    return (
      <img
        src={photo}
        alt={`Foto de ${name}`}
        loading="lazy"
        onError={() => setBroken(true)}
        className={`${className} ${shape} object-cover object-top bg-muted flex-shrink-0`}
      />
    );
  }
  return (
    <span className={`${className} ${shape} bg-muted text-muted-foreground/60 flex items-center justify-center flex-shrink-0`} aria-hidden="true">
      <User className="w-1/2 h-1/2 fill-current" />
    </span>
  );
}
