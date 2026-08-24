import Logo from "@/components/Logo";

// Envoltorio visual compartido por los pasos del wizard de registro de
// médicos (RegistroMedico.jsx). Vive en su propio archivo — y no adentro de
// RegistroMedico.jsx como antes — para que la vista de previsualización del
// admin (AdminVistaRegistro.jsx) pueda usar exactamente el mismo look and
// feel sin duplicar el JSX.
export default function StepShell({ title, subtitle, error, children }) {
  return (
    <div className="bg-card border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm">
      <div className="text-center mb-5">
        <Logo to="/" className="h-9 mx-auto mb-3" />
        <h1 className="font-heading font-bold text-xl text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {/* En pantallas más anchas (escritorio), los campos cortos se acomodan de
          a 2 por fila en vez de una sola columna larga — los bloques que deben
          ocupar todo el ancho llevan sm:col-span-2. */}
      <div className="grid gap-5 sm:grid-cols-2">
        {children}
      </div>
      {error && <p className="text-sm text-red-500 text-center mt-5">{error}</p>}
    </div>
  );
}
