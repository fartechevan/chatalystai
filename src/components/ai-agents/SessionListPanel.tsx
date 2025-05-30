import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { List } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/types/supabase';
import { Badge } from '@/components/ui/badge'; // Import Badge for status

// Define the possible statuses based on the ENUM type in the database
type SessionStatus = 'active' | 'closed' | 'error';

type SessionRow = Omit<Database['public']['Tables']['ai_agent_sessions']['Row'], 'status'> & { // Omit the original status type if it exists
  status: SessionStatus; // Use the defined SessionStatus type
  ai_agents: { name: string | null } | null; // Include joined agent name
};

interface SessionListPanelProps {
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}

const fetchRecentSessions = async (): Promise<SessionRow[]> => {
  const { data, error } = await supabase
    .from('ai_agent_sessions') // This line might error if types are outdated
    .select(`
      id,
      contact_identifier,
      last_interaction_timestamp,
      created_at,
      status, 
      ai_agents ( name )
    `)
    // Optional: Prioritize active sessions, then by time
    .order('status', { ascending: true }) // 'active' comes first alphabetically
    .order('last_interaction_timestamp', { ascending: false, nullsFirst: false })
    .limit(50); // Limit to recent 50 sessions for performance

  if (error) {
    console.error("Error fetching recent sessions:", error);
    throw new Error(error.message || 'Failed to fetch sessions.');
  }
  // Explicitly cast the result to match the Promise return type - This might still be needed if types are incorrect
  return (data || []) as SessionRow[];
};

const SessionListPanel: React.FC<SessionListPanelProps> = ({
  selectedSessionId,
  onSelectSession,
}) => {
  const { data: sessions, isLoading, isError, error } = useQuery<SessionRow[], Error>({
    queryKey: ['recentAgentSessions'],
    queryFn: fetchRecentSessions,
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Recent Sessions</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-0 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))
            ) : isError ? (
              <Alert variant="destructive">
                <List className="h-4 w-4" />
                <AlertTitle>Error Loading Sessions</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            ) : sessions && sessions.length > 0 ? (
              sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={cn(
                    "w-full text-left p-3 border rounded-md hover:bg-muted transition-colors flex justify-between items-center",
                    selectedSessionId === session.id ? 'bg-muted ring-2 ring-primary' : 'bg-card'
                  )}
                >
                  <div className="flex-grow overflow-hidden">
                    <div className="flex items-center space-x-2">
                       {/* Status Indicator Dot */}
                       <span className={cn(
                         "inline-block h-2 w-2 rounded-full",
                         session.status === 'active' ? 'bg-green-500' :
                         session.status === 'closed' ? 'bg-gray-400' :
                         session.status === 'error' ? 'bg-red-500' : 'bg-gray-300' // Fallback
                       )} title={`Status: ${session.status}`}></span>
                       <p className="font-medium text-sm truncate">
                         {session.contact_identifier || 'Unknown Contact'}
                       </p>
                    </div>
                    {/* Agent name removed */}
                  </div>
                  <div className="text-xs text-muted-foreground text-right pl-2">
                    {session.last_interaction_timestamp ? (
                      <>
                        <div>{new Date(session.last_interaction_timestamp).toLocaleDateString()}</div>
                        <div>{new Date(session.last_interaction_timestamp).toLocaleTimeString()}</div>
                      </>
                    ) : (
                      'No interactions'
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No recent sessions found.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default SessionListPanel;
