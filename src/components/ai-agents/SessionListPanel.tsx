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

type SessionRow = Database['public']['Tables']['ai_agent_sessions']['Row'] & {
  ai_agents: { name: string | null } | null; // Include joined agent name
};

interface SessionListPanelProps {
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}

const fetchRecentSessions = async (): Promise<SessionRow[]> => {
  // @ts-expect-error - Bypassing persistent "No overload matches" error
  const { data, error } = await supabase
    .from('ai_agent_sessions')
    .select(`
      id,
      contact_identifier,
      last_interaction_timestamp,
      created_at,
      ai_agents ( name )
    `)
    .order('last_interaction_timestamp', { ascending: false, nullsFirst: false })
    .limit(50); // Limit to recent 50 sessions for performance

  if (error) {
    console.error("Error fetching recent sessions:", error);
    throw new Error(error.message || 'Failed to fetch sessions.');
  }
  // Explicitly cast the result to match the Promise return type
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
      <CardContent className="flex-grow p-0">
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
                  <div>
                    <p className="font-medium text-sm truncate">
                      {session.contact_identifier || 'Unknown Contact'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Agent: {session.ai_agents?.name || 'N/A'}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap pl-2">
                    {session.last_interaction_timestamp
                      ? new Date(session.last_interaction_timestamp).toLocaleString()
                      : 'No interactions'}
                  </span>
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
