// Aviso cuando una pantalla no pudo traer sus datos (conexión, servidor ocupado). Reemplaza al
// "cargando" que se quedaba para siempre. `onRetry` vuelve a pedir los datos sin recargar todo.
export default function LoadError({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <h2 className="font-heading font-bold text-xl text-foreground">No se pudo cargar esta página</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm">
        Puede ser tu conexión o que el servidor está ocupado. Intenta de nuevo.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center justify-center min-h-[44px] px-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
      >
        Reintentar
      </button>
    </div>
  );
}
