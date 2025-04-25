import { supabase } from '@/integrations/supabase/client';

// Assuming a basic structure for documents based on common patterns
// Adjust if your actual 'documents' table schema differs
export interface KnowledgeDocument {
  id: string; // uuid
  name: string; // text
  // Add other relevant fields if needed, e.g., description, created_at
}

/**
 * Fetches all knowledge documents for the authenticated user.
 * Assumes a Supabase function named 'list-knowledge-documents' exists.
 */
export const listKnowledgeDocuments = async (): Promise<KnowledgeDocument[]> => {
  const { data, error } = await supabase.functions.invoke('list-knowledge-documents', {
    method: 'GET',
  });

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
