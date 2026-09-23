import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, MessageCircle, Home, Calendar, Star, Sparkles, UserCog, FileText, Globe, Settings, Package } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { supportWhatsAppLink } from "@/components/DoctorSupportWhatsApp";

// Única fuente de verdad de los items del menú del panel del doctor.
// DoctorPanel.jsx los importa de aquí para su propia barra (interactiva, con
// estado local y avisos) en vez de definirlos por su cuenta -- así el menú
// nunca se desincroniza entre las dos versiones de la barra.
export const SECTION_GROUPS = [
  { group: "Mi actividad", items: [
    { key: "resumen", label: "Inicio", icon: Home },
    { key: "solicitudes", label: "Solicitudes de cita", icon: Calendar },
    { key: "resenas", label: "Reseñas", icon: Star },
  ]},
  { group: "Mi perfil", items: [
    { key: "completar", label: "Llena tu perfil", icon: Sparkles },
    { key: "mi-perfil", label: "Mi perfil", icon: UserCog },
    { key: "documentos", label: "Mi cédula y documentos", icon: FileText },
  ]},
];

export const SIDE_LINKS = [
  { to: "/panel-medico/storefront", label: "Mi página pública", icon: Globe },
  { to: "/panel-medico/productos", label: "Productos digitales", icon: Package },
];

// Barra lateral "estática" del panel del doctor -- para las páginas que
// viven en su propia ruta (Mi página pública, Productos digitales) y antes
// tenían su propio "shell" con solo un botón de "Volver al panel": al
// navegar entre ellas la barra desaparecía por completo, lo que se sentía
// como salir del panel en vez de moverse dentro de él. Esta versión hace que
// la barra se quede siempre visible.
//
// DoctorPanel.jsx NO usa este componente para su propia barra: ahí cambiar
// de sección no recarga la página (usa estado local) y además muestra
// avisos sin leer por sección, algo que esta versión no necesita porque
// aquí cada click sí navega de verdad. Al hacer click en un item de
// SECTION_GROUPS desde una página externa, se manda a /panel-medico con la
// sección deseada en el estado de navegación (`location.state.section`),
// que DoctorPanel.jsx lee al montar para abrir ahí directo.
export default function DoctorPanelSidebar({ activePath, completitud = null, isAssistant = false, width = "w-72" }) {
  const navigate = useNavigate();

  return (
    <aside className={`hidden lg:flex ${width} flex-col bg-brand-navy h-screen sticky top-0`}>
      <div className="p-5 border-b border-white/10">
        <Link to="/" className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Volver al sitio
        </Link>
        <h2 className="font-heading font-bold text-lg text-white">Panel de Médico</h2>
        <p className="text-xs text-white/50 mt-1">
          {isAssistant ? "Entraste como asistente de este médico." : "Administra tu perfil en BuscoUnDoctor."}
        </p>

        {completitud != null && (
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-medium text-white/50">Tu perfil está completo al</span>
              <span className={`font-semibold ${completitud >= 80 ? "text-emerald-400" : completitud >= 50 ? "text-amber-400" : "text-red-400"}`}>{completitud}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${completitud >= 80 ? "bg-emerald-400" : completitud >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                style={{ width: `${completitud}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 overflow-y-auto">
        {SECTION_GROUPS.map((g) => (
          <div key={g.group} className="flex flex-col gap-0.5 mb-3">
            <p className="text-[10px] font-heading font-semibold uppercase tracking-wide px-3 mb-1 text-white/40">{g.group}</p>
            {g.items.map((s) => (
              <Link
                key={s.key}
                to="/panel-medico"
                state={{ section: s.key }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors text-white/70 hover:bg-white/5 hover:text-white"
              >
                <s.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{s.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="px-3 pb-2 space-y-0.5">
        <Link
          to="/panel-medico"
          state={{ section: "ajustes" }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors text-white/70 hover:bg-white/5 hover:text-white"
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          Ajustes
        </Link>
        {SIDE_LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activePath === l.to ? "bg-brand-blue text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            <l.icon className="w-4 h-4 flex-shrink-0" />
            {l.label}
          </Link>
        ))}
        <a href={supportWhatsAppLink()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-emerald-300 hover:bg-white/5 hover:text-emerald-200 transition-colors">
          <MessageCircle className="w-4 h-4 flex-shrink-0" />
          ¿Necesitas ayuda? Escríbenos
        </a>
      </div>

      <div className="p-3 border-t border-white/10">
        <button
          type="button"
          onClick={() => base44.auth.logout(false).then(() => navigate("/"))}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Salir del panel
        </button>
      </div>
    </aside>
  );
}
