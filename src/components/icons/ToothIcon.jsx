// Diente (muela) con el mismo estilo de trazo que lucide-react (24×24, línea redondeada, color del texto), para la
// tarjeta de Dentista del carrusel del inicio (HomeCategorySlider.jsx). lucide-react no trae un ícono de diente, así
// que se dibuja a mano. Acepta las mismas props que un ícono de lucide que usamos ahí (className, strokeWidth).
export default function ToothIcon({ className = "w-6 h-6", strokeWidth = 2, ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"
      strokeLinejoin="round" className={className} {...props}>
      <path d="M7.5 3C5 3 3.5 5 3.5 7.3c0 1.9.6 3.3 1.2 4.9.6 1.7.9 3.6 1.3 5.8.3 1.7 1 3 2.1 3 1.3 0 1.7-1.5 2-3.1.3-1.5.7-2.9 1.9-2.9s1.6 1.4 1.9 2.9c.3 1.6.7 3.1 2 3.1 1.1 0 1.8-1.3 2.1-3 .4-2.2.7-4.1 1.3-5.8.6-1.6 1.2-3 1.2-4.9C20.5 5 19 3 16.5 3c-1.8 0-2.6.9-4.5.9S9.3 3 7.5 3Z" />
    </svg>
  );
}
