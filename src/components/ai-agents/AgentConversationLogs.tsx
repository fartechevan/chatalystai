import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Keep for other alerts if needed
// Skeleton might not be needed directly if ConditionalRenderer handles its own default
import { MessageSquare, Loader2, PowerOff, BookPlus, Info, Terminal } from 'lucide-react'; // Added Info, Terminal for ConditionalRenderer defaults
import { supabase } from '@/integrations/supabase/client';
// Correct the import path for the Database type to match the client's type source
import type { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog as ShadDialog, // Alias Dialog
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose, // Added DialogClose
} from "@/components/ui/dialog";
import DocumentSelector from '@/components/knowledge/DocumentSelector'; // Changed to default import
import { saveChunkWithEmbedding } from '@/lib/knowledgebase'; // Added saveChunkWithEmbedding
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { listKnowledgeDocuments, KnowledgeDocument } from '@/services/knowledge/documentService';
import ConditionalRenderer from '@/components/shared/ConditionalRenderer'; // Import ConditionalRenderer

// Define type alias for the table row from generated types - Use agent_conversations
type AgentConversationRow = Database['public']['Tables']['agent_conversations']['Row'];
// Define type for the structure returned by the query, including joins
// We explicitly define the expected shape of the joined data
// Based on agent_conversations linking to ai_agent_sessions
type AgentConversationWithDetails = AgentConversationRow & { // Use AgentConversationRow
  ai_agent_sessions: {
    contact_identifier: string | null;
    ai_agents: { // Restore nested agent type
      name: string | null;
    } | null;
  } | null;
};

// Props for the component
interface AgentConversationLogsProps {
  sessionId: string | null; // Allow sessionId to be null initially
}

