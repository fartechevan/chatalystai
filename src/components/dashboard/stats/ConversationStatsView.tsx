// Consolidate imports
import React, { useState, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useQueryClient } from '@tanstack/react-query'; // Added useQueryClient import
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
// Removed import for BatchSentimentAnalysisLayout
import BatchSentimentHistoryList from '../analytics/BatchSentimentHistoryList'; // Import the history list directly
import { BatchDateRangeDialog } from './BatchDateRangeDialog'; // Import the new dialog
import { Database } from '@/types/supabase'; // Import the Database type

// Define type for batch details fetch - reflect potential production column names
type BatchDetails = {
  conversation_ids: string[] | null;
  start_date: string | null;
  end_date: string | null;
  positive_count?: number; // Use likely production names
  negative_count?: number;
  neutral_count?: number;
  unknown_count?: number; // Keep querying this just in case
};

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

// Type for fetched sentiment details
type BatchSentimentDetail = {
  conversation_id: string;
  sentiment: 'good' | 'moderate' | 'bad' | 'unknown';
  description: string | null;
};

// Function to fetch individual sentiment details for a batch
const fetchBatchSentimentDetails = async (batchAnalysisId: string): Promise<BatchSentimentDetail[]> => {
  const { data, error } = await supabase
    .from('batch_sentiment_analysis_details')
    .select('conversation_id, sentiment, description')
    .eq('batch_analysis_id', batchAnalysisId);

  if (error) {
    console.error("Error fetching batch sentiment details:", error);
    throw new Error(error.message);
  }
  return data || [];
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
  // Accept counts directly
  sentimentCounts: { good: number; moderate: number; bad: number; unknown: number } | null;
  onBarClick?: (sentiment: 'good' | 'moderate' | 'bad' | 'unknown') => void; // Keep click handler prop
}

