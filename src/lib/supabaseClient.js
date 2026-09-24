import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Exportados para el checkeo de "¿qué proveedores de login están prendidos?"
// de RegistroMedico.jsx (GET /auth/v1/settings) -- ver ese archivo.
export { supabaseUrl, supabaseAnonKey };
