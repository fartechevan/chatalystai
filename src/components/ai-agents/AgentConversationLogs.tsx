import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/types/supabase'; // Import the Database type
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Define type alias for the table row from generated types
type AgentConversationRow = Database['public']['Tables']['agent_conversations']['Row'];
// Define type for the structure returned by the query, including joins
// We explicitly define the expected shape of the joined data
type AgentConversationWithDetails = AgentConversationRow & {
  ai_agent_sessions: {
    contact_identifier: string | null;
    ai_agents: {
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

  // Base query - Use ts-expect-error to suppress persistent type error
  // @ts-expect-error - Bypassing persistent "No overload matches" error
  const query = supabase
    .from('agent_conversations') // Rely on client typing
    .select(`
      *,
      ai_agent_sessions (
        contact_identifier,
        ai_agents ( name )
      )
    `, { count: 'exact' })
    .eq('session_id', sessionId) // Filter by session ID
    .order('message_timestamp', { ascending: false })
    .range(from, to);

  // Let Supabase infer the result type
  const { data, error, count } = await query;

  // Removed console.log for result

  if (error) {
    console.error("Error fetching conversation logs for session:", sessionId, error);
    if (error.message.includes('relation "agent_conversations" does not exist')) {
       console.error("Type generation might be out of sync or table name incorrect.");
    }
    throw new Error(error.message || 'Failed to fetch conversation logs.');
  }

  const logs = data || [];
  // Return the data, type should be inferred by TS
  return { logs, count };
};

const LOGS_PAGE_SIZE = 20; // Number of logs per page

const AgentConversationLogs: React.FC<AgentConversationLogsProps> = ({ sessionId }) => {
  // Reset page to 0 when sessionId changes
  const [currentPage, setCurrentPage] = useState(0);
  React.useEffect(() => {
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
    staleTime: 5 * 60 * 1000,
  });

   // Access data safely, let TS infer type from useQuery
  const logs = data?.logs ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / LOGS_PAGE_SIZE);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
  };


  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader>
        <CardTitle>
          {sessionId ? `Conversation Logs (Session: ${sessionId.substring(0, 8)}...)` : 'Select a Session'}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-auto p-4">
         {!sessionId ? (
           <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
             <MessageSquare className="h-12 w-12 mb-4" />
             <p className="text-lg font-semibold">Select a Session</p>
             <p className="text-sm">Please select an agent session to view its conversation logs.</p>
           </div>
         ) : isLoading ? (
           <div className="space-y-4 p-4">
             <Skeleton className="h-20 w-full" />
             <Skeleton className="h-20 w-full" />
             <Skeleton className="h-20 w-full" />
          </div>
        ) : isError ? (
          <Alert variant="destructive" className="m-4">
            <MessageSquare className="h-4 w-4" />
            <AlertTitle>Error Loading Logs</AlertTitle>
            <AlertDescription>{(error as Error)?.message || 'Failed to fetch conversation logs.'}</AlertDescription>
          </Alert>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
            <MessageSquare className="h-12 w-12 mb-4" />
            <p className="text-lg font-semibold">No Conversation Logs Found</p>
            <p className="text-sm">No interactions recorded for this session yet.</p>
          </div>
        ) : (
           <div className="space-y-3 flex flex-col">
             {/* Remove 'any' type, rely on inference or specific type */}
             {logs.map((log) => (
               <div
                 key={log.id}
                 className={cn(
                   "flex w-full",
                   log.sender_type === 'user' ? 'justify-end' : 'justify-start'
                 )}
               >
                 <div
                   className={cn(
                     "max-w-[75%] rounded-lg p-3 shadow-sm",
                     log.sender_type === 'user'
                       ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                       : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                   )}
                 >
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
               </div>
             ))}
           </div>
        )}
      </CardContent>
       {sessionId && totalPages > 1 && (
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
    </Card>
  );
};

export default AgentConversationLogs;
