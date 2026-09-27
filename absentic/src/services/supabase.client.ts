import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

// Un único cliente de Supabase para toda la app.
export const supabase: SupabaseClient = createClient(
  environment.supabaseUrl,
  environment.supabaseAnonKey,
);