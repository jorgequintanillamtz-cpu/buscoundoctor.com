import { Link } from "react-router-dom";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [openSpecs, setOpenSpecs] = useState(false);
  const [openZones, setOpenZones] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  const [zones, setZones] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.Specialty.filter({ active: true }).catch(() => []),
      base44.entities.Zone.filter({ active: true }).catch(() => []),
    ]).then(([s, z]) => { setSpecialties(s); setZones(z); });
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border/50">
      <div className="bg-brand-blueLight w-full px-4 sm:px-6">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-navy flex items-center justify-center">
              <span className="text-white font-heading font-bold text-sm">B</span>
            </div>
            <span className="font-heading font-bold text-lg text-brand-navy">BuscoUnDoctor.com

            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-medium text-brand-navy/70 hover:text-brand-navy transition-colors">
              Inicio
            </Link>
            <Link to="/especialistas" className="text-sm font-medium text-brand-navy/70 hover:text-brand-navy transition-colors">
              Especialistas
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-brand-navy/70 hover:text-brand-navy transition-colors outline-none">
                Especialidades <ChevronDown className="w-3.5 h-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[12rem] max-h-[70vh] overflow-y-auto">
                {specialties.length === 0 && <DropdownMenuItem disabled>Cargando…</DropdownMenuItem>}
                {specialties.map(s => (
                  <DropdownMenuItem key={s.id} asChild>
                    <Link to={`/especialidad/${s.slug}`}>{s.name}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-brand-navy/70 hover:text-brand-navy transition-colors outline-none">
                Zonas <ChevronDown className="w-3.5 h-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[12rem] max-h-[70vh] overflow-y-auto">
                {zones.length === 0 && <DropdownMenuItem disabled>Cargando…</DropdownMenuItem>}
                {zones.map(z => (
                  <DropdownMenuItem key={z.id} asChild>
                    <Link to={`/especialistas?zone=${encodeURIComponent(z.name)}`}>{z.name}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/blog" className="text-sm font-medium text-brand-navy/70 hover:text-brand-navy transition-colors">
              Blog
            </Link>
            <Link to="/nosotros" className="text-sm font-medium text-brand-navy/70 hover:text-brand-navy transition-colors">
              Nosotros
            </Link>
            <Link to="/contacto" className="text-sm font-medium text-brand-navy/70 hover:text-brand-navy transition-colors">
              Contacto
            </Link>
            <Link to="/admin" className="text-sm font-medium text-brand-navy/50 hover:text-brand-navy transition-colors">
              Admin
            </Link>
            <Link to="/registro-medico">
              <Button size="sm" className="text-xs bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold">
                Registrarme como doctor
              </Button>
            </Link>
          </nav>

          <button
            onClick={() => setOpen(!open)}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            className="md:hidden p-2 rounded-lg hover:bg-brand-bluePale transition-colors text-brand-navy">
            
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open &&
      <div className="md:hidden border-t border-border/50 bg-card/95 backdrop-blur-lg">
          <nav className="flex flex-col px-4 py-3 gap-1">
            <Link
            to="/"
            onClick={() => setOpen(false)}
            className="px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-brand-bluePale hover:text-brand-navy transition-colors">
            
              Inicio
            </Link>
            <Link
            to="/especialistas"
            onClick={() => setOpen(false)}
            className="px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-brand-bluePale hover:text-brand-navy transition-colors">
            
              Especialistas
            </Link>
            <div className="flex flex-col">
              <button
                onClick={() => setOpenSpecs(v => !v)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-brand-bluePale hover:text-brand-navy transition-colors">
                Especialidades
                <ChevronDown className={`w-4 h-4 transition-transform ${openSpecs ? "rotate-180" : ""}`} />
              </button>
              {openSpecs && (
                <div className="flex flex-col pl-3">
                  {specialties.map(s => (
                    <Link
                      key={s.id}
                      to={`/especialidad/${s.slug}`}
                      onClick={() => setOpen(false)}
                      className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-brand-bluePale hover:text-brand-navy transition-colors">
                      {s.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <button
                onClick={() => setOpenZones(v => !v)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-brand-bluePale hover:text-brand-navy transition-colors">
                Zonas
                <ChevronDown className={`w-4 h-4 transition-transform ${openZones ? "rotate-180" : ""}`} />
              </button>
              {openZones && (
                <div className="flex flex-col pl-3">
                  {zones.map(z => (
                    <Link
                      key={z.id}
                      to={`/especialistas?zone=${encodeURIComponent(z.name)}`}
                      onClick={() => setOpen(false)}
                      className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-brand-bluePale hover:text-brand-navy transition-colors">
                      {z.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link
            to="/blog"
            onClick={() => setOpen(false)}
            className="px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-brand-bluePale hover:text-brand-navy transition-colors">
              Blog
            </Link>
            <Link
            to="/nosotros"
            onClick={() => setOpen(false)}
            className="px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-brand-bluePale hover:text-brand-navy transition-colors">
              Nosotros
            </Link>
            <Link
            to="/contacto"
            onClick={() => setOpen(false)}
            className="px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-brand-bluePale hover:text-brand-navy transition-colors">
              Contacto
            </Link>
            <Link
            to="/registro-medico"
            onClick={() => setOpen(false)}
            className="px-3 py-2.5 rounded-lg text-sm font-semibold text-white bg-brand-blue hover:bg-brand-blue/90 transition-colors text-center mt-1">
            
              Registrarme como doctor
            </Link>
            <Link
            to="/admin"
            onClick={() => setOpen(false)}
            className="px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-brand-bluePale hover:text-brand-navy transition-colors">
            
              Admin
            </Link>
          </nav>
        </div>
      }
    </header>);

}
