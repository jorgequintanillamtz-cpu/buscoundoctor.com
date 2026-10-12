import React from "react";
import { isChunkLoadError, reloadOnceForNewVersion } from "@/lib/reloadGuard";

// Red de seguridad de todo el sitio. Sin ella, cualquier error al dibujar una pantalla (por ejemplo
// no poder descargar una sección nueva después de un despliegue) tumbaba la aplicación entera y se
// veía una página en blanco o un "cargando" eterno hasta que la persona recargaba a mano. Ahora:
// si es una versión vieja, se recarga sola una vez; si es otra cosa, se muestra un aviso con un
// botón para recargar.
export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false, reloading: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    if (isChunkLoadError(error) && reloadOnceForNewVersion()) {
      this.setState({ reloading: true });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    if (this.state.reloading) return null;
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center bg-background">
        <img src="/logo.webp" alt="BuscoUnDoctor" className="h-[52px] w-auto mb-6" />
        <h1 className="font-heading font-bold text-xl text-foreground">Algo no salió bien al cargar la página</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
          Puede ser tu conexión o una actualización reciente del sitio. Vuelve a cargarla y debería funcionar.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex items-center justify-center min-h-[44px] px-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
        >
          Recargar página
        </button>
      </div>
    );
  }
}
