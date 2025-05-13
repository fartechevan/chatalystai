import { createClient } from '@supabase/supabase-js';
// Ensure this path correctly points to your generated types
import type { Database } from '@/types/supabase';

// Hardcoded Production URL and Key (Original State)
const SUPABASE_URL = "https://vezdxxqzzcjkunoaxcxc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlemR4eHF6emNqa3Vub2F4Y3hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzczODA2MjcsImV4cCI6MjA1Mjk1NjYyN30.ypX-5S8PCV_b-zbJiJW94aRsXd5lUO9TMjXXSdcE2Cw";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
