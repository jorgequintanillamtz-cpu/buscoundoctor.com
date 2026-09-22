import { lazy, Suspense } from 'react'
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import ScrollToTop from './components/ScrollToTop';
import RequireAdmin from './components/RequireAdmin';
import LegacySpecialtyRedirect from './lib/LegacySpecialtyRedirect';
import LegacyConditionRedirect from './lib/LegacyConditionRedirect';
import DoctorSupportWhatsApp from './components/DoctorSupportWhatsApp';
import { Stethoscope } from 'lucide-react';

// Cada página se carga en su propio bloque de código, bajo demanda, en vez de
// venir toda junta en un solo archivo de ~700KB que cualquier visitante
// descargaba completo aunque solo quisiera leer un artículo del blog. Esto
// no cambia ningún comportamiento -- Route ya monta/desmonta estos
// componentes igual que antes, solo que ahora el navegador pide el código de
// cada uno la primera vez que se visita esa ruta.
const Home = lazy(() => import('./pages/Home'));
const SpecialistList = lazy(() => import('./pages/SpecialistList'));
const SpecialistProfile = lazy(() => import('./pages/SpecialistProfile'));
const SpecialtyPage = lazy(() => import('./pages/SpecialtyPage'));
const SpecialtyZonePage = lazy(() => import('./pages/SpecialtyZonePage'));
const SubspecialtyPage = lazy(() => import('./pages/SubspecialtyPage'));
const ConditionsPage = lazy(() => import('./pages/ConditionsPage'));
const ConditionDetailPage = lazy(() => import('./pages/ConditionDetailPage'));
const BlogList = lazy(() => import('./pages/BlogList'));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminInbox = lazy(() => import('./pages/admin/AdminInbox'));
const AdminVerificaciones = lazy(() => import('./pages/admin/AdminVerificaciones'));
const AdminSolicitudes = lazy(() => import('./pages/admin/AdminSolicitudes'));
const AdminCorreos = lazy(() => import('./pages/admin/AdminCorreos'));
const AdminCatalogos = lazy(() => import('./pages/admin/AdminCatalogos'));
const AdminEnfermedades = lazy(() => import('./pages/admin/AdminEnfermedades'));
const AdminGuides = lazy(() => import('./pages/admin/AdminGuides'));
const AdminSubespecialidades = lazy(() => import('./pages/admin/AdminSubespecialidades'));
const AdminPremium = lazy(() => import('./pages/admin/AdminPremium'));
const AdminSpecialties = lazy(() => import('./pages/admin/AdminSpecialties'));
const AdminZones = lazy(() => import('./pages/admin/AdminZones'));
const AdminSiteImages = lazy(() => import('./pages/admin/AdminSiteImages'));
const AdminBlog = lazy(() => import('./pages/admin/AdminBlog'));
const BlogEditor = lazy(() => import('./pages/admin/BlogEditor.jsx'));
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews'));
const AdminDoctores = lazy(() => import('./pages/admin/AdminDoctores'));
const AdminHistorial = lazy(() => import('./pages/admin/AdminHistorial'));
const AdminVistaRegistro = lazy(() => import('./pages/admin/AdminVistaRegistro'));
const AdminDoctorEditor = lazy(() => import('./pages/admin/AdminDoctorEditor'));
const AdminDoctorReview = lazy(() => import('./pages/admin/AdminDoctorReview'));
const DoctorPanel = lazy(() => import('./pages/DoctorPanel'));
const AdminFaqs = lazy(() => import('./pages/admin/AdminFaqs'));
const AdminFaqEditor = lazy(() => import('./pages/admin/AdminFaqEditor'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const RegistroMedico = lazy(() => import('./pages/RegistroMedico'));
const PreguntasFrecuentes = lazy(() => import('./pages/PreguntasFrecuentes'));
const ChequeosMedicos = lazy(() => import('./pages/ChequeosMedicos'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const AdminPlanes = lazy(() => import('./pages/admin/AdminPlanes'));
const LandingMedicos = lazy(() => import('./pages/LandingMedicos'));
const DoctoresRegistro = lazy(() => import('./pages/DoctoresRegistro'));
const StorefrontPublic = lazy(() => import('./pages/StorefrontPublic'));
const StorefrontProductDetail = lazy(() => import('./pages/StorefrontProductDetail'));
const DoctorStorefrontEditor = lazy(() => import('./pages/DoctorStorefrontEditor'));
const DoctorProducts = lazy(() => import('./pages/DoctorProducts'));
const DoctorPayments = lazy(() => import('./pages/DoctorPayments'));
const DoctorConsultSummaries = lazy(() => import('./pages/DoctorConsultSummaries'));
const ConsultSummaryPublic = lazy(() => import('./pages/ConsultSummaryPublic'));
const AvisoDePrivacidad = lazy(() => import('./pages/AvisoDePrivacidad'));
const CondicionesGenerales = lazy(() => import('./pages/CondicionesGenerales'));
const IniciarSesion = lazy(() => import('./pages/IniciarSesion'));
const OlvideContrasena = lazy(() => import('./pages/OlvideContrasena'));

// Mismo ícono/estilo que ya se usaba como estado de carga en
// LegacySpecialtyRedirect -- se ve igual de familiar durante la primera
// carga de cualquier página, no un spinner genérico distinto.
function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
    </div>
  );
}

const AuthenticatedApp = () => {
  const location = useLocation();
  // Botón flotante de WhatsApp visible en todo el panel del doctor (incluye
  // /panel-medico/storefront, /panel-medico/resumen, etc.) -- ver
  // DoctorSupportWhatsApp.jsx. No aplica al panel de administración ni al
  // sitio público, donde el contacto ya vive en la página de Contacto/Footer.
  const isDoctorPanel = location.pathname.startsWith('/panel-medico');
  return (
    <>
    {isDoctorPanel && <DoctorSupportWhatsApp />}
    <Suspense fallback={<RouteFallback />}>
      <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/especialistas" element={<SpecialistList />} />
        <Route path="/especialista/:slug" element={<SpecialistProfile />} />
        <Route path="/:professionSlug/:citySlug" element={<SpecialtyPage />} />
        <Route path="/:professionSlug/:citySlug/:zonaSlug" element={<SpecialtyZonePage />} />
        <Route path="/subespecialidad/:slug/:citySlug" element={<SubspecialtyPage />} />
        {/* URLs viejas (especialidad en vez de profesión): se redirigen por si
            quedan enlaces guardados o compartidos con el patrón anterior. */}
        <Route path="/especialidad/:slug" element={<LegacySpecialtyRedirect />} />
        <Route path="/especialidad/:slug/:zonaSlug" element={<LegacySpecialtyRedirect />} />
        <Route path="/enfermedades" element={<ConditionsPage />} />
        <Route path="/enfermedades/:slug/:citySlug" element={<ConditionDetailPage />} />
        {/* URL vieja (sin ciudad): se redirige por si quedan enlaces guardados o indexados */}
        <Route path="/enfermedades/:slug" element={<LegacyConditionRedirect />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/nosotros" element={<About />} />
        <Route path="/contacto" element={<Contact />} />
        <Route path="/registro-medico" element={<RegistroMedico />} />
        <Route path="/iniciar-sesion" element={<IniciarSesion />} />
        <Route path="/olvide-contrasena" element={<OlvideContrasena />} />
        <Route path="/preguntas-frecuentes" element={<PreguntasFrecuentes />} />
        <Route path="/chequeos-medicos" element={<ChequeosMedicos />} />
        <Route path="/planes" element={<PricingPage />} />
        <Route path="/aviso-de-privacidad" element={<AvisoDePrivacidad />} />
        <Route path="/terminos-y-condiciones" element={<CondicionesGenerales />} />
        {/* Redirección de la URL vieja, por si alguien la tiene guardada */}
        <Route path="/admin/mi-perfil" element={<Navigate to="/panel-medico" replace />} />
      </Route>

      {/* Panel del médico: área completamente separada del panel de administración, con su propio shell completo */}
      <Route path="/panel-medico" element={<DoctorPanel />} />

      {/* Landing de conversión para el registro de médicos: shell propio y
          minimalista (sin el Header/Footer del sitio) a propósito, para no
          competir con el único CTA de la página. */}
      <Route path="/para-medicos" element={<LandingMedicos />} />

      {/* Versión corta de /para-medicos para tráfico de anúncios: mismo
          título principal + countdown chico + Paso 1, sin el resto del
          contenido. Shell propio, sin Header/Footer del sitio, igual que
          /para-medicos. */}
      <Route path="/doctores-registro" element={<DoctoresRegistro />} />

      {/* Storefront público del doctor: mini página web personal, sin branding
          de BuscoUnDoctor, que el doctor comparte desde sus redes. Vive fuera
          del Layout (sin Header/Footer) a propósito. */}
      <Route path="/dr/:slug" element={<StorefrontPublic />} />
      <Route path="/dr/:slug/producto/:productId" element={<StorefrontProductDetail />} />
      <Route path="/resumen/:id" element={<ConsultSummaryPublic />} />

      {/* Editor del storefront (lado del doctor): separado del panel de
          administración del directorio. Maneja su propia auth como el
          DoctorPanel. */}
      <Route path="/panel-medico/storefront" element={<DoctorStorefrontEditor />} />
      <Route path="/panel-medico/productos" element={<DoctorProducts />} />
      <Route path="/panel-medico/pagos" element={<DoctorPayments />} />
      <Route path="/panel-medico/resumen" element={<DoctorConsultSummaries />} />

      <Route element={<AdminLayout />}>
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<Dashboard />} />
          {/* Redirección: las estadísticas se fusionaron dentro del Dashboard central */}
          <Route path="/admin/estadisticas" element={<Navigate to="/admin" replace />} />
          <Route path="/admin/bandeja" element={<AdminInbox />} />
          <Route path="/admin/verificaciones" element={<AdminVerificaciones />} />
          <Route path="/admin/solicitudes" element={<AdminSolicitudes />} />
          <Route path="/admin/correos" element={<AdminCorreos />} />
          <Route path="/admin/catalogos" element={<AdminCatalogos />} />
          <Route path="/admin/enfermedades" element={<AdminEnfermedades />} />
          <Route path="/admin/guias" element={<AdminGuides />} />
          <Route path="/admin/subespecialidades" element={<AdminSubespecialidades />} />
          <Route path="/admin/premium" element={<AdminPremium />} />
          <Route path="/admin/especialidades" element={<AdminSpecialties />} />
          <Route path="/admin/ciudades" element={<AdminZones />} />
          {/* Redirección: la página se renombró de "zonas" a "ciudades" */}
          <Route path="/admin/zonas" element={<Navigate to="/admin/ciudades" replace />} />
          <Route path="/admin/imagenes" element={<AdminSiteImages />} />
          <Route path="/admin/blog" element={<AdminBlog />} />
          <Route path="/admin/blog/nuevo" element={<BlogEditor />} />
          <Route path="/admin/blog/editar/:id" element={<BlogEditor />} />
          <Route path="/admin/resenas" element={<AdminReviews />} />
          <Route path="/admin/doctores" element={<AdminDoctores />} />
          <Route path="/admin/doctores/nuevo" element={<AdminDoctorEditor />} />
          <Route path="/admin/doctores/editar/:id" element={<AdminDoctorEditor />} />
          <Route path="/admin/doctores/revisar/:id" element={<AdminDoctorReview />} />
          <Route path="/admin/faqs" element={<AdminFaqs />} />
          <Route path="/admin/faqs/editar/:id" element={<AdminFaqEditor />} />
          <Route path="/admin/planes" element={<AdminPlanes />} />
          <Route path="/admin/historial" element={<AdminHistorial />} />
          <Route path="/admin/vista-registro" element={<AdminVistaRegistro />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
    </>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster position="top-right" richColors closeButton />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
