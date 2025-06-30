import { createClient } from '@supabase/supabase-js';
// Ensure this path correctly points to your generated types
// import type { Database } from '@/types/supabase'; // Old import
import type { Database } from './types'; // Corrected import to use the regenerated types

// The deployment environment is responsible for providing these values.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Supabase URL and Anon Key are required.');
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
