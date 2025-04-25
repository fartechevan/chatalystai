
import { generateEmbedding } from "@/lib/embeddings";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "@/components/ui/use-toast";

export async function saveChunkWithEmbedding(content: string, documentId: string) {
  try {
    // Check if we're in a browser environment
    const isClient = typeof window !== 'undefined';

    let contentEmbedding;
    
    if (isClient) {
      try {
        // First, generate the embedding locally
        contentEmbedding = await generateEmbedding(content);

        // Then save the chunk with embedding
        const { data, error } = await supabase
          .from('knowledge_chunks')
          .insert({
            id: uuidv4(),
            content: content, 
            document_id: documentId, 
            embedding: JSON.stringify(contentEmbedding),
            metadata: JSON.stringify({}),
            sequence: 0,
          });

        if (error) {
          console.error('Error inserting knowledge chunk:', error);
          toast({
            title: "Error Saving Chunk",
            description: `Failed to save chunk: ${error.message}`,
            variant: "destructive"
          });
          throw new Error(error.message);
        }

        return {
          message: 'Knowledge chunk saved successfully',
          data: data,
        };
      } catch (embeddingError) {
        console.error('Error generating embedding:', embeddingError);
        toast({
          title: "Embedding Error",
          description: `Failed to generate embedding: ${embeddingError instanceof Error ? embeddingError.message : 'Unknown error'}`,
          variant: "destructive"
        });
        throw embeddingError;
      }
    } else {
      // Server-side fallback (should not be reached in browser context)
      contentEmbedding = await generateEmbedding(content);

      const { data, error } = await supabase
        .from('knowledge_chunks')
        .insert([{ 
          id: uuidv4(),
          content: content, 
          document_id: documentId, 
          embedding: JSON.stringify(contentEmbedding),
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
    console.error('Comprehensive chunk saving error:', error);
    toast({
      title: "Chunk Saving Failed",
      description: error.message || "An unexpected error occurred",
      variant: "destructive"
    });
    throw new Error(error.message);
  }
}
