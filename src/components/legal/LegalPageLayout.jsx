import { Link } from "react-router-dom";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage,
} from "@/components/ui/breadcrumb";

// Layout compartido para páginas legales (Aviso de Privacidad, Condiciones
// Generales). Solo maneja el envoltorio visual — el contenido/SEO lo define
// cada página. Usa prosa simple (h2/h3/p/ul) en vez de componentes
// especiales, ya que este tipo de contenido se lee, no se navega.
export default function LegalPageLayout({ title, updatedAt, breadcrumbLabel, children }) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/">Inicio</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage>{breadcrumbLabel}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="bg-white rounded-3xl border border-border/50 shadow-sm p-6 sm:p-10">
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-foreground leading-tight mb-1.5">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground mb-8">Última actualización: {updatedAt}</p>

        <div className="space-y-8 [&_h2]:font-heading [&_h2]:font-bold [&_h2]:text-lg [&_h2]:text-foreground [&_h2]:mb-2.5 [&_h3]:font-heading [&_h3]:font-semibold [&_h3]:text-sm [&_h3]:text-brand-navy [&_h3]:mt-4 [&_h3]:mb-1.5 [&_p]:text-sm [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_p]:mb-3 [&_ul]:space-y-2 [&_ul]:mb-3 [&_li]:text-sm [&_li]:text-muted-foreground [&_li]:leading-relaxed [&_li]:pl-1 [&_strong]:text-foreground [&_strong]:font-semibold">
          {children}
        </div>
      </div>
    </div>
  );
}
