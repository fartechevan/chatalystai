import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BlastLimitInfo {
  current_count: number;
  limit: number;
  remaining: number;
  allowed: boolean;
}

export function useWhatsAppBlastLimit() {
  const [blastLimitInfo, setBlastLimitInfo] = useState<BlastLimitInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBlastLimit = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use check_only to prevent incrementing the count
      const { data, error: apiError } = await supabase.functions.invoke(
        'check-whatsapp-blast-limit',
        {
          body: { recipient_count: 1, check_only: true }
        }
      );
      
      if (apiError) {
        throw new Error(`Failed to fetch blast limit: ${apiError.message}`);
      }
      
      if (data) {
        // Always use the data from the response, even if allowed is false
        setBlastLimitInfo({
          current_count: data.current_count || 0,
          limit: data.limit || 150,
          remaining: data.remaining || 0, // Use 0 as fallback instead of 150
          allowed: data.allowed
        });
      }
    } catch (err) {
      console.error("Error checking WhatsApp blast limit:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch blast limit on initial load
  useEffect(() => {
    fetchBlastLimit();
  }, []);

  return {
    blastLimitInfo,
    isLoading,
    error,
    refetchBlastLimit: fetchBlastLimit
  };
}
