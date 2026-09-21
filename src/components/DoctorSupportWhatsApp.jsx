// Botón flotante de WhatsApp visible en todas las páginas del panel del
// doctor (/panel-medico y sus subpáginas: storefront, resumen, etc.), para
// que un doctor con dudas mientras edita su perfil pueda escribirle
// directo al equipo sin tener que salir del panel a buscar la página de
// Contacto. Mismo número real de WhatsApp que ya usa Contact.jsx.
const WHATSAPP_NUMBER = "528117902740";
// Enlace de WhatsApp al equipo con un mensaje prellenado (lo reutilizan los
// avisos de ayuda del panel).
export function supportWhatsAppLink(text = "Hola, tengo una duda sobre mi perfil en BuscoUnDoctor") {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
const WHATSAPP_HREF = supportWhatsAppLink();

export default function DoctorSupportWhatsApp() {
  return (
    <a
      href={WHATSAPP_HREF}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="¿Dudas? Escríbenos por WhatsApp"
      title="¿Dudas? Escríbenos por WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:bg-[#20BD5A] hover:scale-105 transition-all"
    >
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.847 9.847 0 0 0 12.04 2Zm0 1.67c2.2 0 4.27.86 5.82 2.41a8.191 8.191 0 0 1 2.42 5.83c0 4.55-3.7 8.24-8.25 8.24-1.48 0-2.93-.39-4.19-1.14l-.3-.18-3.12.82.83-3.04-.2-.31a8.188 8.188 0 0 1-1.26-4.38c0-4.55 3.7-8.25 8.25-8.25Zm-4.52 4.7c-.16 0-.42.06-.64.31-.22.25-.85.83-.85 2.02s.87 2.35.99 2.51c.12.16 1.69 2.71 4.19 3.7 2.08.82 2.5.66 2.95.62.45-.04 1.46-.6 1.66-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.46-.29-.25-.12-1.46-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.78.98-.14.16-.29.18-.53.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.7-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.24-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.42-.14-.01-.31-.01-.47-.01Z" />
      </svg>
    </a>
  );
}
