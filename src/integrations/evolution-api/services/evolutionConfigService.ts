import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches Evolution API config (key and URL) from a secure Supabase function.
 */
export async function getEvolutionConfig(): Promise<{ apiKey: string; apiUrl: string } | null> {
  try {
    const { data, error } = await supabase.functions.invoke('get-evolution-config');

    if (error) {
      console.error('Error invoking get-evolution-config function:', error);
      // Consider more specific error handling or re-throwing if needed
      throw new Error(`Failed to fetch Evolution config: ${error.message}`);
    }
    if (!data || !data.apiKey || !data.apiUrl) {
       console.error('Incomplete config received from get-evolution-config:', data);
       throw new Error('Incomplete configuration received from server.');
    }
    return data as { apiKey: string; apiUrl: string };
  } catch (err) {
    console.error('Error in getEvolutionConfig:', err);
    // Propagate the error or return null depending on desired handling
    // Returning null might mask the underlying issue, throwing might be better
    // For now, returning null to match previous pattern in instanceStatusService
    return null; 
  }
}
