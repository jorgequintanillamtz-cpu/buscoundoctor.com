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

          <nav className="hidden md:flex items-center gap-3">
            <Link to="/admin" className="text-sm font-medium text-brand-navy/70 hover:text-brand-navy transition-colors px-2">
              Admin
            </Link>
            <Link to="/registro-medico">
              <Button size="sm" className="text-xs bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold">
                Registro Doctor
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
            to="/admin"
            onClick={() => setOpen(false)}
            className="px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-brand-bluePale hover:text-brand-navy transition-colors">
            
              Admin
            </Link>
            <Link
            to="/registro-medico"
            onClick={() => setOpen(false)}
            className="px-3 py-2.5 rounded-lg text-sm font-semibold text-white bg-brand-blue hover:bg-brand-blue/90 transition-colors text-center mt-1">
            
              Registro Doctor
            </Link>
          </nav>
        </div>
      }
    </header>);

}
