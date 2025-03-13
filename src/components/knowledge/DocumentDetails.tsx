
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChunksList } from "./ChunksList";
import { RetrievalTest } from "./RetrievalTest";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DocumentDetailsProps {
  documentId: string;
  setIsChunkFormOpen: (isOpen: boolean) => void;
}

export function DocumentDetails({ documentId, setIsChunkFormOpen }: DocumentDetailsProps) {
  const queryClient = useQueryClient();

  const handleAddChunk = () => {
    setIsChunkFormOpen(true);
  };

  const { refetch } = useQuery({
    queryKey: ['knowledge-chunks', documentId],
    queryFn: async () => {
      if (!documentId) return [];
      const { data, error } = await supabase
        .from('knowledge_chunks')
        .select('*')
        .eq('document_id', documentId);
      if (error) {
        console.error(error);
        return [];
      }
      return data;
    },
    enabled: !!documentId,
  });

  return (
    <div className="w-3/4">
      <h2 className="text-xl font-semibold mb-4">Document Chunks</h2>
      <Button className="mb-4" onClick={handleAddChunk}>Add Chunk</Button>
      <ChunksList documentId={documentId} />
      
      {documentId && (
        <RetrievalTest documentId={documentId} />
      )}
    </div>
  );
}
