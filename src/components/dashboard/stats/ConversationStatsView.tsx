// Consolidate imports
import React, { useState, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
// Import LineChart components from recharts
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { format, parseISO, startOfDay } from 'date-fns';
import { TagCloud } from 'react-tagcloud'; // Import TagCloud

// Define types
type Message = {
  content: string | null;
  created_at: string;
  sender_participant_id: string | null;
};

type Conversation = {
  conversation_id: string;
  created_at: string;
  messages: Message[];
};

// Corrected SentimentResult type
type SentimentResult = {
  conversation_id: string;
  sentiment: 'good' | 'moderate' | 'bad' | 'unknown';
  description?: string;
};

// Combined type for easier state management
type AnalyzedConversation = Conversation & {
  sentimentResult: SentimentResult | null;
};

// Fetch function for conversations and their messages
const fetchConversationsWithMessages = async (): Promise<Conversation[]> => {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      conversation_id,
      created_at,
      messages (
        content,
        created_at,
        sender_participant_id
      )
    `)
    .order('created_at', { referencedTable: 'messages', ascending: true });

  if (error) {
    console.error("Error fetching conversations with messages:", error);
    throw new Error(error.message);
  }
  // Ensure messages is always an array and explicitly return empty array on error/no data
  if (!data) {
    return [];
  }
  return data.map(conv => ({
    ...conv,
    messages: conv.messages || []
  }));
};

// Function to invoke the sentiment analysis edge function
const analyzeSentimentForConversation = async (conversationId: string): Promise<SentimentResult> => {
  const { data, error } = await supabase.functions.invoke('analyze-sentiment', {
    body: { conversationId },
  });

  if (error) {
    console.error(`Error analyzing sentiment for ${conversationId}:`, error);
    // Return only core fields for SentimentResult on error
    return { conversation_id: conversationId, sentiment: 'unknown', description: `Analysis failed: ${error.message}` };
  }
  // Ensure data conforms to SentimentResult, default to unknown if structure is wrong
  if (data && typeof data.sentiment === 'string' && ['good', 'moderate', 'bad'].includes(data.sentiment)) {
     // Return only core fields
     return {
       conversation_id: data.conversation_id || conversationId,
       sentiment: data.sentiment,
       description: data.description
     } as SentimentResult;
  } else {
     console.warn(`Unexpected analysis result structure for ${conversationId}:`, data);
     // Return only core fields for SentimentResult on format error
     return { conversation_id: conversationId, sentiment: 'unknown', description: 'Invalid analysis result format.' };
  }
};

// --- Divergent Stacked Bar Chart Component ---
const DivergentStackedBarChartComponent = ({ data }: { data: AnalyzedConversation[] }) => {
  const sentimentCounts = data.reduce((acc, curr) => {
    const sentiment = curr.sentimentResult?.sentiment || 'unknown';
    acc[sentiment] = (acc[sentiment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = [{
    name: 'Overall Sentiment',
    good: sentimentCounts.good || 0,
    moderate: sentimentCounts.moderate || 0,
    bad: sentimentCounts.bad || 0,
    unknown: sentimentCounts.unknown || 0,
  }];

  const hasAnalyzedData = data.some(d => d.sentimentResult !== null);
  const totalSentiments = chartData[0].good + chartData[0].moderate + chartData[0].bad + chartData[0].unknown;

  if (!hasAnalyzedData && data.length > 0) {
      return <div className="text-center text-muted-foreground p-4">Click "Analyze Sentiments" to process conversations.</div>;
  }
  if (totalSentiments === 0 && data.length === 0) {
       return <div className="text-center text-muted-foreground p-4">No conversation data available.</div>;
  }
   if (totalSentiments === 0 && hasAnalyzedData) {
       return <div className="text-center text-muted-foreground p-4">Analysis complete, but no sentiments detected (all unknown/failed).</div>;
   }
   // This condition is now covered by the first one
   // if (totalSentiments === 0 && !hasAnalyzedData && data.length > 0) {
   //      return <div className="text-center text-muted-foreground p-4">Click "Analyze Sentiments" to process conversations.</div>;
   // }


  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart layout="vertical" data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" allowDecimals={false} />
        <YAxis type="category" dataKey="name" />
        <Tooltip />
        <Legend />
        <Bar dataKey="good" stackId="a" fill="#22c55e" name="Good" />
        <Bar dataKey="moderate" stackId="a" fill="#facc15" name="Moderate" />
        <Bar dataKey="bad" stackId="a" fill="#ef4444" name="Bad" />
        <Bar dataKey="unknown" stackId="a" fill="#a1a1aa" name="Unknown/Not Analyzed" />
      </BarChart>
    </ResponsiveContainer>
  );
};

// --- Trend Chart Component ---
const TrendChartComponent = ({ data }: { data: AnalyzedConversation[] }) => {
  const sentimentsByDate = data.reduce((acc, curr) => {
    if (!curr.sentimentResult) return acc;
    const date = format(startOfDay(parseISO(curr.created_at)), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = { date, good: 0, moderate: 0, bad: 0, unknown: 0 };
    }
    acc[date][curr.sentimentResult.sentiment]++;
    return acc;
  }, {} as Record<string, { date: string; good: number; moderate: number; bad: number; unknown: number }>);

  const chartData = Object.values(sentimentsByDate).sort((a, b) => a.date.localeCompare(b.date));

  if (chartData.length === 0) {
    return <div className="text-center text-muted-foreground p-4">Not enough analyzed data to show trend.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="good" stroke="#22c55e" name="Good" />
        <Line type="monotone" dataKey="moderate" stroke="#facc15" name="Moderate" />
        <Line type="monotone" dataKey="bad" stroke="#ef4444" name="Bad" />
        <Line type="monotone" dataKey="unknown" stroke="#a1a1aa" name="Unknown" />
      </LineChart>
    </ResponsiveContainer>
  );
};

// --- Heat Map Component (as Grouped Bar Chart) ---
const HeatMapChartComponent = ({ data }: { data: AnalyzedConversation[] }) => {
  const sentimentsByDate = data.reduce((acc, curr) => {
    if (!curr.sentimentResult) return acc;
    const date = format(startOfDay(parseISO(curr.created_at)), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = { date, good: 0, moderate: 0, bad: 0, unknown: 0 };
    }
    acc[date][curr.sentimentResult.sentiment]++;
    return acc;
  }, {} as Record<string, { date: string; good: number; moderate: number; bad: number; unknown: number }>);

  const chartData = Object.values(sentimentsByDate).sort((a, b) => a.date.localeCompare(b.date));

  if (chartData.length === 0) {
    return <div className="text-center text-muted-foreground p-4">Not enough analyzed data to show heatmap.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar dataKey="good" fill="#22c55e" name="Good" />
        <Bar dataKey="moderate" fill="#facc15" name="Moderate" />
        <Bar dataKey="bad" fill="#ef4444" name="Bad" />
        <Bar dataKey="unknown" fill="#a1a1aa" name="Unknown" />
      </BarChart>
    </ResponsiveContainer>
  );
};

// --- Likert Scale Component (Reusing Divergent Stacked Bar Logic) ---
const LikertScaleChartComponent = DivergentStackedBarChartComponent;

// --- Word Cloud Component ---
const WordCloudComponent = ({ data }: { data: AnalyzedConversation[] }) => {
  const stopWords = new Set(['a', 'an', 'the', 'is', 'in', 'it', 'of', 'to', 'for', 'on', 'with', 'as', 'by', 'at', 'this', 'that', 'and', 'or', 'but', 'if', 'you', 'me', 'my', 'i', 'he', 'she', 'we', 'they', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'can', 'could', 'not', 'no', 'so', 'up', 'out', 'go', 'get', 'ok', 'okay', 'hi', 'hello', 'thanks', 'thank']);

  const wordCounts = data.reduce((acc, conversation) => {
    conversation.messages.forEach(message => {
      if (message.content) {
        const words = message.content.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 2 && !stopWords.has(word));
        words.forEach(word => {
          acc[word] = (acc[word] || 0) + 1;
        });
      }
    });
    return acc;
  }, {} as Record<string, number>);

  const tagData = Object.entries(wordCounts).map(([value, count]) => ({ value, count }));

  if (tagData.length === 0) {
    return <div className="text-center text-muted-foreground p-4">Not enough message data for word cloud.</div>;
  }

  return (
    <div className="p-4 border rounded-md">
      <TagCloud minSize={12} maxSize={35} tags={tagData} shuffle={true} className="simple-cloud" />
    </div>
  );
};

// --- Sparkline Chart Component ---
const SparklineChartComponent = ({ data }: { data: AnalyzedConversation[] }) => {
   const sentimentsByDate = data.reduce((acc, curr) => {
    if (!curr.sentimentResult) return acc;
    const date = format(startOfDay(parseISO(curr.created_at)), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = { date, good: 0, moderate: 0, bad: 0 };
    }
    if (['good', 'moderate', 'bad'].includes(curr.sentimentResult.sentiment)) {
       acc[date][curr.sentimentResult.sentiment]++;
    }
    return acc;
  }, {} as Record<string, { date: string; good: number; moderate: number; bad: number;}>);

  const chartData = Object.values(sentimentsByDate).sort((a, b) => a.date.localeCompare(b.date));

  if (chartData.length < 2) {
    return <div className="text-center text-muted-foreground p-4">Not enough data points for sparkline.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={100}>
      <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
         <Tooltip contentStyle={{ fontSize: '10px', padding: '2px 5px' }} labelFormatter={(label) => `Date: ${label}`} />
        <Line type="monotone" dataKey="good" stroke="#22c55e" dot={false} strokeWidth={2} name="Good Sentiments" />
      </LineChart>
    </ResponsiveContainer>
  );
};

// --- Placeholder components for remaining charts ---
const SankeyDiagramChart = () => <div>Sankey Diagram Placeholder</div>;

// --- Main View Component ---
export function ConversationStatsView() {
  const [analyzedConversations, setAnalyzedConversations] = useState<AnalyzedConversation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const { data: initialConversationsData, isLoading: isLoadingConversations, error: fetchConversationsError } = useQuery<Conversation[]>({
    queryKey: ['conversationsWithMessages'],
    queryFn: fetchConversationsWithMessages,
  });

  useEffect(() => {
    if (initialConversationsData) {
      setAnalyzedConversations(initialConversationsData.map(conv => ({ ...conv, sentimentResult: null })));
    }
  }, [initialConversationsData]);

  const handleAnalyzeSentiments = useCallback(async () => {
    const conversationsToAnalyze = analyzedConversations.filter(c => !c.sentimentResult);
    if (!conversationsToAnalyze || conversationsToAnalyze.length === 0) {
      setAnalysisError("No conversations need analysis or data hasn't loaded.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    const analysisPromises: Promise<SentimentResult>[] = conversationsToAnalyze.map(conv =>
      analyzeSentimentForConversation(conv.conversation_id)
    );

    try {
      const results = await Promise.all(analysisPromises);
      setAnalyzedConversations(prevConversations => {
        const resultsMap = new Map(results.map(r => [r.conversation_id, r]));
        return prevConversations.map(conv => ({
          ...conv,
          sentimentResult: resultsMap.get(conv.conversation_id) || conv.sentimentResult,
        }));
      });
    } catch (error) {
       console.error("Error during batch sentiment analysis:", error);
       setAnalysisError("An error occurred during the analysis process. Check console for details.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [analyzedConversations]);

  if (isLoadingConversations) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Conversation Analysis</h1>
        <Skeleton className="h-10 w-full mb-4" />
        <Card className="mt-4">
          <CardHeader><Skeleton className="h-6 w-1/3 mb-2" /><Skeleton className="h-4 w-3/4" /></CardHeader>
          <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  if (fetchConversationsError) {
    return <div className="p-4 text-red-500">Error loading conversations: {fetchConversationsError.message}</div>;
  }

  // Calculate hasAnalysisRun *before* the return statement
  const hasAnalysisRun = analyzedConversations.some(c => c.sentimentResult !== null);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex justify-between items-center mb-4">
         <h1 className="text-2xl font-semibold">Conversation Analysis</h1>
         <Button onClick={handleAnalyzeSentiments} disabled={isAnalyzing || analyzedConversations.length === 0}>
           {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
           Analyze Sentiments ({analyzedConversations.filter(c => !c.sentimentResult).length} remaining)
         </Button>
      </div>

       {analysisError && <p className="text-sm text-red-500 mt-2">{analysisError}</p>}

      <Tabs defaultValue="divergent-stacked-bar">
         <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
           <TabsTrigger value="divergent-stacked-bar">Divergent Stacked Bar</TabsTrigger>
           <TabsTrigger value="trend-chart" disabled={!hasAnalysisRun}>Trend Chart</TabsTrigger>
           <TabsTrigger value="heat-map" disabled={!hasAnalysisRun}>Heat Map</TabsTrigger>
           <TabsTrigger value="sankey-diagram" disabled={!hasAnalysisRun}>Sankey Diagram</TabsTrigger>
           <TabsTrigger value="word-cloud" disabled={!hasAnalysisRun}>Word Cloud</TabsTrigger>
           <TabsTrigger value="sparkline" disabled={!hasAnalysisRun}>Sparkline</TabsTrigger>
           <TabsTrigger value="likert-scale" disabled={!hasAnalysisRun}>Likert Scale</TabsTrigger>
         </TabsList>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Sentiment Analysis Report</CardTitle>
          </CardHeader>
          <CardContent>
            <TabsContent value="divergent-stacked-bar">
              <p className="text-sm text-muted-foreground mb-4">Best Use Case: Overall sentiment distribution. Advantages: Easy comparison across sentiment categories.</p>
              <DivergentStackedBarChartComponent data={analyzedConversations} />
            </TabsContent>
            <TabsContent value="trend-chart">
              <p className="text-sm text-muted-foreground mb-4">Best Use Case: Sentiment changes over time. Advantages: Combines trends and distributions.</p>
              <TrendChartComponent data={analyzedConversations} />
            </TabsContent>
            <TabsContent value="heat-map">
              <p className="text-sm text-muted-foreground mb-4">Best Use Case: Sentiment intensity by category/timeframe. Advantages: Quick identification of hotspots.</p>
              <HeatMapChartComponent data={analyzedConversations} />
            </TabsContent>
            <TabsContent value="sankey-diagram">
              <p className="text-sm text-muted-foreground mb-4">Best Use Case: Flow between sentiment levels and categories. Advantages: Shows relationships effectively.</p>
              <SankeyDiagramChart />
            </TabsContent>
            <TabsContent value="word-cloud">
              <p className="text-sm text-muted-foreground mb-4">Best Use Case: Frequent terms in feedback. Advantages: Simple and visually appealing.</p>
              <WordCloudComponent data={analyzedConversations} />
            </TabsContent>
            <TabsContent value="sparkline">
              <p className="text-sm text-muted-foreground mb-4">Best Use Case: Quick overview of sentiment fluctuations (e.g., 'Good' sentiment trend). Advantages: Compact and insightful.</p>
              <SparklineChartComponent data={analyzedConversations} />
            </TabsContent>
            <TabsContent value="likert-scale">
              <p className="text-sm text-muted-foreground mb-4">Best Use Case: Displaying distribution similar to survey responses. Advantages: Standardized representation.</p>
              <LikertScaleChartComponent data={analyzedConversations} />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
