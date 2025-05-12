import React, { useState, useEffect } from 'react';
// Removed Card imports as they are not used
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react'; // Import Loader2
// Removed DateRangeFilter import
import { supabase } from '@/integrations/supabase/client'; // Assuming supabase client is correctly set up
// Removed DateRange import as it's not used
import { format } from 'date-fns'; // Removed unused date-fns functions

// Define the type for a batch sentiment analysis record
export type BatchSentimentAnalysis = {
  id: string;
  start_date: string;
  end_date: string;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  created_at: string;
};

interface BatchSentimentHistoryListProps {
  onSelectAnalysis: (id: string | null) => void;
  selectedAnalysisId: string | null;
  onCreateNewBatch: () => Promise<void>; // New prop for triggering batch creation
  isCreatingBatch: boolean; // New prop for loading state of batch creation
}

const BatchSentimentHistoryList: React.FC<BatchSentimentHistoryListProps> = ({
  onSelectAnalysis,
  selectedAnalysisId,
  onCreateNewBatch,
  isCreatingBatch,
}) => {
  // Note: The DateRangeFilter from this component is a string-based dropdown,
  // Removed comments about DateRangeFilter
  const [batchAnalyses, setBatchAnalyses] = useState<BatchSentimentAnalysis[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // Removed selectedRangeKey state

  // Removed getDateRangeFromKey helper function

  // Simplified fetchBatchAnalyses to always fetch all
  const fetchBatchAnalyses = async () => {
    setLoading(true);
    setError(null);

    try {
      // Temporary workaround for Supabase type issue (regenerate types later)
      const query = supabase
        .from('batch_sentiment_analysis' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select('id, start_date, end_date, positive_count, negative_count, neutral_count, created_at')
        .order('created_at', { ascending: false });

      // Removed date range filtering logic

      // Temporary workaround for Supabase type issue (regenerate types later)
      const { data, error: dbError } = await query as any; // eslint-disable-line @typescript-eslint/no-explicit-any

      if (dbError) {
        throw dbError;
      }

      if (dbError) {
        throw dbError;
      }

      setBatchAnalyses(data || []);
    } catch (err: unknown) {
      console.error('Error fetching batch analyses:', err);
      // Type guard to safely access message property
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to fetch batch analyses: ${errorMessage}`);
      setBatchAnalyses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch initial data (all analyses)
    fetchBatchAnalyses();
  }, []); // Run only once on mount

  // Removed handleRangeChange function

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PP'); // Format like 'Sep 15, 2023'
    } catch {
      return dateString; // Fallback if date is invalid
    }
  };

  // Simplified list item style, similar to a sidebar menu
  return (
    // Remove border-r and bg-muted/40 from root, as parent now handles this. Add flex flex-col h-full.
    <div className="flex flex-col h-full">
      {/* Add p-4 to header section */}
      <div className="border-b p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Analysis</h2> {/* Changed title */}
          <Button
            size="sm"
            onClick={onCreateNewBatch} 
            disabled={isCreatingBatch}
          >
            {isCreatingBatch ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            New Batch
          </Button>
        </div>
        {/* Removed DateRangeFilter component */}
      </div>
      {/* Add p-2 to list container */}
      <div className="flex-grow overflow-y-auto space-y-1 p-2">
        {/* Add px-2 py-2 to status messages */}
        {loading && <p className="px-2 py-2 text-sm text-muted-foreground">Loading history...</p>}
        {error && <p className="px-2 py-2 text-sm text-red-500">{error}</p>}
        {!loading && !error && batchAnalyses.length === 0 && (
          <p className="px-2 py-2 text-sm text-muted-foreground">
            No analyses found.
          </p>
        )}
        {!loading && !error && batchAnalyses.length > 0 && (
          batchAnalyses.map((analysis) => (
            <button
              key={analysis.id}
              onClick={() => onSelectAnalysis(analysis.id)}
              // Add px-3 py-2 to button
              className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground
                ${selectedAnalysisId === analysis.id ? 'bg-accent text-accent-foreground font-medium' : 'bg-transparent'}`}
            >
              <div className="font-semibold">
                {formatDate(analysis.start_date)} - {formatDate(analysis.end_date)}
              </div>
              <div className="text-xs text-muted-foreground">
                Analyzed: {formatDate(analysis.created_at)}
              </div>
              <div className="text-xs text-muted-foreground">
                P: {analysis.positive_count} | N: {analysis.negative_count} | Neu: {analysis.neutral_count}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default BatchSentimentHistoryList;
