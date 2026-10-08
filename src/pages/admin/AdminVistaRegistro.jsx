import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Eye, ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { EMPTY_REGISTRO_DATA } from "@/lib/registroDefaults";
import StepDatos from "@/components/registro/StepDatos";
import StepUbicacion from "@/components/registro/StepUbicacion";
import LoadingLogo from "@/components/LoadingLogo";

// Los 2 pasos que sí tiene sentido previsualizar aquí (el de fotos ya no existe: se sube desde el panel). El paso "cuenta"
// (Google / correo + OTP) es exclusivo del registro real — crear una cuenta
// de verdad es justo lo que esta vista existe para evitar.
const STEP_KEYS = ["datos", "ubicacion"];

// Vista de solo-lectura para el equipo de BuscoUnDoctor: muestra exactamente
// el wizard de registro de médicos (/registro-medico) — mismos componentes
// de paso, mismo diseño — para revisar cómo se ve o probar un cambio sin
// tener que registrar una cuenta de doctor real cada vez. Los pasos
// "datos"/"ubicacion" se importan de src/components/registro/, los
// mismos que usa el registro real: cualquier cambio de diseño ahí se ve
// reflejado aquí solo, sin mantenimiento aparte.
//
// A propósito NO llama a base44.auth ni crea/guarda ningún Specialist real:
// los datos viven solo en el estado local de este componente y se pierden
// al recargar o darle "Reiniciar".
export default function AdminVistaRegistro() {
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState(EMPTY_REGISTRO_DATA);
  const [specialties, setSpecialties] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Specialty.filter({ active: true }).catch(() => []),
      base44.entities.Zone.filter({ active: true }).catch(() => []),
    ]).then(([specs, zoneList]) => {
      setSpecialties([...specs].sort((a, b) => a.name.localeCompare(b.name, "es")));
      setZones([...zoneList].sort((a, b) => a.name.localeCompare(b.name, "es")));
      setLoading(false);
    });
  }, []);

  const update = (field, value) => setData((prev) => ({ ...prev, [field]: value }));

  const reset = () => {
    setData(EMPTY_REGISTRO_DATA);
    setStepIndex(0);
  };

  const stepKey = STEP_KEYS[stepIndex];
  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEP_KEYS.length - 1));
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  const progressPct = Math.round(((stepIndex + 1) / STEP_KEYS.length) * 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <LoadingLogo />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-1">
        <Eye className="w-6 h-6 text-primary" />
        <h1 className="font-heading font-bold text-2xl text-foreground">Vista previa: registro de médicos</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-2">
        Exactamente el mismo formulario que ve un doctor en /registro-medico, para revisar el diseño o probar un cambio sin crear una cuenta real.
      </p>
      <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl px-3 py-2 mb-6 flex items-center justify-between gap-3">
        <span>Nada de lo que llenes aquí se guarda como perfil de doctor — solo vive en esta pantalla hasta que la recargues.</span>
        <button
          type="button"
          onClick={reset}
          className="flex-shrink-0 inline-flex items-center gap-1 font-semibold hover:underline"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reiniciar
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Paso {stepIndex + 1} de {STEP_KEYS.length}</span>
            <span>{progressPct}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div className="h-1.5 bg-brand-blue rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {stepKey === "datos" && (
          <StepDatos data={data} update={update} error="" specialties={specialties} />
        )}
        {stepKey === "ubicacion" && (
          <StepUbicacion data={data} update={update} error="" zones={zones} />
        )}

        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={goBack} disabled={stepIndex === 0} className="rounded-xl gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Atrás
          </Button>
          <Button type="button" onClick={goNext} disabled={stepIndex === STEP_KEYS.length - 1} className="rounded-xl gap-1.5">
            Siguiente <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
