// Indicador de "cargando" de todo el sitio: el logo de BuscoUnDoctor latiendo
// suave (antes era un estetoscopio rebotando, repetido en ~60 pantallas).
//
// size: "sm" (cargas dentro de una tarjeta), "md" (pantalla completa, por
// defecto) o "lg" (ventanas de espera largas, p. ej. el generador con IA).
// light: logo en blanco, para fondos de color (la tienda pública).
const SIZES = {
  sm: "h-[36px]",
  md: "h-[52px]",
  lg: "h-[73px]",
};

export default function LoadingLogo({ size = "md", light = false }) {
  return (
    <img
      src="/logo.webp"
      alt="Cargando"
      className={`${SIZES[size] || SIZES.md} w-auto animate-pulse ${light ? "brightness-0 invert" : ""}`}
    />
  );
}
