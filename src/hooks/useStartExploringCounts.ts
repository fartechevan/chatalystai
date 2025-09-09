import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from './useAuthUser';

// Threshold configuration for Start Exploring section
// Modify these values to change when features should be hidden/shown
const BROADCASTS_THRESHOLD = 10; // Hide "Send a Broadcast" when user has 10+ broadcasts
const AI_AGENTS_THRESHOLD = 10;   // Hide "Create AI Agent" when user has 3+ AI agents
const TEAM_MEMBERS_THRESHOLD = 10; // Hide "Invite Team Member" when user has 5+ team members

interface StartExploringCounts {
  broadcastsCount: number;
  aiAgentsCount: number;
  profilesCount: number;
  isLoading: boolean;
  error: string | null;
  // Threshold values for easy access in components
  thresholds: {
    broadcasts: number;
    aiAgents: number;
    teamMembers: number;
  };
}

export function useStartExploringCounts(): StartExploringCounts {
  const [broadcastsCount, setBroadcastsCount] = useState(0);
  const [aiAgentsCount, setAiAgentsCount] = useState(0);
  const [profilesCount, setProfilesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userData } = useAuthUser();

  useEffect(() => {
    const fetchCounts = async () => {
      if (!userData?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch broadcasts count for current user by joining with integrations_config
        const { count: broadcastCount, error: broadcastError } = await supabase
          .from('broadcasts')
          .select('*, integrations_config!inner(owner_id)', { count: 'exact', head: true })
          .eq('integrations_config.owner_id', userData.id);

        if (broadcastError) {
          console.error('Error fetching broadcasts count:', broadcastError);
          throw broadcastError;
        }

        // Fetch AI agents count for current user
        const { count: agentCount, error: agentError } = await supabase
          .from('ai_agents')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userData.id);

        if (agentError) {
          console.error('Error fetching AI agents count:', agentError);
          throw agentError;
        }

        // Fetch profiles count (total team members)
        const { count: profileCount, error: profileError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (profileError) {
          console.error('Error fetching profiles count:', profileError);
          throw profileError;
        }

        setBroadcastsCount(broadcastCount || 0);
        setAiAgentsCount(agentCount || 0);
        setProfilesCount(profileCount || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCounts();
  }, [userData?.id]);

  return {
    broadcastsCount,
    aiAgentsCount,
    profilesCount,
    isLoading,
    error,
    thresholds: {
      broadcasts: BROADCASTS_THRESHOLD,
      aiAgents: AI_AGENTS_THRESHOLD,
      teamMembers: TEAM_MEMBERS_THRESHOLD,
    },
  };
}