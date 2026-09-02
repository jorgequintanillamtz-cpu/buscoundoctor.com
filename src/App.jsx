import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import SpecialistList from './pages/SpecialistList';
import SpecialistProfile from './pages/SpecialistProfile';
import SpecialtyPage from './pages/SpecialtyPage';
import SpecialtyZonePage from './pages/SpecialtyZonePage';
import SubspecialtyPage from './pages/SubspecialtyPage';
import ConditionsPage from './pages/ConditionsPage';
import ConditionDetailPage from './pages/ConditionDetailPage';
import BlogList from './pages/BlogList';
import BlogPostPage from './pages/BlogPostPage';
import Dashboard from './pages/admin/Dashboard';
import AdminInbox from './pages/admin/AdminInbox';
import AdminVerificaciones from './pages/admin/AdminVerificaciones';
import AdminSolicitudes from './pages/admin/AdminSolicitudes';
import AdminCorreos from './pages/admin/AdminCorreos';
import AdminCatalogos from './pages/admin/AdminCatalogos';
import AdminEnfermedades from './pages/admin/AdminEnfermedades';
import AdminSubespecialidades from './pages/admin/AdminSubespecialidades';
import AdminPremium from './pages/admin/AdminPremium';
import AdminSpecialties from './pages/admin/AdminSpecialties';
import AdminZones from './pages/admin/AdminZones';
import AdminSiteImages from './pages/admin/AdminSiteImages';
import AdminBlog from './pages/admin/AdminBlog';
import BlogEditor from './pages/admin/BlogEditor.jsx';
import AdminReviews from './pages/admin/AdminReviews';
import AdminDoctores from './pages/admin/AdminDoctores';
import AdminHistorial from './pages/admin/AdminHistorial';
import AdminVistaRegistro from './pages/admin/AdminVistaRegistro';
import AdminDoctorEditor from './pages/admin/AdminDoctorEditor';
import RequireAdmin from './components/RequireAdmin';
import DoctorPanel from './pages/DoctorPanel';
import AdminFaqs from './pages/admin/AdminFaqs';
import AdminFaqEditor from './pages/admin/AdminFaqEditor';
import About from './pages/About';
import Contact from './pages/Contact';
import RegistroMedico from './pages/RegistroMedico';
import PreguntasFrecuentes from './pages/PreguntasFrecuentes';
import ChequeosMedicos from './pages/ChequeosMedicos';
import PricingPage from './pages/PricingPage';
import AdminPlanes from './pages/admin/AdminPlanes';
import LandingMedicos from './pages/LandingMedicos';
import DoctoresRegistro from './pages/DoctoresRegistro';
import StorefrontPublic from './pages/StorefrontPublic';
import StorefrontProductDetail from './pages/StorefrontProductDetail';
import DoctorStorefrontEditor from './pages/DoctorStorefrontEditor';
import DoctorProducts from './pages/DoctorProducts';
import DoctorPayments from './pages/DoctorPayments';
import AvisoDePrivacidad from './pages/AvisoDePrivacidad';
import CondicionesGenerales from './pages/CondicionesGenerales';
import LegacySpecialtyRedirect from './lib/LegacySpecialtyRedirect';
import LegacyConditionRedirect from './lib/LegacyConditionRedirect';
import { Stethoscope } from "lucide-react";

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
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

      {/* Editor del storefront (lado del doctor): separado del panel de
          administración del directorio. Maneja su propia auth como el
          DoctorPanel. */}
      <Route path="/panel-medico/storefront" element={<DoctorStorefrontEditor />} />
      <Route path="/panel-medico/productos" element={<DoctorProducts />} />
      <Route path="/panel-medico/pagos" element={<DoctorPayments />} />

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
          <Route path="/admin/faqs" element={<AdminFaqs />} />
          <Route path="/admin/faqs/editar/:id" element={<AdminFaqEditor />} />
          <Route path="/admin/planes" element={<AdminPlanes />} />
          <Route path="/admin/historial" element={<AdminHistorial />} />
          <Route path="/admin/vista-registro" element={<AdminVistaRegistro />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
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
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App