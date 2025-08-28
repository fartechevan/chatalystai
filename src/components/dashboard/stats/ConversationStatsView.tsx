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
import { Loader2, DatabaseZap, Calendar as CalendarIcon, PlusCircle, Smile, Frown, Meh } from 'lucide-react'; // Added DatabaseZap icon, CalendarIcon, PlusCircle, Smile, Frown, Meh
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
import { usePageActionContext } from '@/context/PageActionContext'; // Import the context

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
  customer_id?: string | null; // Add customer_id here
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
  try {
    // Optimized: Add proper indexing hint and error handling
    const { data, error } = await supabase
      .from('batch_sentiment_analysis_details')
      .select('conversation_id, sentiment, description, created_at')
      .eq('batch_analysis_id', batchAnalysisId)
      .order('created_at', { ascending: false }); // Order by creation time for consistency

    if (error) {
      console.error('Error fetching batch sentiment details:', error);
      throw new Error(`Failed to fetch sentiment details: ${error.message}`);
    }

    // Validate data integrity
    const validatedData = (data || []).filter(item => {
      if (!item.conversation_id || !item.sentiment) {
        console.warn('Invalid sentiment detail found:', item);
        return false;
      }
      return true;
    });

    return validatedData;
  } catch (error) {
    console.error('Error in fetchBatchSentimentDetails:', error);
    throw error;
  }
};


