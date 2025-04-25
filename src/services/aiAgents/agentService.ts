import { supabase } from '@/integrations/supabase/client'; // Corrected import path
import { AIAgent, NewAIAgent, UpdateAIAgent } from '@/types/aiAgents';

/**
 * Fetches all AI agents for the authenticated user.
 */
export const listAIAgents = async (): Promise<AIAgent[]> => {
  // Explicitly set the method to GET
  const { data, error } = await supabase.functions.invoke('list-ai-agents', {
    method: 'GET',
  });

  if (error) {
    console.error('Error listing AI agents:', error);
    throw new Error(error.message || 'Failed to fetch AI agents');
  }

  // The function returns { agents: AIAgent[] }
  if (!data || !Array.isArray(data.agents)) {
     console.error('Invalid data structure returned from list-ai-agents:', data);
     throw new Error('Invalid response format from server.');
  }

  return data.agents as AIAgent[];
};

/**
 * Fetches a single AI agent by its ID.
 */
export const getAIAgent = async (agentId: string): Promise<AIAgent | null> => {
  // Return null immediately if no agentId is provided
  if (!agentId) {
    return null;
  }

  // Explicitly set the method to GET
  const { data, error } = await supabase.functions.invoke(`get-ai-agent/${agentId}`, {
    method: 'GET',
  });

  if (error) {
    // Handle 404 specifically - agent not found or access denied
    if (error.context?.status === 404) {
      console.warn(`AI Agent with ID ${agentId} not found or access denied.`);
      return null; // Return null if not found
    }
    console.error(`Error fetching AI agent ${agentId}:`, error);
    throw new Error(error.message || 'Failed to fetch AI agent');
  }

  if (!data || !data.agent) {
     console.error('Invalid data structure returned from get-ai-agent:', data);
     throw new Error('Invalid response format from server.');
  }

  return data.agent as AIAgent;
};

/**
 * Gets an AI-generated suggestion for a system prompt.
 */
export const suggestAIPrompt = async (currentPrompt: string, agentPurpose?: string): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('suggest-ai-prompt', {
    body: {
      current_prompt: currentPrompt,
      agent_purpose: agentPurpose, // Optional
    },
  });

  if (error) {
    console.error('Error suggesting AI prompt:', error);
    throw new Error(error.message || 'Failed to get prompt suggestion');
  }

  if (!data || typeof data.suggested_prompt !== 'string') {
    console.error('Invalid data structure returned from suggest-ai-prompt:', data);
    throw new Error('Invalid response format from server.');
  }

  return data.suggested_prompt;
};


/**
 * Creates a new AI agent.
 */
export const createAIAgent = async (agentData: NewAIAgent): Promise<AIAgent> => {
  const { data, error } = await supabase.functions.invoke('create-ai-agent', {
    body: agentData,
  });

  if (error) {
    console.error('Error creating AI agent:', error);
    throw new Error(error.message || 'Failed to create AI agent');
  }
   if (!data || !data.agent) {
     console.error('Invalid data structure returned from create-ai-agent:', data);
     throw new Error('Invalid response format from server.');
  }

  return data.agent as AIAgent;
};

/**
 * Updates an existing AI agent.
 */
export const updateAIAgent = async (agentId: string, updates: UpdateAIAgent): Promise<AIAgent> => {
   const { data, error } = await supabase.functions.invoke(`update-ai-agent/${agentId}`, {
    method: 'PUT', // or PATCH
    body: updates,
  });

   if (error) {
    console.error('Error updating AI agent:', error);
    throw new Error(error.message || 'Failed to update AI agent');
  }
   if (!data || !data.agent) {
     console.error('Invalid data structure returned from update-ai-agent:', data);
     throw new Error('Invalid response format from server.');
  }
  return data.agent as AIAgent;
};

/**
 * Deletes an AI agent.
 */
export const deleteAIAgent = async (agentId: string): Promise<void> => {
  const { error } = await supabase.functions.invoke(`delete-ai-agent/${agentId}`, {
    method: 'DELETE',
  });

  if (error) {
    console.error('Error deleting AI agent:', error);
    throw new Error(error.message || 'Failed to delete AI agent');
  }
  // No data expected on successful delete (204 No Content)
};
