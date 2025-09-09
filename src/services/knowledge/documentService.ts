import { supabase } from '@/integrations/supabase/client';

// Assuming a basic structure for documents based on common patterns
// Adjust if your actual 'documents' table schema differs
export interface KnowledgeDocument {
  id: string; // uuid
  name: string; // text
  // Add other relevant fields if needed, e.g., description, created_at
}

/**
 * Fetches knowledge documents. If an agentId is provided, it fetches documents
 * associated with that agent. Otherwise, it fetches all documents for the user.
 */
export const listKnowledgeDocuments = async (agentId?: string): Promise<KnowledgeDocument[]> => {
  const invokeOptions: any = {
    method: 'GET',
  };

  // The body is constructed to be compatible with how the Edge Function
  // will read the URL parameters. The actual URL will be constructed like:
  // `/list-knowledge-documents?agent_id=...`
  if (agentId) {
    invokeOptions.body = { agent_id: agentId };
  }

  const { data, error } = await supabase.functions.invoke('list-knowledge-documents', invokeOptions);

  if (error) {
    console.error('Error listing knowledge documents:', error);
    throw new Error(error.message || 'Failed to fetch knowledge documents');
  }

  // Assuming the function returns { documents: KnowledgeDocument[] }
  if (!data || !Array.isArray(data.documents)) {
     console.error('Invalid data structure returned from list-knowledge-documents:', data);
     throw new Error('Invalid response format from server.');
  }

  return data.documents as KnowledgeDocument[];
};

// Add other document-related service functions here later (create, get, delete, etc.)
