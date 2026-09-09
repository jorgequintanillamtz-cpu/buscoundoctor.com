import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

// Reemplaza la versión Base44 de este archivo, que dependía del concepto de
// "app hosteada" de esa plataforma (public-settings, auth_required,
// user_not_registered). Un sitio auto-hospedado en Supabase no tiene ese
// nivel: solo existe "hay sesión" / "no hay sesión", y cada ruta protegida
// decide por su cuenta qué hacer (RequireAdmin para /admin/*, cada página de
// /panel-medico/* revisa su propio owner_user_id) -- ver plan de migración,
// Fase 5.
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      const current = await base44.auth.me().catch(() => null);
      if (!active) return;
      setUser(current);
      setIsAuthenticated(!!current);
      setIsLoadingAuth(false);
    };

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    base44.auth.logout(shouldRedirect ? window.location.href : undefined);
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      logout,
      navigateToLogin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