// Fetch function for conversations and their messages with date filtering and participant role check
const fetchConversationsWithMessages = async (startDate: Date, endDate: Date): Promise<Conversation[]> => {
  try {
    // Optimized: Single query with joins to reduce database round trips
    const { data: conversationsData, error: conversationsError } = await supabase
      .from('conversations')
      .select(`
        conversation_id,
        created_at,
        messages(
          message_id,
          conversation_id,
          content,
          created_at,
          sender_participant_id,
          conversation_participants!inner(
            customer_id,
            role
          )
        )
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (conversationsError) {
      console.error('Error fetching conversations with messages:', conversationsError);
      throw new Error(`Failed to fetch conversations: ${conversationsError.message}`);
    }

    if (!conversationsData || conversationsData.length === 0) {
      return [];
    }

    // Transform the nested data structure
    return conversationsData.map(conv => {
      const messages: Message[] = (conv.messages || []).map(msg => ({
        message_id: msg.message_id,
        conversation_id: msg.conversation_id,
        content: msg.content,
        created_at: msg.created_at,
        sender_participant_id: msg.sender_participant_id,
        is_user: msg.conversation_participants?.role === 'member',
        customer_id: msg.conversation_participants?.role === 'member' 
          ? msg.conversation_participants.customer_id 
          : undefined,
      })).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      return {
        conversation_id: conv.conversation_id,
        created_at: conv.created_at,
        messages,
      };
    });
  } catch (error) {
    console.error('Error in fetchConversationsWithMessages:', error);
    throw error;
  }
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
  // const [isDateRangeDialogOpen, setIsDateRangeDialogOpen] = useState(false); // Controlled by context now
  const { isBatchDateRangeDialogOpen, setIsBatchDateRangeDialogOpen } = usePageActionContext(); // Use context
  // Add state for sentiment counts
  const [batchSentimentCounts, setBatchSentimentCounts] = useState<{ good: number; moderate: number; bad: number; unknown: number } | null>(null);
  // Add state for selected sentiment
  const [selectedSentiment, setSelectedSentiment] = useState<'good' | 'moderate' | 'bad' | 'unknown' | null>(null);
  const [filteredSentimentConversations, setFilteredSentimentConversations] = useState<AnalyzedConversation[]>([]); // Re-add filtered state
  
  // State for showing sentiment details view
  const [showSentimentDetails, setShowSentimentDetails] = useState<boolean>(false);
  const [selectedConversationForDetails, setSelectedConversationForDetails] = useState<AnalyzedConversation | null>(null);


  const handleSelectBatchAnalysis = async (id: string | null) => {
     setSelectedBatchAnalysisId(id);
     setSelectedSentiment(null); // Reset sentiment selection when batch changes
     setSelectedBatchDateRange(undefined);

     if (id) {
      setIsLoadingBatchDetails(true);
      try {
        // Optimized: Fetch batch details with better error handling and caching
        const { data: batchData, error: batchError } = await supabase
          .from('batch_sentiment_analysis')
          .select('conversation_ids, start_date, end_date, positive_count, negative_count, neutral_count, unknown_count')
          .eq('id', id)
          .single<BatchDetails>();

        if (batchError) {
          console.error('Batch fetch error:', batchError);
          throw new Error(`Failed to fetch batch details: ${batchError.message}`);
        }

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
          // Optimized: More robust count mapping with fallbacks
          setBatchSentimentCounts({
            good: batchData.positive_count ?? 0,
            moderate: batchData.neutral_count ?? 0,
            bad: batchData.negative_count ?? 0,
            unknown: batchData.unknown_count ?? 0,
          });
        } else {
          setSelectedBatchConversationIds([]);
          setSelectedBatchDateRange(undefined);
          setBatchSentimentCounts(null);
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
      setIsBatchDateRangeDialogOpen(false); // Use context setter

    } catch (error: unknown) { 
      console.error("Error creating new batch analysis:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setBatchCreationError(errorMessage || "Failed to start batch analysis.");
      toast({ title: "Batch Analysis Failed", description: errorMessage, variant: "destructive" }); 
    } finally {
      setIsCreatingBatch(false);
    }
  };

  // Optimized: Enhanced query with better caching and error handling
  const { data: initialConversationsData, isLoading: isLoadingConversations, error: fetchConversationsError } = useQuery<Conversation[], Error, Conversation[], (string | Date | null | undefined)[]>(
    {
      queryKey: ['conversationsForBatch', selectedBatchAnalysisId, selectedBatchDateRange?.from?.toISOString(), selectedBatchDateRange?.to?.toISOString()], 
      queryFn: async (): Promise<Conversation[]> => {
        try {
          if (selectedBatchAnalysisId && selectedBatchDateRange?.from && selectedBatchDateRange?.to) {
             return await fetchConversationsWithMessages(selectedBatchDateRange.from, selectedBatchDateRange.to);
          }
          return [];
        } catch (error) {
          console.error('Failed to fetch conversations:', error);
          toast({ 
            title: "Error Loading Conversations", 
            description: error instanceof Error ? error.message : "Unknown error occurred", 
            variant: "destructive" 
          });
          throw error; // Re-throw to let React Query handle the error state
        }
      },
      enabled: !!selectedBatchAnalysisId && !!selectedBatchDateRange?.from && !!selectedBatchDateRange?.to,
      staleTime: 5 * 60 * 1000, // 5 minutes - conversations don't change frequently
      gcTime: 10 * 60 * 1000, // 10 minutes cache
      retry: (failureCount, error) => {
        // Retry up to 2 times for network errors, but not for data validation errors
        if (failureCount >= 2) return false;
        return error instanceof Error && error.message.includes('Failed to fetch');
      },
    }
  );

   // Optimized: Enhanced sentiment details query with better caching
   const { data: batchDetailsData, isLoading: isLoadingBatchDetailsData, error: fetchDetailsError } = useQuery<BatchSentimentDetail[], Error, BatchSentimentDetail[], (string | null)[]>(
     {
       queryKey: ['batchSentimentDetails', selectedBatchAnalysisId],
       queryFn: async (): Promise<BatchSentimentDetail[]> => {
         try {
           if (!selectedBatchAnalysisId) return [];
           return await fetchBatchSentimentDetails(selectedBatchAnalysisId);
         } catch (error) {
           console.error('Failed to fetch sentiment details:', error);
           toast({ 
             title: "Error Loading Sentiment Details", 
             description: error instanceof Error ? error.message : "Unknown error occurred", 
             variant: "destructive" 
           });
           throw error; // Re-throw to let React Query handle the error state
         }
       },
       enabled: !!selectedBatchAnalysisId,
       staleTime: 2 * 60 * 1000, // 2 minutes - sentiment details might update more frequently
       gcTime: 5 * 60 * 1000, // 5 minutes cache
       retry: (failureCount, error) => {
         if (failureCount >= 2) return false;
         return error instanceof Error && error.message.includes('Failed to fetch');
       },
     }
   );


   // Optimized: Memoized data merging with better performance
   useEffect(() => {
     // Clear data immediately if no batch is selected
     if (!selectedBatchAnalysisId) {
       setAnalyzedConversations([]);
       setSelectedSentiment(null);
       setFilteredSentimentConversations([]);
       return;
     }

     // Ensure data is not undefined before proceeding
     const conversations: Conversation[] = initialConversationsData || [];
     const batchConversationIds: string[] = selectedBatchConversationIds || [];
     const detailsData: BatchSentimentDetail[] = batchDetailsData || [];

     // Wait for all required data to be available
     if (conversations.length === 0 || batchConversationIds.length === 0 || detailsData.length === 0) {
       return;
     }

     // Optimized: Use more efficient data structures and processing
     console.log('🔍 DEBUG: Merging conversations - selectedBatchConversationIds:', batchConversationIds);
     console.log('🔍 DEBUG: Merging conversations - batchDetailsData:', detailsData);
     console.log('🔍 DEBUG: Merging conversations - initialConversationsData length:', conversations.length);
     
     const batchConvIdsSet = new Set(batchConversationIds);
     const sentimentDetailsMap = new Map(
       detailsData.map(d => [d.conversation_id, d])
     );
     
     console.log('🔍 DEBUG: sentimentDetailsMap size:', sentimentDetailsMap.size);
     console.log('🔍 DEBUG: sentimentDetailsMap entries:', Array.from(sentimentDetailsMap.entries()));

     const mergedConversations = conversations
       .filter(conv => batchConvIdsSet.has(conv.conversation_id))
       .map(conv => {
         const detail = sentimentDetailsMap.get(conv.conversation_id);
         console.log(`🔍 DEBUG: Merging conversation ${conv.conversation_id} - found detail:`, detail);
         return {
           ...conv,
           sentimentResult: detail ? {
             conversation_id: conv.conversation_id,
             sentiment: detail.sentiment as 'good' | 'moderate' | 'bad' | 'unknown', // Type assertion
             description: detail.description ?? undefined,
           } : null,
         } as AnalyzedConversation;
       })
       .sort((a, b) => {
         // Sort by creation date, newest first
         return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
       });
       
     console.log('🔍 DEBUG: Final mergedConversations:', mergedConversations);
     console.log('🔍 DEBUG: Conversations with sentimentResult:', mergedConversations.filter(c => c.sentimentResult !== null));

     setAnalyzedConversations(mergedConversations);
     
     // Reset selections when batch data changes
     setSelectedSentiment(null);
     setFilteredSentimentConversations([]);

   }, [
     selectedBatchAnalysisId,
     initialConversationsData,
     selectedBatchConversationIds,
     batchDetailsData
   ]);


   // Click handler for sentiment bars - Filters the merged conversations
   const handleSentimentClick = (sentiment: 'good' | 'moderate' | 'bad' | 'unknown') => {
     console.log('🔍 DEBUG: handleSentimentClick called with sentiment:', sentiment);
     console.log('🔍 DEBUG: analyzedConversations length:', analyzedConversations.length);
     console.log('🔍 DEBUG: analyzedConversations sample:', analyzedConversations.slice(0, 3));
     console.log('🔍 DEBUG: batchDetailsData:', batchDetailsData);
     
     setSelectedSentiment(sentiment);
     // Filter the already merged analyzedConversations state
     const filtered = analyzedConversations.filter(conv => {
       const hasSentimentResult = conv.sentimentResult?.sentiment === sentiment;
       console.log(`🔍 DEBUG: Conversation ${conv.conversation_id} - sentimentResult:`, conv.sentimentResult, 'matches:', hasSentimentResult);
       return hasSentimentResult;
     });
     
     console.log('🔍 DEBUG: Filtered conversations count:', filtered.length);
     console.log('🔍 DEBUG: Filtered conversations:', filtered);
     
     setFilteredSentimentConversations(filtered);
     // Reset detail view states
     setShowSentimentDetails(false);
     setSelectedConversationForDetails(null);
   };

   // Handler for clicking on individual conversations to show details
   const handleConversationDetailClick = (conversation: AnalyzedConversation) => {
     setSelectedConversationForDetails(conversation);
     setShowSentimentDetails(true);
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
    } // Closing brace for the loading `if` block

     // Handle errors for both queries
     if (fetchConversationsError || fetchDetailsError) {
       const errorMsg = fetchConversationsError?.message || fetchDetailsError?.message || "An unknown error occurred";
       return <div className="p-4 text-red-500">Error loading data: {errorMsg}</div>;
     } // Closing brace for the error `if` block

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
            // onCreateNewBatch prop removed
            isCreatingBatch={isCreatingBatch}
            />
        </div>

        {/* BatchDateRangeDialog - position might need review based on its modal nature */}
        <BatchDateRangeDialog
            isOpen={isBatchDateRangeDialogOpen} // Use context state
            onOpenChange={setIsBatchDateRangeDialogOpen} // Use context setter
            onSubmit={handleCreateNewBatchAnalysis}
            isCreatingBatch={isCreatingBatch}
        />

        {/* Center content area - Changed to span 3, added border */}
        <div className="lg:col-span-3 h-full overflow-y-auto p-4 md:p-6 border-r">
          {/* Center Panel Content */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
              <div className="flex-grow">
                <h1 className="text-2xl font-semibold">Conversation Analysis</h1>
                {selectedBatchAnalysisId && selectedBatchDateRange?.from && selectedBatchDateRange?.to && (
                 <p className="text-sm text-muted-foreground mt-1">
                   Batch Date Range: {format(selectedBatchDateRange.from, "LLL dd, y")} -{" "}
                   {format(selectedBatchDateRange.to, "LLL dd, y")}
                 </p>
               )}
              </div>
             {/* Removed the local "Create New Batch" button div */}
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
                {/* Use batchSentimentCounts for the summary - Enhanced with Icons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="flex flex-col items-center p-2">
                    <Smile className="h-8 w-8 text-green-500 mb-1" />
                    <p className="text-2xl font-bold text-green-500">{batchSentimentCounts?.good ?? 0}</p>
                    <p className="text-xs text-muted-foreground">GOOD</p>
                  </div>
                  <div className="flex flex-col items-center p-2">
                    <Meh className="h-8 w-8 text-yellow-500 mb-1" />
                    <p className="text-2xl font-bold text-yellow-500">{batchSentimentCounts?.moderate ?? 0}</p>
                    <p className="text-xs text-muted-foreground">MODERATE</p>
                  </div>
                  <div className="flex flex-col items-center p-2">
                    <Frown className="h-8 w-8 text-red-500 mb-1" />
                    <p className="text-2xl font-bold text-red-500">{batchSentimentCounts?.bad ?? 0}</p>
                    <p className="text-xs text-muted-foreground">BAD</p>
                 </div>
                 <div className="flex flex-col items-center p-2">
                   <Meh className="h-8 w-8 text-gray-500 mb-1" />
                   <p className="text-2xl font-bold text-gray-500">{batchSentimentCounts?.unknown ?? 0}</p>
                   <p className="text-xs text-muted-foreground">UNKNOWN</p>
                 </div>
               </div>
             </CardContent>
            </Card>
            )}
          {/* Removed redundant closing div */}

        </div> {/* End of Center content area */}

        {/* Right panel for conversation list or sentiment details - New Column */}
        <div className="lg:col-span-2 h-full overflow-y-auto p-4 md:p-6 bg-muted/10">
          {showSentimentDetails && selectedConversationForDetails ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Conversation Details</h3>
                <button
                  onClick={() => setShowSentimentDetails(false)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Back to list
                </button>
              </div>
              
              {/* Sentiment Analysis Details */}
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-medium mb-2">Sentiment Analysis</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Sentiment:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      selectedConversationForDetails.sentimentResult?.sentiment === 'good' ? 'bg-green-100 text-green-800' :
                      selectedConversationForDetails.sentimentResult?.sentiment === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                      selectedConversationForDetails.sentimentResult?.sentiment === 'bad' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedConversationForDetails.sentimentResult?.sentiment?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </div>
                  {selectedConversationForDetails.sentimentResult?.description && (
                    <div>
                      <span className="text-sm font-medium">Reason:</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedConversationForDetails.sentimentResult.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Conversation Messages */}
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-medium mb-3">Messages</h4>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedConversationForDetails.messages.map((message, index) => (
                    <div key={index} className={`p-3 rounded-lg ${
                      message.is_user ? 'bg-blue-50 ml-4' : 'bg-gray-50 mr-4'
                    }`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          {message.is_user ? 'Customer' : 'Agent'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : selectedSentiment ? (
            <SelectedConversationsList
              conversations={filteredSentimentConversations}
              selectedSentiment={selectedSentiment}
              onConversationClick={handleConversationDetailClick}
            />
          ) : selectedBatchAnalysisId ? (
             <div className="flex items-center justify-center h-full text-muted-foreground">
               <p>Click a sentiment bar in the chart to view conversations.</p>
             </div>
           ) : (
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
