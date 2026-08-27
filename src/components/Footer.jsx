import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";

export default function Footer() {
  const [zones, setZones] = useState([]);

  useEffect(() => {
    base44.entities.Zone.filter({ active: true }).then(setZones).catch(() => {});
  }, []);

  return (
    <footer className="bg-brand-navy border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center mb-4">
              <img
                src="https://media.base44.com/images/public/69daf616236dcba44672309d/9f4cfcd01_buscoundoctor.webp"
                alt="BuscoUnDoctor"
                className="h-[42px] w-auto"
              />
            </Link>
            <p className="text-sm text-white/60 leading-relaxed">
              Encuentra doctores y especialistas en Monterrey de forma rápida y sencilla.
            </p>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-sm mb-4 text-white">Especialidades</h4>
            <div className="flex flex-col gap-2.5">
              <Link to="/especialistas" className="text-sm text-white/60 hover:text-brand-blue transition-colors">Explorar especialidades</Link>
            </div>
          </div>

          {zones.length > 0 && (
            <div>
              <h4 className="font-heading font-semibold text-sm mb-4 text-white">Zonas</h4>
              <div className="flex flex-col gap-2.5">
                {zones.map((z) => (
                  <Link
                    key={z.id}
                    to={`/especialistas?zone=${encodeURIComponent(z.name)}`}
                    className="text-sm text-white/60 hover:text-brand-blue transition-colors">
                    {z.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="font-heading font-semibold text-sm mb-4 text-white">Navegación</h4>
            <div className="flex flex-col gap-2.5">
              <Link to="/" className="text-sm text-white/60 hover:text-brand-blue transition-colors">Inicio</Link>
              <Link to="/especialistas" className="text-sm text-white/60 hover:text-brand-blue transition-colors">Especialistas</Link>
              <Link to="/enfermedades" className="text-sm text-white/60 hover:text-brand-blue transition-colors">Enfermedades</Link>
              <Link to="/blog" className="text-sm text-white/60 hover:text-brand-blue transition-colors">Blog</Link>
              <Link to="/nosotros" className="text-sm text-white/60 hover:text-brand-blue transition-colors">Nosotros</Link>
              <Link to="/contacto" className="text-sm text-white/60 hover:text-brand-blue transition-colors">Contacto</Link>
              <Link to="/preguntas-frecuentes" className="text-sm text-white/60 hover:text-brand-blue transition-colors">Preguntas Frecuentes</Link>
              <Link to="/chequeos-medicos" className="text-sm text-white/60 hover:text-brand-blue transition-colors">Calculadora de chequeos</Link>
            </div>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-sm mb-4 text-white">Para médicos</h4>
            <div className="flex flex-col gap-2.5 mb-6">
              <Link to="/para-medicos" className="text-sm text-white/60 hover:text-brand-blue transition-colors">¿Por qué registrarte?</Link>
              <Link to="/registro-medico" className="text-sm text-white/60 hover:text-brand-blue transition-colors">Registro Doctor</Link>
              <Link to="/planes" className="text-sm text-white/60 hover:text-brand-blue transition-colors">Planes y precios</Link>
              <Link to="/panel-medico" className="text-sm text-white/60 hover:text-brand-blue transition-colors">Acceso para médicos</Link>
            </div>
            <h4 className="font-heading font-semibold text-sm mb-4 text-white">Contacto</h4>
            <div className="flex flex-col gap-2.5 text-sm text-white/60">
              <span>Monterrey, Nuevo León</span>
              <span>México</span>
              <a href="mailto:contacto@buscoundoctor.com" className="hover:text-brand-blue transition-colors">contacto@buscoundoctor.com</a>
            </div>
          </div>
        </div>

        {/* Sin link público a /admin a propósito: aunque robots.txt lo
            bloquea, un link presente en el footer de TODAS las páginas hacía
            que Google descubriera y listara la URL de todos modos (indexada
            aunque bloqueada), solo generando ruido en el índice. El acceso
            admin no depende de tener un link visible aquí. */}
        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} buscoundoctor.com — Todos los derechos reservados
          </p>
          <div className="flex items-center gap-4">
            <Link to="/aviso-de-privacidad" className="text-xs text-white/50 hover:text-white/80 transition-colors">Aviso de privacidad</Link>
            <Link to="/terminos-y-condiciones" className="text-xs text-white/50 hover:text-white/80 transition-colors">Términos y condiciones</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}