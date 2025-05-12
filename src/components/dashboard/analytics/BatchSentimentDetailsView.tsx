import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BatchSentimentAnalysis } from './BatchSentimentHistoryList'; // Import type from the list component
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
// Assuming a charting library like Recharts is installed and configured
// import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BatchSentimentDetailsViewProps {
  analysisId: string | null;
}

// Define a more detailed type if needed, including conversation_ids
type BatchSentimentAnalysisDetails = BatchSentimentAnalysis & {
  conversation_ids?: string[]; // Assuming the function to fetch details includes this
  summary?: string | null; // Include summary if available
};

const BatchSentimentDetailsView: React.FC<BatchSentimentDetailsViewProps> = ({ analysisId }) => {
  const [details, setDetails] = useState<BatchSentimentAnalysisDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!analysisId) {
        setDetails(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Temporary workaround for Supabase type issue (regenerate types later)
        const { data, error: dbError } = await supabase
          .from('batch_sentiment_analysis' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
          .select('*') // Select all columns for details view
          .eq('id', analysisId)
          .single() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

        if (dbError) {
          throw dbError;
        }
        if (!data) {
          throw new Error('Analysis not found.');
        }

        setDetails(data);
      } catch (err: unknown) {
        console.error('Error fetching batch analysis details:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`Failed to fetch details: ${errorMessage}`);
        setDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [analysisId]);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPpp'); // Format like 'Sep 15, 2023, 4:30 PM'
    } catch {
      return dateString; // Fallback
    }
  };

  // Data for the sentiment distribution chart
  const sentimentData = details ? [
    { name: 'Positive', value: details.positive_count, color: '#10B981' }, // Emerald 500
    { name: 'Negative', value: details.negative_count, color: '#EF4444' }, // Red 500
    { name: 'Neutral', value: details.neutral_count, color: '#6B7280' },  // Gray 500
  ] : [];

  const totalSentiments = sentimentData.reduce((sum, entry) => sum + entry.value, 0);

  if (!analysisId) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent>
          <p className="text-muted-foreground">Select a batch analysis from the list to view details.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent>
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!details) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent>
          <p className="text-muted-foreground">Analysis details not found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full overflow-y-auto">
      <CardHeader>
        <CardTitle>Analysis Details</CardTitle>
        <CardDescription>
          Period: {formatDate(details.start_date)} - {formatDate(details.end_date)} <br />
          Analyzed On: {formatDate(details.created_at)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sentiment Distribution Section */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Sentiment Distribution</h3>
          {totalSentiments > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <Card>
                <CardHeader><CardTitle className="text-green-500">Positive</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{details.positive_count}</p></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-red-500">Negative</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{details.negative_count}</p></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-gray-500">Neutral</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{details.neutral_count}</p></CardContent>
              </Card>
            </div>
            /* Placeholder for a Pie Chart if Recharts or similar is available
            <div style={{ width: '100%', height: 300 }} className="mt-4">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            */
          ) : (
            <p className="text-muted-foreground">No sentiment data available for this batch.</p>
          )}
        </div>

        {/* Word Cloud Placeholder */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Word Cloud</h3>
          <Card className="border-dashed border-2 h-48 flex items-center justify-center">
            <CardContent>
              <p className="text-muted-foreground">(Word Cloud visualization coming soon)</p>
            </CardContent>
          </Card>
        </div>

        {/* Conversation IDs (Optional Display) */}
        {details.conversation_ids && details.conversation_ids.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Included Conversation IDs ({details.conversation_ids.length})</h3>
            <Card className="max-h-48 overflow-y-auto">
              <CardContent className="pt-4">
                <ul className="list-disc list-inside text-sm space-y-1">
                  {details.conversation_ids.map(id => <li key={id}>{id}</li>)}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Summary (Optional Display) */}
        {details.summary && (
           <div>
            <h3 className="text-lg font-semibold mb-2">Summary</h3>
            <p className="text-sm text-muted-foreground">{details.summary}</p>
          </div>
        )}

      </CardContent>
    </Card>
  );
};

export default BatchSentimentDetailsView;
