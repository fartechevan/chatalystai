import { createClient } from '@supabase/supabase-js';
// Ensure this path correctly points to your generated types
// import type { Database } from '@/types/supabase'; // Old import
import type { Database } from './types'; // Corrected import to use the regenerated types

// The deployment environment is responsible for providing these values.
// Hardcoding credentials as a temporary workaround for deployment issues.
// TODO: Revert this and use environment variables once the build environment is fixed.
const SUPABASE_URL = "https://yrnbbkljrdwoyqjpswtv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmJia2xqcmR3b3lxanBzd3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5MjczNTIsImV4cCI6MjA2NjUwMzM1Mn0.GrCyphxWie9QRGtaEYyeTJ54F0Yc6Q4u0VuIVhH-uTI";

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Supabase URL and Anon Key are required.');
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
