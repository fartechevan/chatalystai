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

// Define type for batch details fetch
type BatchDetails = {
  conversation_ids: string[] | null;
  start_date: string | null;
  end_date: string | null;
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

  const hasAnalyzedData = data.some(d => d.sentimentResult !== null && d.sentimentResult.sentiment !== 'unknown'); // Adjusted to check for actual sentiment
  const totalSentiments = chartData[0].good + chartData[0].moderate + chartData[0].bad + chartData[0].unknown;

  if (data.length > 0 && !hasAnalyzedData && data.every(d => d.sentimentResult === null || d.sentimentResult.sentiment === 'unknown')) {
      return <div className="text-center text-muted-foreground p-4">Conversations loaded. Sentiment details for this batch are not available or all are 'unknown'.</div>;
  }
  if (totalSentiments === 0 && data.length === 0) {
       return <div className="text-center text-muted-foreground p-4">No conversation data available for the selected batch.</div>;
  }
   if (totalSentiments === 0 && hasAnalyzedData) { // This case might be rare now
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
  const [selectedSentiment, setSelectedSentiment] = useState<'good' | 'moderate' | 'bad' | 'unknown' | null>(null);
  const [filteredSentimentConversations, setFilteredSentimentConversations] = useState<AnalyzedConversation[]>([]);
  const [selectedBatchAnalysisId, setSelectedBatchAnalysisId] = useState<string | null>(null);
  const [selectedBatchConversationIds, setSelectedBatchConversationIds] = useState<string[] | null>(null);
  const [isCreatingBatch, setIsCreatingBatch] = useState(false); 
  const [batchCreationError, setBatchCreationError] = useState<string | null>(null);
  const [selectedBatchDateRange, setSelectedBatchDateRange] = useState<DateRange | undefined>(undefined); 
  const [isLoadingBatchDetails, setIsLoadingBatchDetails] = useState(false); 
  const [isDateRangeDialogOpen, setIsDateRangeDialogOpen] = useState(false); 

  const handleSelectBatchAnalysis = async (id: string | null) => {
    setSelectedBatchAnalysisId(id);
    setSelectedSentiment(null);
    setFilteredSentimentConversations([]);
    setSelectedBatchDateRange(undefined); 

    if (id) {
      setIsLoadingBatchDetails(true);
      try {
        // Fetch batch details including conversation_ids and date range
        // Re-add 'as any' temporarily to fix TS error
        const { data: batchData, error: batchError } = await supabase
          .from('batch_sentiment_analysis' as any) // Re-add 'as any'
          .select('conversation_ids, start_date, end_date')
          .eq('id', id)
          .single<BatchDetails>(); // Keep BatchDetails type for structure hint

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
        } else {
          setSelectedBatchConversationIds([]);
          setSelectedBatchDateRange(undefined);
        }

      } catch (error) {
        console.error("Error fetching batch details:", error);
        toast({ title: "Error fetching batch details", variant: "destructive" });
        setSelectedBatchConversationIds(null);
        setSelectedBatchDateRange(undefined);
      } finally {
        setIsLoadingBatchDetails(false);
      }
    } else {
      setSelectedBatchConversationIds(null); 
      setSelectedBatchDateRange(undefined); 
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

  useEffect(() => {
    if (selectedBatchAnalysisId && initialConversationsData && selectedBatchConversationIds) {
      const batchConvIdsSet = new Set(selectedBatchConversationIds);
      const conversationsFromBatch = initialConversationsData.filter(conv =>
        batchConvIdsSet.has(conv.conversation_id)
      );
      // Since detailed sentiment for past batches isn't stored, set sentimentResult to null
      setAnalyzedConversations(conversationsFromBatch.map(conv => ({ ...conv, sentimentResult: null } as AnalyzedConversation)));
    } else if (!selectedBatchAnalysisId) {
      setAnalyzedConversations([]);
    }
    setSelectedSentiment(null);
    setFilteredSentimentConversations([]);
  }, [initialConversationsData, selectedBatchAnalysisId, selectedBatchConversationIds]); 

  // Removed the useEffect that tried to fetch from 'batch_sentiment_analysis_details'
  // as this table does not exist and individual results are not stored per batch.

  const handleSentimentClick = useCallback((sentiment: 'good' | 'moderate' | 'bad' | 'unknown') => {
    setSelectedSentiment(sentiment);
    const filtered = analyzedConversations.filter(
      conv => conv.sentimentResult?.sentiment === sentiment
    );
    setFilteredSentimentConversations(filtered);
  }, [analyzedConversations]);


  if (isLoadingConversations && selectedBatchAnalysisId) { 
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

  const hasAnalysisRun = analyzedConversations.some(c => c.sentimentResult !== null && c.sentimentResult.sentiment !== 'unknown');

  return (
    <>
      {/* Main grid container - NO PADDING HERE */}
      <div className="grid grid-cols-1 lg:grid-cols-4 h-full">

        {/* Left panel column - applies border and background. NO PADDING HERE. */}
        <div className="lg:col-span-1 h-full border-r bg-muted/10">
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

        {/* Main content area (center and right panels) - applies its own padding */}
        <div className="lg:col-span-3 h-full overflow-y-auto p-4 md:p-6">
          {/* Center Panel Content */}
          <div className="space-y-4">
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
                  Shows sentiment distribution for the selected batch. 
                  Currently, detailed per-conversation sentiment for past batches is not stored.
                </p>
                <DivergentStackedBarChartComponent data={analyzedConversations} onBarClick={handleSentimentClick} />
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
                   <p className="text-2xl font-bold text-gray-500">
                     {analyzedConversations.filter(c => c.sentimentResult === null || c.sentimentResult.sentiment === 'unknown').length}
                   </p>
                   <p className="text-sm text-muted-foreground">Unknown/Not Available</p>
                 </div>
               </div>
             </CardContent>
           </Card>
          )}
          </div> {/* End of Center Panel Content */}

          {/* Right Panel Content */}
          <div className="mt-4 lg:mt-0"> {/* Removed lg:col-span-1, let content flow or use flex/grid if needed */}
            {selectedSentiment && (
              <Card>
                <CardHeader>
                <CardTitle className="capitalize flex justify-between items-center">
                  {selectedSentiment} Conversations ({filteredSentimentConversations.length})
                  <Button variant="ghost" size="sm" onClick={() => setSelectedSentiment(null)}>X</Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                  <SelectedConversationsList conversations={filteredSentimentConversations} />
                </CardContent>
              </Card>
            )}
          </div> {/* End of original right column content */}
        </div> {/* End of new main content container */}
      </div> {/* End of main grid */}
      <ChatWidget onClick={() => setIsChatOpen(true)} />
      <ChatPopup isOpen={isChatOpen} onOpenChange={setIsChatOpen} />
    </>
  );
}
