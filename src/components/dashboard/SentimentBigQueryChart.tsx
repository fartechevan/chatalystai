import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export function SentimentBigQueryChart() {
  const { toast } = useToast();

  const { data: sentimentData, isLoading, error } = useQuery({
    queryKey: ['sentiment-data'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-sentiment');
      if (error) throw error;
      
      // Transform data for the chart
      const transformedData = data.data.map((item: any) => ({
        date: new Date(item.date).toLocaleDateString(),
        positive: item.sentiment_score > 0 ? item.count : 0,
        negative: item.sentiment_score < 0 ? item.count : 0,
        neutral: item.sentiment_score === 0 ? item.count : 0,
      }));

      return transformedData;
    },
  });

  if (error) {
    toast({
      title: "Error loading sentiment data",
      description: "There was a problem loading the sentiment data.",
      variant: "destructive",
    });
  }

  return (
    <Card className="glass-card animate-enter">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Sentiment Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sentimentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="positive" fill="hsl(var(--success))" name="Positive" />
                <Bar dataKey="negative" fill="hsl(var(--destructive))" name="Negative" />
                <Bar dataKey="neutral" fill="hsl(var(--muted))" name="Neutral" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}