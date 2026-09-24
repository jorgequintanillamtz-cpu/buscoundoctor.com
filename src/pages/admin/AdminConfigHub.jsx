import { Link } from "react-router-dom";
import { MapPin, ShieldPlus, Tag, HelpCircle, ImageIcon, Eye, ChevronRight, Settings } from "lucide-react";

// Mismo truco que "Mi perfil" en el panel del doctor (ProfileHub.jsx): en vez
// de 6 enlaces sueltos en el menú para cosas que casi no se tocan, un solo
// enlace "Configuración" que abre esta pantalla de tarjetas grandes. Cada
// tarjeta lleva a la pantalla de siempre, sin tocarla -- sus rutas
// (/admin/ciudades, /admin/catalogos, etc.) no cambiaron, solo se les quitó
// su propio renglón en el menú lateral.
const SECTIONS = [
  { group: "Catálogos del sitio", items: [
    { path: "/admin/ciudades", label: "Ciudades", desc: "Las ciudades donde operamos y sus zonas.", icon: MapPin },
    { path: "/admin/catalogos", label: "Catálogos", desc: "Idiomas y otros catálogos generales del sitio.", icon: ShieldPlus },
    { path: "/admin/planes", label: "Planes y precios", desc: "Los planes que le ofrecemos a los doctores.", icon: Tag },
  ]},
  { group: "Contenido del sitio", items: [
    { path: "/admin/faqs", label: "Preguntas frecuentes", desc: "Las preguntas y respuestas que se muestran en el sitio.", icon: HelpCircle },
    { path: "/admin/imagenes", label: "Imágenes del sitio", desc: "Fotos que se usan en el inicio y otras páginas.", icon: ImageIcon },
    { path: "/admin/vista-registro", label: "Vista previa del registro", desc: "Cómo se ve el formulario de registro de un doctor nuevo.", icon: Eye },
  ]},
];

export default function AdminConfigHub() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-primary" />
        <h1 className="font-heading font-bold text-2xl text-foreground">Configuración</h1>
      </div>

      {SECTIONS.map((g) => (
        <div key={g.group}>
          <p className="text-xs font-heading font-semibold uppercase tracking-wide text-muted-foreground mb-3">{g.group}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {g.items.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-4 text-left bg-card rounded-2xl border border-border/50 p-4 min-h-[76px] hover:border-brand-blue/40 hover:shadow-sm transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-brand-bluePale flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-brand-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.desc}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
