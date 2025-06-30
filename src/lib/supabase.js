import { createClient } from '@supabase/supabase-js'

// Hardcoding credentials as a temporary workaround for deployment issues.
// TODO: Revert this and use environment variables once the build environment is fixed.
// TODO: Refactor to use a single Supabase client instance from /src/integrations/supabase/client.ts
const supabaseUrl = "https://yrnbbkljrdwoyqjpswtv.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmJia2xqcmR3b3lxanBzd3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5MjczNTIsImV4cCI6MjA2NjUwMzM1Mn0.GrCyphxWie9QRGtaEYyeTJ54F0Yc6Q4u0VuIVhH-uTI";

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
