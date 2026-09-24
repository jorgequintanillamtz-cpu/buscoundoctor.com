// Logo oficial de Google en sus 4 colores de marca, para el botón "Continuar
// con Google" del registro (RegistroMedico.jsx). No existe en lucide-react
// (es un set de íconos genéricos, no de marcas), así que se dibuja a mano.
export default function GoogleIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 6.1 29.6 4 24 4c-7.3 0-13.6 4.1-16.7 10.7z" />
      <path fill="#4CAF50" d="M24 45c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5C29.6 35.9 26.9 37 24 37c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.4 40.8 16.1 45 24 45z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.5 5.5C41.4 36.4 45 30.8 45 24c0-1.4-.1-2.7-.4-3.5z" />
    </svg>
  );
}
