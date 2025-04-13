// Consolidate imports
import React, { useState, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
// Import LineChart components from recharts
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// Removed duplicate React import line
// Removed duplicate Tabs import line
// Removed duplicate Card import line
// Removed duplicate useQuery import line
// Removed duplicate supabase import line
// Removed duplicate recharts import line
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Loader2, DatabaseZap, Calendar as CalendarIcon } from 'lucide-react'; // Added DatabaseZap icon and CalendarIcon
import { format, parseISO, startOfDay, subDays } from 'date-fns'; // Added subDays
import { DateRange } from "react-day-picker"; // Added DateRange
import { TagCloud } from 'react-tagcloud'; // Import TagCloud
import { cn } from "@/lib/utils"; // Import cn utility
import { Calendar } from "@/components/ui/calendar"; // Import Calendar
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"; // Import Popover components
// Removed incorrect DateRangeFilter import
import { SelectedConversationsList } from './SelectedConversationsList'; // Import the new list component
import { ChatWidget } from './ChatWidget'; // Import ChatWidget
import { ChatPopup } from './ChatPopup'; // Import ChatPopup
import { toast } from '@/hooks/use-toast'; // Import toast

// Define types - Exported Message
export type Message = {
  content: string | null;
  created_at: string;
  sender_participant_id: string | null;
  is_user?: boolean; // Flag to indicate if sender is a customer
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

// Combined type for easier state management - Exported
export type AnalyzedConversation = Conversation & {
  sentimentResult: SentimentResult | null;
};

// Fetch function for conversations and their messages with date filtering and participant role check
const fetchConversationsWithMessages = async (startDate?: Date, endDate?: Date): Promise<Conversation[]> => {
  let query = supabase
    .from('conversations')
    .select(`
      conversation_id,
      created_at,
      messages (
        content,
        created_at,
        sender_participant_id
      )
    `);

  // Apply date filters if provided
  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }
  if (endDate) {
    // Add 1 day to endDate to include the entire day
    const inclusiveEndDate = new Date(endDate);
    inclusiveEndDate.setDate(inclusiveEndDate.getDate() + 1);
    query = query.lte('created_at', inclusiveEndDate.toISOString());
  }

  // Order messages within conversations
  query = query.order('created_at', { referencedTable: 'messages', ascending: true });

  const { data: conversationsData, error: conversationsError } = await query;

  if (conversationsError) {
    console.error("Error fetching conversations with messages:", conversationsError);
    throw new Error(conversationsError.message);
  }
  if (!conversationsData) {
    return [];
  }

  // --- Fetch participant info to determine message sender role ---
  const allMessageParticipantIds = conversationsData.flatMap(
      conv => conv.messages?.map(msg => msg.sender_participant_id).filter(id => !!id) ?? []
  );
  const uniqueParticipantIds = [...new Set(allMessageParticipantIds)];

  let participantMap = new Map<string, { customer_id: string | null }>();
  if (uniqueParticipantIds.length > 0) {
      const { data: participants, error: participantError } = await supabase
          .from('conversation_participants')
          .select('id, customer_id')
          .in('id', uniqueParticipantIds);

      if (participantError) {
          console.error("Error fetching participants for role check:", participantError);
          // Continue without participant info, roles might default or be incorrect
      } else if (participants) {
          participantMap = new Map(participants.map(p => [p.id, { customer_id: p.customer_id }]));
      }
  }
  // --- End Fetch participant info ---

  // Map conversations and add is_user flag to messages
  return conversationsData.map(conv => {
    const messagesWithRole = conv.messages?.map(msg => {
        const participant = msg.sender_participant_id ? participantMap.get(msg.sender_participant_id) : undefined;
        // Determine if the sender is a user (customer)
        const is_user = !!participant?.customer_id;
        return { ...msg, is_user };
    }) ?? [];

    return {
        ...conv,
        messages: messagesWithRole,
    };
  });
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
interface DivergentStackedBarChartProps {
  data: AnalyzedConversation[];
  onBarClick?: (sentiment: 'good' | 'moderate' | 'bad' | 'unknown') => void; // Add click handler prop
}

const DivergentStackedBarChartComponent = ({ data, onBarClick }: DivergentStackedBarChartProps) => {
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

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart layout="vertical" data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" allowDecimals={false} />
        <YAxis type="category" dataKey="name" />
        <Tooltip />
        <Legend />
        {/* Add onClick handlers to bars */}
        <Bar dataKey="good" stackId="a" fill="#22c55e" name="Good" onClick={() => onBarClick?.('good')} style={{ cursor: onBarClick ? 'pointer' : 'default' }} />
        <Bar dataKey="moderate" stackId="a" fill="#facc15" name="Moderate" onClick={() => onBarClick?.('moderate')} style={{ cursor: onBarClick ? 'pointer' : 'default' }} />
        <Bar dataKey="bad" stackId="a" fill="#ef4444" name="Bad" onClick={() => onBarClick?.('bad')} style={{ cursor: onBarClick ? 'pointer' : 'default' }} />
        <Bar dataKey="unknown" stackId="a" fill="#a1a1aa" name="Unknown/Not Analyzed" onClick={() => onBarClick?.('unknown')} style={{ cursor: onBarClick ? 'pointer' : 'default' }} />
      </BarChart>
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

// --- Main View Component ---
export function ConversationStatsView() {
  const [analyzedConversations, setAnalyzedConversations] = useState<AnalyzedConversation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false); // For sentiment analysis
  const [analysisError, setAnalysisError] = useState<string | null>(null); // For sentiment analysis
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVectorizing, setIsVectorizing] = useState(false); // State for schema vectorization
  const [vectorizeStatus, setVectorizeStatus] = useState<string | null>(null); // Status message for vectorization
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29), // Default to last 30 days
    to: new Date(),
  });
  // State for selected sentiment and filtered conversations
  const [selectedSentiment, setSelectedSentiment] = useState<'good' | 'moderate' | 'bad' | 'unknown' | null>(null);
  const [filteredSentimentConversations, setFilteredSentimentConversations] = useState<AnalyzedConversation[]>([]);


  const { data: initialConversationsData, isLoading: isLoadingConversations, error: fetchConversationsError } = useQuery<Conversation[]>({
    // Include dateRange in queryKey to refetch when it changes
    queryKey: ['conversationsWithMessages', dateRange?.from, dateRange?.to],
    queryFn: () => fetchConversationsWithMessages(dateRange?.from, dateRange?.to),
    enabled: !!dateRange?.from && !!dateRange?.to, // Only run query if dates are set
  });

  useEffect(() => {
    if (initialConversationsData) {
      setAnalyzedConversations(initialConversationsData.map(conv => ({ ...conv, sentimentResult: null })));
    }
    // Reset selection when data reloads
    setSelectedSentiment(null);
    setFilteredSentimentConversations([]);
  }, [initialConversationsData]);

  // Handler for clicking a bar segment
  const handleSentimentClick = useCallback((sentiment: 'good' | 'moderate' | 'bad' | 'unknown') => {
    setSelectedSentiment(sentiment);
    const filtered = analyzedConversations.filter(
      conv => conv.sentimentResult?.sentiment === sentiment
    );
    setFilteredSentimentConversations(filtered);
  }, [analyzedConversations]);

  const handleAnalyzeSentiments = useCallback(async () => {
    // Reset selection before analysis
    setSelectedSentiment(null);
    setFilteredSentimentConversations([]);

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
      toast({ title: "Sentiment analysis complete." }); // Add success toast
    } catch (error) {
       console.error("Error during batch sentiment analysis:", error);
       setAnalysisError("An error occurred during the analysis process. Check console for details.");
       toast({ title: "Sentiment analysis failed.", variant: "destructive" }); // Add error toast
    } finally {
      setIsAnalyzing(false);
    }
  }, [analyzedConversations]);

  // Function to trigger schema vectorization
  const handleVectorizeSchema = useCallback(async () => {
    setIsVectorizing(true);
    setVectorizeStatus("Vectorizing schema...");
    try {
      const { data, error } = await supabase.functions.invoke('vectorize-schema');

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setVectorizeStatus(data?.message || "Schema vectorization completed successfully.");
       toast({ title: "Schema Vectorization Success", description: data?.message });

    } catch (error) { // Explicitly type error as unknown or Error
      console.error("Error vectorizing schema:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setVectorizeStatus(`Error: ${errorMessage}`);
      toast({ title: "Schema Vectorization Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsVectorizing(false);
      // Optionally clear status message after a delay
      setTimeout(() => setVectorizeStatus(null), 5000); 
    }
  }, []);

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
    // Use React.Fragment to return multiple top-level elements
    <>
      {/* Adjust main layout to grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 md:p-6">
        {/* Left Column: Filters and Charts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
             <h1 className="text-2xl font-semibold">Conversation Analysis</h1>
             <div className="flex items-center space-x-2 flex-wrap"> {/* Group buttons */}
             {/* Add Vectorize Schema Button */}
             <Button onClick={handleVectorizeSchema} disabled={isVectorizing} variant="outline" size="sm">
               {isVectorizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseZap className="mr-2 h-4 w-4" />}
               Vectorize Schema
             </Button>
             {/* Updated button label calculation */}
             <Button onClick={handleAnalyzeSentiments} disabled={isAnalyzing || analyzedConversations.filter(c => !c.sentimentResult).length === 0}>
               {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
               Analyze Sentiments ({analyzedConversations.filter(c => !c.sentimentResult).length} needing analysis)
             </Button>
           </div>
        </div>
         {/* Display vectorize status */}
         {vectorizeStatus && <p className={`text-sm ${vectorizeStatus.startsWith('Error') ? 'text-red-500' : 'text-green-600'} mt-1`}>{vectorizeStatus}</p>}
         {analysisError && <p className="text-sm text-red-500 mt-2">{analysisError}</p>}

           {/* Add Calendar Date Range Picker */}
           <div className={cn("grid gap-2")}> {/* Removed mb-4 */}
             <Popover>
               <PopoverTrigger asChild>
               <Button
                 id="date"
                 variant={"outline"}
                 className={cn(
                   "w-[300px] justify-start text-left font-normal",
                   !dateRange && "text-muted-foreground"
                 )}
               >
                 <CalendarIcon className="mr-2 h-4 w-4" />
                 {dateRange?.from ? (
                   dateRange.to ? (
                     <>
                       {format(dateRange.from, "LLL dd, y")} -{" "}
                       {format(dateRange.to, "LLL dd, y")}
                     </>
                   ) : (
                     format(dateRange.from, "LLL dd, y")
                   )
                 ) : (
                   <span>Pick a date range</span>
                 )}
               </Button>
             </PopoverTrigger>
             <PopoverContent className="w-auto p-0" align="start">
               <Calendar
                 initialFocus
                 mode="range"
                 defaultMonth={dateRange?.from}
                 selected={dateRange}
                 onSelect={setDateRange}
                 numberOfMonths={2}
               />
             </PopoverContent>
           </Popover>
         </div>

        <Tabs defaultValue="divergent-stacked-bar">
           {/* Adjusted grid columns back after removing tab */}
           <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 gap-2 mb-4">
             <TabsTrigger value="divergent-stacked-bar">Sentiment Distribution</TabsTrigger> {/* Renamed for clarity */}
             <TabsTrigger value="heat-map" disabled={!hasAnalysisRun}>Heat Map</TabsTrigger>
             <TabsTrigger value="word-cloud" disabled={!hasAnalysisRun}>Word Cloud</TabsTrigger>
           </TabsList>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Sentiment Analysis Report</CardTitle>
            </CardHeader>
            <CardContent>
              <TabsContent value="divergent-stacked-bar">
                {/* Updated description */}
                <p className="text-sm text-muted-foreground mb-4">Shows the sentiment distribution for conversations within the selected date range. Click a bar segment to see corresponding conversations.</p>
                {/* Pass click handler */}
                <DivergentStackedBarChartComponent data={analyzedConversations} onBarClick={handleSentimentClick} />
              </TabsContent>
              {/* Removed Filtered Sentiment Bar Tab Content */}
              {/* Removed Trend Chart TabsContent */}
              <TabsContent value="heat-map">
                <p className="text-sm text-muted-foreground mb-4">Best Use Case: Sentiment intensity by category/timeframe. Advantages: Quick identification of hotspots.</p>
                <HeatMapChartComponent data={analyzedConversations} />
              </TabsContent>
              {/* Removed Sankey Diagram TabsContent */}
              <TabsContent value="word-cloud">
                <p className="text-sm text-muted-foreground mb-4">Best Use Case: Frequent terms in feedback. Advantages: Simple and visually appealing.</p>
                <WordCloudComponent data={analyzedConversations} />
              </TabsContent>
              {/* Removed Sparkline and Likert Scale TabsContent */}
            </CardContent>
          </Card>
        </Tabs>

        {/* --- Summary Section --- */}
        {hasAnalysisRun && (
           <Card className="mt-6">
             <CardHeader>
               <CardTitle>Sentiment Summary (Selected Range)</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                 <div>
                   <p className="text-2xl font-bold text-green-500">{analyzedConversations.filter(c => c.sentimentResult?.sentiment === 'good').length}</p>
                   <p className="text-sm text-muted-foreground">Good</p>
                 </div>
                 <div>
                   <p className="text-2xl font-bold text-yellow-500">{analyzedConversations.filter(c => c.sentimentResult?.sentiment === 'moderate').length}</p>
                   <p className="text-sm text-muted-foreground">Moderate</p>
                 </div>
                 <div>
                   <p className="text-2xl font-bold text-red-500">{analyzedConversations.filter(c => c.sentimentResult?.sentiment === 'bad').length}</p>
                   <p className="text-sm text-muted-foreground">Bad</p>
                 </div>
                 <div>
                   <p className="text-2xl font-bold text-gray-500">{analyzedConversations.filter(c => c.sentimentResult?.sentiment === 'unknown').length}</p>
                   <p className="text-sm text-muted-foreground">Unknown</p>
                 </div>
               </div>
             </CardContent>
           </Card>
        )}
        {/* --- End Summary Section --- */}

       </div> {/* End Left Column */}

        {/* Right Column: Selected Conversations List */}
        <div className="lg:col-span-1">
          {/* Placeholder for the conversation list - to be implemented next */}
          {selectedSentiment && (
            <Card>
              <CardHeader>
                <CardTitle className="capitalize flex justify-between items-center">
                  {selectedSentiment} Conversations ({filteredSentimentConversations.length})
                  <Button variant="ghost" size="sm" onClick={() => setSelectedSentiment(null)}>X</Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Replace placeholder with the actual list component */}
                <SelectedConversationsList conversations={filteredSentimentConversations} />
              </CardContent>
            </Card>
          )}
        </div> {/* End Right Column */}
      </div> {/* End Main Grid */}


      {/* Add Chat Widget and Popup (Keep outside the main grid) */}
      <ChatWidget onClick={() => setIsChatOpen(true)} />
      <ChatPopup isOpen={isChatOpen} onOpenChange={setIsChatOpen} />
    </>
  );
}
