
import { generateEmbedding } from "@/lib/embeddings";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

export async function saveChunkWithEmbedding(content: string, documentId: string) {
  try {
    // Check if we're in a browser environment
    const isClient = typeof window !== 'undefined';

    let contentEmbedding;
    
    if (isClient) {
      // Use Supabase Edge Function when in the browser
      const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('knowledge-base', {
        method: 'POST',
        body: {
          action: 'save_chunk',
          content: content,
          document_id: documentId
        }
      });

      if (embeddingError) {
        console.error('Error invoking knowledge-base function:', embeddingError);
        throw new Error('Error generating embedding or saving chunk');
      }

      return embeddingData;
    } else {
      // Server-side approach (should not be reached in browser context)
      contentEmbedding = await generateEmbedding(content);

      // Convert the embedding to a string
      const embeddingString = JSON.stringify(contentEmbedding);

      // Insert the chunk into the knowledge_chunks table
      const { data, error } = await supabase
        .from('knowledge_chunks')
        .insert([{ 
          id: uuidv4(),
          content: content, 
          document_id: documentId, 
          embedding: embeddingString,
          metadata: JSON.stringify({}),
          sequence: 0,
        }]);

      if (error) {
        console.error('Error inserting knowledge chunk:', error);
        throw new Error('Error inserting knowledge chunk');
      }

      return {
        message: 'Knowledge chunk saved successfully',
        data: data,
      };
    }
  } catch (error: any) {
    console.error(error);
    throw new Error(error.message);
  }
}
