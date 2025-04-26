
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "@/components/ui/use-toast";

export async function saveChunkWithEmbedding(content: string, documentId: string) {
  try {
    // Check if we're in a browser environment
    const isClient = typeof window !== 'undefined';
    
    if (isClient) {
      try {
        // Use the knowledge-base edge function to generate embeddings and save the chunk
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
          toast({
            title: "Error Saving Chunk",
            description: `Failed to process chunk: ${embeddingError.message}`,
            variant: "destructive"
          });
          throw new Error('Error generating embedding or saving chunk');
        }

        toast({
          title: "Success",
          description: "Knowledge chunk saved successfully"
        });

        return embeddingData;
      } catch (error) {
        console.error('Error processing chunk:', error);
        toast({
          title: "Chunk Processing Failed",
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          variant: "destructive"
        });
        throw error;
      }
    } else {
      // This branch should not be executed in browser context
      // It's kept for server-side rendering compatibility
      console.warn('Server-side chunk saving is not fully implemented');
      throw new Error('Server-side chunk saving is not supported');
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
