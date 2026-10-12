import React from 'react'
import ReactDOM from 'react-dom/client'
import moment from 'moment'
import App from '@/App.jsx'
import '@/index.css'
import AppErrorBoundary from '@/components/AppErrorBoundary'
import { reloadOnceForNewVersion } from '@/lib/reloadGuard'

moment.locale('es')

// Si el visitante dejó el sitio abierto durante un despliegue, los archivos de su versión ya no
// existen y entrar a una sección nueva falla (antes: página en blanco o "cargando" eterno hasta
// recargar a mano). Vite avisa con este evento; se recarga sola, una vez.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  reloadOnceForNewVersion()
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
)