const DivergentStackedBarChartComponent = ({ sentimentCounts, onBarClick }: DivergentStackedBarChartProps) => {
  // Use provided counts or default to zero if null
  const counts = sentimentCounts || { good: 0, moderate: 0, bad: 0, unknown: 0 };

  const chartData = [{
    name: 'Overall Sentiment',
    good: counts.good,
    moderate: counts.moderate,
    bad: counts.bad,
    unknown: counts.unknown,
  }];

  const totalSentiments = counts.good + counts.moderate + counts.bad + counts.unknown;

  // Updated checks based on counts
  if (!sentimentCounts) {
      return <div className="text-center text-muted-foreground p-4">Select a batch analysis to view sentiment distribution.</div>;
  }
  if (totalSentiments === 0) {
       return <div className="text-center text-muted-foreground p-4">No sentiment data available for this batch (all counts are zero).</div>;
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
  const [isChatOpen, setIsChatOpen] = useState(false);
   const [selectedBatchAnalysisId, setSelectedBatchAnalysisId] = useState<string | null>(null);
   const [selectedBatchConversationIds, setSelectedBatchConversationIds] = useState<string[] | null>(null);
   const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [batchCreationError, setBatchCreationError] = useState<string | null>(null);
  const [selectedBatchDateRange, setSelectedBatchDateRange] = useState<DateRange | undefined>(undefined);
  const [isLoadingBatchDetails, setIsLoadingBatchDetails] = useState(false);
  const [isDateRangeDialogOpen, setIsDateRangeDialogOpen] = useState(false);
  // Add state for sentiment counts
  const [batchSentimentCounts, setBatchSentimentCounts] = useState<{ good: number; moderate: number; bad: number; unknown: number } | null>(null);
  // Add state for selected sentiment
  const [selectedSentiment, setSelectedSentiment] = useState<'good' | 'moderate' | 'bad' | 'unknown' | null>(null);
  const [filteredSentimentConversations, setFilteredSentimentConversations] = useState<AnalyzedConversation[]>([]); // Re-add filtered state


  const handleSelectBatchAnalysis = async (id: string | null) => {
     setSelectedBatchAnalysisId(id);
     setSelectedSentiment(null); // Reset sentiment selection when batch changes
     setSelectedBatchDateRange(undefined);

     if (id) {
      setIsLoadingBatchDetails(true);
      try {
        // Fetch batch details including conversation_ids and date range
        // Fetch counts along with other details
        // Cast table name to expected type to satisfy TS/ESLint
        // Select likely production column names (excluding unknown_count as it doesn't exist)
        const { data: batchData, error: batchError } = await supabase
          .from('batch_sentiment_analysis' as keyof Database['public']['Tables']) // Cast to keyof Tables
          .select('conversation_ids, start_date, end_date, positive_count, negative_count, neutral_count')
          .eq('id', id)
          .single<BatchDetails>(); // Use BatchDetails reflecting potential production names

        if (batchError) throw batchError;

        if (batchData) {
          setSelectedBatchConversationIds(batchData.conversation_ids || []);
          if (batchData.start_date && batchData.end_date) {
            setSelectedBatchDateRange({
              from: parseISO(batchData.start_date),
              to: parseISO(batchData.end_date),
            });
          } else {
             setSelectedBatchDateRange(undefined);
          }
          // Map fetched counts (using likely production names) to state keys
          setBatchSentimentCounts({
            good: batchData.positive_count ?? 0, // Map positive to good
            moderate: batchData.neutral_count ?? 0, // Map neutral to moderate
            bad: batchData.negative_count ?? 0, // Map negative to bad
            unknown: batchData.unknown_count ?? 0, // Use unknown directly if present
          });
        } else {
          setSelectedBatchConversationIds([]);
          setSelectedBatchDateRange(undefined);
          setBatchSentimentCounts(null); // Reset counts if no data
        }

      } catch (error: unknown) { // Use 'unknown' for better type safety
        console.error("Error fetching batch details (raw object):", error);
        // Attempt to stringify for more details, handling circular references
        try {
          // Check if error is an object before trying to stringify its properties
          if (typeof error === 'object' && error !== null) {
            console.error("Error fetching batch details (stringified):", JSON.stringify(error, Object.getOwnPropertyNames(error)));
          } else {
            console.error("Error fetching batch details (not an object or null):", error);
          }
        } catch (e) {
          console.error("Could not stringify the error object:", e);
        }

        let errorMessage = "An unknown error occurred while fetching batch details. Check console for more details.";
        if (typeof error === 'object' && error !== null) {
          if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
            errorMessage = (error as { message: string }).message;
          }
          // Log more details if available from Supabase error structure
          if ('details' in error && typeof (error as { details: unknown }).details === 'string') console.error("Error details:", (error as { details: string }).details);
          if ('hint' in error && typeof (error as { hint: unknown }).hint === 'string') console.error("Error hint:", (error as { hint: string }).hint);
          if ('code' in error && typeof (error as { code: unknown }).code === 'string') console.error("Error code:", (error as { code: string }).code);
        } else if (typeof error === 'string') {
          errorMessage = error;
        }

        toast({ title: "Error Fetching Batch", description: errorMessage, variant: "destructive" });
        setSelectedBatchConversationIds(null);
        setSelectedBatchDateRange(undefined);
        setBatchSentimentCounts(null); // Reset counts on error
      } finally {
        setIsLoadingBatchDetails(false);
      }
    } else {
       setSelectedBatchConversationIds(null);
       setSelectedBatchDateRange(undefined);
       setBatchSentimentCounts(null); // Reset counts when deselecting
     }
   };

   const queryClient = useQueryClient();

  const handleCreateNewBatchAnalysis = async (batchStartDate?: Date, batchEndDate?: Date) => { 
    if (!batchStartDate || !batchEndDate) {
      toast({ title: "Date range is required for batch analysis.", variant: "destructive" });
      return;
    }

    setIsCreatingBatch(true);
    setBatchCreationError(null);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-sentiment-batch', {
        body: { 
          startDate: format(batchStartDate, 'yyyy-MM-dd'),
          endDate: format(batchEndDate, 'yyyy-MM-dd')
        },
      });

      if (error) throw error;

      toast({ title: "Batch sentiment analysis started.", description: `Batch ID: ${data?.batch_analysis_id}` });
      queryClient.invalidateQueries({ queryKey: ['batchAnalyses'] }); 
      setIsDateRangeDialogOpen(false); 

    } catch (error: unknown) { 
      console.error("Error creating new batch analysis:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setBatchCreationError(errorMessage || "Failed to start batch analysis.");
      toast({ title: "Batch Analysis Failed", description: errorMessage, variant: "destructive" }); 
    } finally {
      setIsCreatingBatch(false);
    }
  };

  const { data: initialConversationsData, isLoading: isLoadingConversations, error: fetchConversationsError } = useQuery<Conversation[]>({
    queryKey: ['conversationsForBatch', selectedBatchAnalysisId, selectedBatchDateRange], 
    queryFn: () => {
      if (selectedBatchAnalysisId && selectedBatchDateRange?.from && selectedBatchDateRange?.to) {
         return fetchConversationsWithMessages(selectedBatchDateRange.from, selectedBatchDateRange.to);
      }
      return Promise.resolve([]); 
    },
     enabled: !!selectedBatchAnalysisId && !!selectedBatchDateRange?.from && !!selectedBatchDateRange?.to,
    });

   // Query hook to fetch individual sentiment details for the selected batch
   const { data: batchDetailsData, isLoading: isLoadingBatchDetailsData, error: fetchDetailsError } = useQuery<BatchSentimentDetail[], Error>({ // Specify Error type
     queryKey: ['batchSentimentDetails', selectedBatchAnalysisId],
     queryFn: () => {
       if (!selectedBatchAnalysisId) return Promise.resolve([]);
       console.log(`Fetching details for batch: ${selectedBatchAnalysisId}`); // Debug log
       return fetchBatchSentimentDetails(selectedBatchAnalysisId);
     },
     enabled: !!selectedBatchAnalysisId, // Fetch whenever a batch ID is selected
   });


   useEffect(() => {
     // Wait for both conversations and details to load before merging
     if (selectedBatchAnalysisId && initialConversationsData && selectedBatchConversationIds && batchDetailsData) {
       console.log("Merging conversation data with details...");
       const batchConvIdsSet = new Set(selectedBatchConversationIds);
       const sentimentDetailsMap = new Map(batchDetailsData.map(d => [d.conversation_id, d]));
       console.log(`Details map size: ${sentimentDetailsMap.size}`);

       const mergedConversations = initialConversationsData
         .filter(conv => batchConvIdsSet.has(conv.conversation_id))
         .map(conv => {
           const detail = sentimentDetailsMap.get(conv.conversation_id);
           return {
             ...conv,
             // Merge sentiment details if found, otherwise keep sentimentResult null
             sentimentResult: detail ? {
               conversation_id: conv.conversation_id,
               sentiment: detail.sentiment,
               description: detail.description ?? undefined,
             } : null,
           } as AnalyzedConversation;
         });

       console.log(`Merged conversations count: ${mergedConversations.length}`);
       setAnalyzedConversations(mergedConversations);
       // Reset selections when batch data changes
       setSelectedSentiment(null);
       setFilteredSentimentConversations([]);

     } else if (!selectedBatchAnalysisId) {
       // Clear data if no batch is selected
       setAnalyzedConversations([]);
       setSelectedSentiment(null);
       setFilteredSentimentConversations([]);
     }
   }, [initialConversationsData, selectedBatchAnalysisId, selectedBatchConversationIds, batchDetailsData]); // Dependencies for merging


   // Click handler for sentiment bars - Filters the merged conversations
   const handleSentimentClick = (sentiment: 'good' | 'moderate' | 'bad' | 'unknown') => {
     setSelectedSentiment(sentiment);
     console.log(`Filtering for sentiment: ${sentiment}`);
     // Filter the already merged analyzedConversations state
     const filtered = analyzedConversations.filter(conv => conv.sentimentResult?.sentiment === sentiment);
     console.log(`Filtered count: ${filtered.length}`);
     setFilteredSentimentConversations(filtered);
   };


    // Show loading skeleton if either conversations or details are loading for the selected batch
    if ((isLoadingConversations || isLoadingBatchDetailsData) && selectedBatchAnalysisId) {
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

     // Handle errors for both queries
     if (fetchConversationsError || fetchDetailsError) {
       const errorMsg = fetchConversationsError?.message || fetchDetailsError?.message || "An unknown error occurred";
       return <div className="p-4 text-red-500">Error loading data: {errorMsg}</div>;
     }

     // This check might need adjustment depending on whether sentimentResult can be null even after merging
     const hasAnalysisRun = analyzedConversations.some(c => c.sentimentResult !== null);

  return (
    <>
      {/* Main grid container - Changed to 6 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-6 h-full">

        {/* Left panel column - applies border and background. NO PADDING HERE. */}
        <div className="lg:col-span-1 h-full border-r bg-muted/10 overflow-y-auto"> {/* Added overflow-y-auto */}
          {/* BatchSentimentHistoryList will manage its own internal padding */}
          <BatchSentimentHistoryList
            selectedAnalysisId={selectedBatchAnalysisId}
            onSelectAnalysis={handleSelectBatchAnalysis}
              onCreateNewBatch={async () => setIsDateRangeDialogOpen(true)}
              isCreatingBatch={isCreatingBatch}
            />
        </div>

        {/* BatchDateRangeDialog - position might need review based on its modal nature */}
        <BatchDateRangeDialog
            isOpen={isDateRangeDialogOpen}
            onOpenChange={setIsDateRangeDialogOpen}
            onSubmit={handleCreateNewBatchAnalysis}
            isCreatingBatch={isCreatingBatch}
        />

        {/* Center content area - Changed to span 3, added border */}
        <div className="lg:col-span-3 h-full overflow-y-auto p-4 md:p-6 border-r">
          {/* Center Panel Content */}
          {/* Removed redundant inner div */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
              <h1 className="text-2xl font-semibold">Conversation Analysis</h1>
              {selectedBatchAnalysisId && selectedBatchDateRange?.from && selectedBatchDateRange?.to && (
               <p className="text-sm text-muted-foreground">
                 Batch Analysis Date Range: {format(selectedBatchDateRange.from, "LLL dd, y")} -{" "}
                 {format(selectedBatchDateRange.to, "LLL dd, y")}
               </p>
             )}
             <div className="flex items-center space-x-2 flex-wrap">
             </div>
          </div>
          <Tabs defaultValue="divergent-stacked-bar">
           <TabsList className="grid w-full grid-cols-2 gap-2 mb-4">
             <TabsTrigger value="divergent-stacked-bar">Sentiment Distribution</TabsTrigger> 
             <TabsTrigger value="word-cloud">Word Cloud</TabsTrigger> {/* Enabled by default, will show message if no data */}
           </TabsList>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Sentiment Analysis Report</CardTitle>
            </CardHeader>
            <CardContent>
              <TabsContent value="divergent-stacked-bar">
                 <p className="text-sm text-muted-foreground mb-4">
                   Shows the aggregated sentiment distribution for the selected batch analysis run. Click a bar to see related conversations.
                  </p>
                  {/* Pass the batchSentimentCounts state and click handler to the chart */}
                  <DivergentStackedBarChartComponent
                    sentimentCounts={batchSentimentCounts}
                    onBarClick={handleSentimentClick} // Pass the handler
                  />
                </TabsContent>
                <TabsContent value="word-cloud">
                  <p className="text-sm text-muted-foreground mb-4">Frequent terms in conversations from the selected batch.</p>
                <WordCloudComponent data={analyzedConversations} />
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>

        {/* Summary Section - This will show 0 for good/moderate/bad if details aren't stored */}
        {selectedBatchAnalysisId && ( // Show summary if a batch is selected
           <Card className="mt-6">
             <CardHeader>
                <CardTitle>Sentiment Summary (Selected Batch)</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Use batchSentimentCounts for the summary - Removed Moderate */}
                <div className="grid grid-cols-3 gap-4 text-center"> {/* Adjusted grid columns */}
                  <div>
                    <p className="text-2xl font-bold text-green-500">{batchSentimentCounts?.good ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Good</p>
                  </div>
                  {/* Removed Moderate div */}
                  <div>
                    <p className="text-2xl font-bold text-red-500">{batchSentimentCounts?.bad ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Bad</p>
                 </div>
                 <div>
                   <p className="text-2xl font-bold text-gray-500">{batchSentimentCounts?.unknown ?? 0}</p>
                   <p className="text-sm text-muted-foreground">Unknown/Not Analyzed</p>
                 </div>
               </div>
             </CardContent>
            </Card>
            )}
          {/* Removed redundant closing div */}

        </div> {/* End of Center content area */}

        {/* Right panel for conversation list - New Column */}
        <div className="lg:col-span-2 h-full overflow-y-auto p-4 md:p-6 bg-muted/10">
          {selectedSentiment && (
            <SelectedConversationsList
              conversations={filteredSentimentConversations} // Pass the FILTERED list
              selectedSentiment={selectedSentiment}
            />
          )}
          {!selectedSentiment && selectedBatchAnalysisId && (
             <div className="flex items-center justify-center h-full text-muted-foreground">
               <p>Click a sentiment bar in the chart to view conversations.</p>
             </div>
           )}
           {!selectedBatchAnalysisId && (
             <div className="flex items-center justify-center h-full text-muted-foreground">
               <p>Select a batch analysis from the left panel first.</p>
             </div>
           )}
        </div> {/* End of Right panel */}

      </div> {/* End of main grid */}
      <ChatWidget onClick={() => setIsChatOpen(true)} />
      <ChatPopup isOpen={isChatOpen} onOpenChange={setIsChatOpen} />
    </>
  );
}
