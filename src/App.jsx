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
import ConditionsPage from './pages/ConditionsPage';
import ConditionDetailPage from './pages/ConditionDetailPage';
import BlogList from './pages/BlogList';
import BlogPostPage from './pages/BlogPostPage';
import Dashboard from './pages/admin/Dashboard';
import AdminDoctorStats from './pages/admin/AdminDoctorStats';
import AdminSpecialists from './pages/admin/AdminSpecialists';
import AdminSpecialties from './pages/admin/AdminSpecialties';
import AdminZones from './pages/admin/AdminZones';
import AdminSiteImages from './pages/admin/AdminSiteImages';
import AdminBlog from './pages/admin/AdminBlog';
import BlogEditor from './pages/admin/BlogEditor.jsx';
import AdminReviews from './pages/admin/AdminReviews';
import AdminDoctores from './pages/admin/AdminDoctores';
import AdminDoctorEditor from './pages/admin/AdminDoctorEditor';
import RequireAdmin from './components/RequireAdmin';
import DoctorPanel from './pages/DoctorPanel';
import AdminFaqs from './pages/admin/AdminFaqs';
import AdminFaqEditor from './pages/admin/AdminFaqEditor';
import About from './pages/About';
import Contact from './pages/Contact';
import RegistroMedico from './pages/RegistroMedico';
import PreguntasFrecuentes from './pages/PreguntasFrecuentes';
import PricingPage from './pages/PricingPage';
import AdminPlanes from './pages/admin/AdminPlanes';
import LandingMedicos from './pages/LandingMedicos';
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
        <Route path="/especialidad/:slug" element={<SpecialtyPage />} />
        <Route path="/especialidad/:slug/:zonaSlug" element={<SpecialtyZonePage />} />
        <Route path="/enfermedades" element={<ConditionsPage />} />
        <Route path="/enfermedades/:slug" element={<ConditionDetailPage />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/nosotros" element={<About />} />
        <Route path="/contacto" element={<Contact />} />
        <Route path="/registro-medico" element={<RegistroMedico />} />
        <Route path="/preguntas-frecuentes" element={<PreguntasFrecuentes />} />
        <Route path="/planes" element={<PricingPage />} />
        {/* Redirección de la URL vieja, por si alguien la tiene guardada */}
        <Route path="/admin/mi-perfil" element={<Navigate to="/panel-medico" replace />} />
      </Route>

      {/* Panel del médico: área completamente separada del panel de administración, con su propio shell completo */}
      <Route path="/panel-medico" element={<DoctorPanel />} />

      {/* Landing de conversión para el registro de médicos: shell propio y
          minimalista (sin el Header/Footer del sitio) a propósito, para no
          competir con el único CTA de la página. */}
      <Route path="/para-medicos" element={<LandingMedicos />} />

      <Route element={<AdminLayout />}>
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/estadisticas" element={<AdminDoctorStats />} />
          <Route path="/admin/especialistas" element={<AdminSpecialists />} />
          <Route path="/admin/especialidades" element={<AdminSpecialties />} />
          <Route path="/admin/zonas" element={<AdminZones />} />
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