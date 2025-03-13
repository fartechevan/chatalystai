import { generateEmbedding } from "@/lib/embeddings";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

export async function saveChunkWithEmbedding(content: string, documentId: string) {
  try {
    // Generate embedding for the content
    const contentEmbedding = await generateEmbedding(content);

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
  } catch (error: any) {
    console.error(error);
    throw new Error(error.message);
  }
}
