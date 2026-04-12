import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-heading font-bold text-xs">B</span>
              </div>
              <span className="font-heading font-bold text-foreground">
                busco<span className="text-primary">undoctor</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Encuentra doctores y especialistas en Monterrey de forma rápida y sencilla.
            </p>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-sm mb-4 text-foreground">Especialidades</h4>
            <div className="flex flex-col gap-2.5">
              <Link to="/especialistas?specialty=Psicología" className="text-sm text-muted-foreground hover:text-primary transition-colors">Psicología</Link>
              <Link to="/especialistas?specialty=Dentista" className="text-sm text-muted-foreground hover:text-primary transition-colors">Dentista</Link>
              <Link to="/especialistas?specialty=Ginecología" className="text-sm text-muted-foreground hover:text-primary transition-colors">Ginecología</Link>
              <Link to="/especialistas?specialty=Pediatría" className="text-sm text-muted-foreground hover:text-primary transition-colors">Pediatría</Link>
            </div>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-sm mb-4 text-foreground">Navegación</h4>
            <div className="flex flex-col gap-2.5">
              <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">Inicio</Link>
              <Link to="/especialistas" className="text-sm text-muted-foreground hover:text-primary transition-colors">Especialistas</Link>
              <Link to="/blog" className="text-sm text-muted-foreground hover:text-primary transition-colors">Blog</Link>
            </div>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-sm mb-4 text-foreground">Contacto</h4>
            <div className="flex flex-col gap-2.5 text-sm text-muted-foreground">
              <span>Monterrey, Nuevo León</span>
              <span>México</span>
              <span>contacto@buscoundoctor.com</span>
            </div>
          </div>
        </div>

        <div className="border-t border-border/50 mt-10 pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} buscoundoctor.com — Todos los derechos reservados
          </p>
        </div>
      </div>
    </footer>
  );
}