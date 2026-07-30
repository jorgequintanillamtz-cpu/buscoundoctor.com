import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { isDoctorSaved, toggleSavedDoctor } from "@/utils/savedDoctors";

export default function SaveDoctorButton({ specialistId, className = "" }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isDoctorSaved(specialistId));
  }, [specialistId]);

  const handleClick = () => {
    setSaved(toggleSavedDoctor(specialistId));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={saved ? "Quitar de guardados" : "Guardar este doctor"}
      className={`inline-flex items-center justify-center gap-2 text-sm font-medium rounded-full border px-4 py-2.5 min-h-[44px] transition-colors ${
        saved
          ? "bg-red-50 border-red-200 text-red-600"
          : "bg-white border-border/60 text-foreground hover:border-red-200 hover:text-red-500"
      } ${className}`}
    >
      <Heart className={`w-4 h-4 flex-shrink-0 ${saved ? "fill-red-500 text-red-500" : ""}`} />
      {saved ? "Guardado" : "Guardar"}
    </button>
  );
}
