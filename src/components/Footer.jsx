import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";

export default function Footer() {
  const [topSpecialties, setTopSpecialties] = useState([]);
  const [zones, setZones] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.Specialist.filter({ active: true }).catch(() => []),
      base44.entities.Zone.filter({ active: true }).catch(() => []),
    ]).then(([specialists, zoneList]) => {
      // Solo especialidades con al menos un especialista real, ordenadas por
      // cuántos doctores tiene cada una (para no enlazar a listados vacíos).
      const counts = {};
      for (const s of specialists) {
        if (!s.specialty) continue;
        counts[s.specialty] = (counts[s.specialty] || 0) + 1;
      }
      const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name]) => name);
      setTopSpecialties(sorted);
      setZones(zoneList);
    });
  }, []);

  return (
    <footer className="bg-brand-navy border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-brand-blue flex items-center justify-center">
                <span className="text-white font-heading font-bold text-xs">B</span>
              </div>
              <span className="font-heading font-bold text-white">
                busco<span className="text-brand-blue">undoctor</span>
              </span>
            </Link>
            <p className="text-sm text-white/60 leading-relaxed">
              Encuentra doctores y especialistas en Monterrey de forma rápida y sencilla.
            </p>
          </div>

          {topSpecialties.length > 0 && (
            <div>
              <h4 className="font-heading font-semibold text-sm mb-4 text-white">Especialidades</h4>
              <div className="flex flex-col gap-2.5">
                {topSpecialties.map((name) => (
                  <Link
                    key={name}
                    to={`/especialistas?specialty=${encodeURIComponent(name)}`}
                    className="text-sm text-white/60 hover:text-brand-blue transition-colors">
                    {name}
                  </Link>
                ))}
              </div>
            </div>
          )}

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
              <Link to="/blog" className="text-sm text-white/60 hover:text-brand-blue transition-colors">Blog</Link>
              <Link to="/nosotros" className="text-sm text-white/60 hover:text-brand-blue transition-colors">Nosotros</Link>
              <Link to="/contacto" className="text-sm text-white/60 hover:text-brand-blue transition-colors">Contacto</Link>
              <Link to="/preguntas-frecuentes" className="text-sm text-white/60 hover:text-brand-blue transition-colors">Preguntas Frecuentes</Link>
            </div>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-sm mb-4 text-white">Para médicos</h4>
            <div className="flex flex-col gap-2.5 mb-6">
              <Link to="/registro-medico" className="text-sm text-white/60 hover:text-brand-blue transition-colors">Registro Doctor</Link>
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

        <div className="border-t border-white/10 mt-10 pt-6 text-center">
          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} buscoundoctor.com — Todos los derechos reservados
          </p>
        </div>
      </div>
    </footer>
  );
}
