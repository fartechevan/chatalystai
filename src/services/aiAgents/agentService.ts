import { supabase } from '@/integrations/supabase/client'; // Corrected import path
import { AIAgent, NewAIAgent, UpdateAIAgent } from '@/types/aiAgents';

/**
 * Fetches all AI agents for the authenticated user.
 */
export const listAIAgents = async (): Promise<AIAgent[]> => {
  // Call the new handler with the base path
  const { data, error } = await supabase.functions.invoke('ai-agent-handler', {
    method: 'GET', // Method determines the action (list)
  });

  if (error) {
    console.error('Error listing AI agents:', error); // Keep detailed error log
    // Throw the original error for better debugging upstream
    throw error;
  }

  // The function returns { agents: AIAgent[] }
  if (!data || !Array.isArray(data.agents)) {
     console.error('Invalid data structure returned from ai-agent-handler (list):', data);
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

  // Call the handler with the agent ID in the path
  const { data, error } = await supabase.functions.invoke(`ai-agent-handler/${agentId}`, {
    method: 'GET', // Method + path determines the action (get specific)
  });

  if (error) {
    // Handle 404 specifically - agent not found or access denied
    // Check context if available, otherwise rely on message (less reliable)
    const status = error.context?.status;
    if (status === 404) {
      console.warn(`AI Agent with ID ${agentId} not found or access denied.`);
      return null; // Return null if not found
    }
    console.error(`Error fetching AI agent ${agentId}:`, error);
    throw error; // Throw original error
  }

  if (!data || !data.agent) {
     console.error('Invalid data structure returned from ai-agent-handler (get):', data);
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
  // Call the handler with POST method
  const { data, error } = await supabase.functions.invoke('ai-agent-handler', {
    method: 'POST', // Method determines the action (create)
    body: agentData,
  });

  if (error) {
    console.error('Error creating AI agent:', error);
    throw error; // Throw original error
  }
   if (!data || !data.agent) {
     console.error('Invalid data structure returned from ai-agent-handler (create):', data);
     throw new Error('Invalid response format from server.');
  }

  return data.agent as AIAgent;
};

/**
 * Updates an existing AI agent.
 */
export const updateAIAgent = async (agentId: string, updates: UpdateAIAgent): Promise<AIAgent> => {
  const functionUrl = `ai-agent-handler/${agentId}`;
  console.log(`[CLIENT SERVICE DEBUG] Invoking Supabase function: PUT ${functionUrl}`);
  console.log(`[CLIENT SERVICE DEBUG] Payload for ${agentId}:`, JSON.stringify(updates, null, 2));

   // Call the handler with PUT/PATCH and agent ID in the path
   const { data, error } = await supabase.functions.invoke(functionUrl, { // Use logged functionUrl
    method: 'PUT', // or PATCH - handler supports both
    body: updates,
  });

   if (error) {
    console.error('Error updating AI agent:', error);
    throw error; // Throw original error
  }
   if (!data || !data.agent) {
     console.error('Invalid data structure returned from ai-agent-handler (update):', data);
     throw new Error('Invalid response format from server.');
  }
  return data.agent as AIAgent;
};

/**
 * Deletes an AI agent.
 */
export const deleteAIAgent = async (agentId: string): Promise<void> => {
  // Call the handler with DELETE and agent ID in the path
  const { error } = await supabase.functions.invoke(`ai-agent-handler/${agentId}`, {
    method: 'DELETE', // Method + path determines the action (delete)
  });

  if (error) {
    console.error('Error deleting AI agent:', error);
    throw error; // Throw original error
  }
  // No data expected on successful delete (204 No Content)
};