// Function to fetch conversation logs for a specific session
// Let TypeScript infer the return type
const fetchConversationLogs = async (
  sessionId: string,
  page: number,
  pageSize: number
) => {
  // Removed console.log for input

  if (!sessionId) {
    return { logs: [], count: 0 };
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;

  // Base query - Use the correct table 'agent_conversations'
  const query = supabase
    .from('agent_conversations') // Use the correct table name
    .select(`
      *,
      ai_agent_sessions (
        contact_identifier,
        ai_agents ( name )
      )
    `, { count: 'exact' }) // Removed comments from select string
    .eq('session_id', sessionId) // Filter by session ID
    .order('message_timestamp', { ascending: false })
    .range(from, to);

  // Let Supabase infer the result type
  const { data, error, count } = await query;

  // Removed console.log for result

  if (error) {
    // Log more detailed error information from Supabase/PostgREST
    console.error("Error fetching conversation logs for session:", sessionId);
    console.error("Error Message:", error.message);
    console.error("Error Details:", error.details);
    console.error("Error Hint:", error.hint);
    console.error("Full Error Object:", error);
    // if (error.message.includes('relation "conversations" does not exist')) { // Keep this check if needed
    //    console.error("Type generation might be out of sync or table name incorrect."); // Keep this check if needed
    // }
    throw new Error(error.message || 'Failed to fetch conversation logs.');
  }

  const logs = data || [];
  // Return the data, type should be inferred by TS
  return { logs, count };
};

const LOGS_PAGE_SIZE = 20; // Number of logs per page

const AgentConversationLogs: React.FC<AgentConversationLogsProps> = ({ sessionId }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(0);
  const [isChunkDialogOpen, setIsChunkDialogOpen] = useState(false);
  const [selectedMessageContent, setSelectedMessageContent] = useState<string | null>(null); // Keep this to know original message if needed
  const [questionText, setQuestionText] = useState(''); // State for Q input
  const [answerText, setAnswerText] = useState(''); // State for A input
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [isSavingChunk, setIsSavingChunk] = useState(false);

  // Reset page and dialog state when sessionId changes
  React.useEffect(() => {
    setCurrentPage(0);
    setIsChunkDialogOpen(false);
    setSelectedMessageContent(null);
    setQuestionText(''); // Reset Q&A state
    setAnswerText('');   // Reset Q&A state
    setSelectedDocumentId(null);
    setCurrentPage(0);
  }, [sessionId]);

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery({
    queryKey: ['agentConversationLogs', sessionId, currentPage, LOGS_PAGE_SIZE],
    queryFn: () => sessionId ? fetchConversationLogs(sessionId, currentPage, LOGS_PAGE_SIZE) : Promise.resolve({ logs: [], count: 0 }),
    placeholderData: (previousData) => previousData,
     enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // Keep logs fresh for 5 mins
  });

  // --- Query to fetch available knowledge documents ---
  const {
    data: documentsData,
    isLoading: isLoadingDocuments,
    isError: isErrorDocuments,
    error: errorDocuments,
  } = useQuery<KnowledgeDocument[], Error>({ // Specify types for useQuery
    queryKey: ['knowledgeDocuments'],
    queryFn: listKnowledgeDocuments,
    staleTime: 15 * 60 * 1000, // Cache documents for 15 mins
  });

  // Access data safely, let TS infer type from useQuery
  const logsToDisplay = data?.logs ?? []; // Renamed for clarity when passing to ConditionalRenderer
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / LOGS_PAGE_SIZE);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextPage = () => { // Added the missing handleNextPage function
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

  // --- Mutation to end the session ---
  const endSessionMutation = useMutation({
    mutationFn: async (sessionIdToEnd: string) => {
      const { error: functionError } = await supabase.functions.invoke('end-agent-session', { // Renamed error to functionError
        body: { session_id: sessionIdToEnd },
      });
      if (functionError) { // Check functionError
        throw new Error(functionError.message || 'Failed to end session.');
      }
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Session ended successfully." });
      // Invalidate queries to refresh lists/status
      queryClient.invalidateQueries({ queryKey: ['recentAgentSessions'] });
      // Optionally invalidate this specific session's logs if needed,
      // though the view might change anyway if the parent clears the selection.
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: ['agentConversationLogs', sessionId] });
      }
      // Consider calling a prop function here if the parent needs to react (e.g., clear selection)
      // onSessionEnded?.();
    },
    onError: (mutationError: Error) => { // Explicitly type mutationError
      toast({ variant: "destructive", title: "Error", description: `Failed to end session: ${mutationError.message}` });
    },
  });

  const handleEndSession = () => {
    if (sessionId) {
      endSessionMutation.mutate(sessionId);
    }
  };

  // --- Function to handle saving the message as a chunk ---
  const handleSaveChunk = async () => {
    // Use questionText and answerText for validation and saving
    // Require question (pre-filled), answer, and document
    if (!questionText.trim() || !answerText.trim() || !selectedDocumentId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Question, Answer, and Document must be provided.",
      });
      return;
    }

    setIsSavingChunk(true);
    // Format as Q&A, handle empty question gracefully
    const formattedContent = `Q: ${questionText.trim() || '(No question provided)'}\nA: ${answerText.trim()}`;
    try {
      await saveChunkWithEmbedding(formattedContent, selectedDocumentId); // Save formatted content
      toast({
        title: "Success",
        description: "Q&A added as a knowledge chunk.", // Updated success message
      });
      setIsChunkDialogOpen(false); // Close dialog on success
      setSelectedMessageContent(null); // Reset original message state
      setQuestionText(''); // Reset Q state
      setAnswerText('');   // Reset A state
      setSelectedDocumentId(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (saveError: any) { // Explicitly type saveError
      console.error("Error saving chunk:", saveError);
      toast({
        variant: "destructive",
        title: "Error Saving Chunk",
        description: saveError.message || "Failed to save message as chunk.",
      });
    } finally {
      setIsSavingChunk(false);
    }
  };

  // --- Function to handle opening the dialog ---
  const handleOpenChunkDialog = (content: string | null | undefined) => {
    if (content) {
      setSelectedMessageContent(content); // Keep original message if needed elsewhere
      setQuestionText(content); // Pre-fill question with message content
      setAnswerText(''); // Clear previous answer
      setSelectedDocumentId(null); // Reset document selection
      setIsChunkDialogOpen(true);
    } else {
       toast({ variant: "destructive", title: "Error", description: "Cannot add empty message as chunk." });
    }
  };

  return (
    <>
      <ShadDialog open={isChunkDialogOpen} onOpenChange={setIsChunkDialogOpen}>
        <Card className="w-full h-full flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-x-4">
            <CardTitle className="flex-grow">
            {/* Display the full session ID */}
            {sessionId ? `Conversation Logs (Session: ${sessionId})` : 'Select a Session'}
          </CardTitle>
            {sessionId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEndSession}
                disabled={endSessionMutation.isPending}
                className="ml-2"
              >
                {endSessionMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PowerOff className="h-4 w-4" />
                )}
                End Session
              </Button>
            )}
        </CardHeader>
        <CardContent className="flex-grow overflow-auto p-4">
           {!sessionId ? (
             <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
               <MessageSquare className="h-12 w-12 mb-4" />
               <p className="text-lg font-semibold">Select a Session</p>
              <p className="text-sm">Please select an agent session to view its conversation logs.</p>
            </div>
          ) : (
            <ConditionalRenderer<AgentConversationWithDetails, Error>
              isLoading={isLoading && !data} // Show loading only on initial fetch or if data is undefined
              isError={isError}
              error={error}
              data={logsToDisplay}
              renderItem={(log: AgentConversationWithDetails) => (
                <div
                  key={log.id}
                  className={cn(
                    "flex w-full group",
                    log.sender_type === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {/* Simplified DialogTrigger for diagnostics - This was the temporary change */}
                  {/* <DialogTrigger asChild onClick={() => handleOpenChunkDialog(log.message_content)}> */}
                  {/*  <Button variant="outline" size="sm" className="m-1">Log: {log.id.substring(0, 8)}</Button> */}
                  {/* </DialogTrigger> */}
                  {/* Restoring original complex div structure */}
                  <DialogTrigger asChild onClick={() => handleOpenChunkDialog(log.message_content)}>
                    <div
                      className={cn(
                        "max-w-[75%] rounded-lg p-3 shadow-sm relative cursor-pointer hover:shadow-md transition-shadow",
                        log.sender_type === 'user'
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      )}
                    >
                      <BookPlus className="absolute top-1 right-1 h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex justify-between items-center mb-1 text-xs opacity-70">
                        <span>
                          {log.sender_type === 'user' ? (log.ai_agent_sessions?.contact_identifier || 'User') : (log.ai_agent_sessions?.ai_agents?.name || 'AI')}
                        </span>
                        <span>
                          {log.message_timestamp ? new Date(log.message_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No timestamp'}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{log.message_content || <i>(No message content)</i>}</p>
                      {log.knowledge_used && (
                        <p className="text-xs opacity-60 mt-2 pt-1 border-t border-current/20">
                          Knowledge Used: {JSON.stringify(log.knowledge_used)}
                        </p>
                      )}
                    </div>
                  </DialogTrigger>
                </div>
              )}
              layout="list" // Explicitly list layout
              className="space-y-3 flex flex-col" // Apply original container classes
              loadingItemCount={5} // Number of skeletons for logs
              emptyTitle="No Conversation Logs Found"
              emptyMessage="No interactions recorded for this session yet."
              errorTitle="Error Loading Logs"
              // errorMessage will use default from error object
            />
          )}
        </CardContent>
        {sessionId && totalCount > 0 && totalPages > 1 && ( // Also check totalCount > 0 before showing pagination
          <div className="flex items-center justify-between p-4 border-t">
            <Button
              variant="outline"
              onClick={handlePreviousPage}
              disabled={currentPage === 0 || isFetching}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages - 1 || isFetching}
            >
              {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Next
            </Button>
          </div>
        )}
      </Card> {/* Closing Card tag */}

      {/* Dialog Content is now correctly placed within the main Dialog */}
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add Message to Knowledge Document</DialogTitle>
          <DialogDescription>
            Select a document to add the following message content as a new knowledge chunk.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Textareas for Q&A */}
          <div className="space-y-2">
            <Label htmlFor="question-input">Question (Message Content)</Label>
            <Textarea
              id="question-input"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="answer-input">Answer</Label>
            <Textarea
              id="answer-input"
              placeholder="Enter the answer to the question..."
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              rows={5}
              className="min-h-[100px]" // Ensure decent height
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="document-selector">Select Document</Label>
            <DocumentSelector
              selectedDocumentIds={selectedDocumentId ? [selectedDocumentId] : []}
              onSelectionChange={(selectedIds) => {
                 setSelectedDocumentId(selectedIds[0] || null);
               }}
               availableDocuments={documentsData || []}
               isLoading={isLoadingDocuments}
               isError={isErrorDocuments}
               error={errorDocuments} // Pass the error object for documents
               placeholder="Select a document..."
             />
           </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
             <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleSaveChunk}
            disabled={!selectedDocumentId || isSavingChunk}
          >
            {isSavingChunk ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookPlus className="mr-2 h-4 w-4" />}
            Save Chunk
          </Button>
        </DialogFooter>
      </DialogContent>
    </ShadDialog> 
    </>
  );
};

export default AgentConversationLogs;
