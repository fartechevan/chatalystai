import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/types/supabase';

// Define the type for a single pipeline based on the Supabase schema
type Pipeline = Database['public']['Tables']['pipelines']['Row'];

// Fetch all pipelines for the user
export function usePipelinesList() {
  const { toast } = useToast();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPipelines = async () => {
      setLoading(true);
      setError(null);

      // Fetch all pipelines, ordered by name
      const { data, error: fetchError } = await supabase
        .from('pipelines')
        .select('*') // Select all fields
        .order('name'); // Order alphabetically for consistency

      if (fetchError) {
        console.error('Error fetching pipelines:', fetchError);
        setError(fetchError.message);
        toast({
          title: 'Error fetching pipelines',
          description: fetchError.message,
          variant: 'destructive',
        });
        setPipelines([]); // Clear pipelines on error
      } else if (data) {
        setPipelines(data);
      } else {
        setPipelines([]); // Set to empty array if no data
      }

      setLoading(false);
    };

    fetchPipelines();
  }, [toast]); // Only depends on toast

  return {
    pipelines,
    isLoading: loading, // Rename loading to isLoading for consistency
    error,
  };
}
