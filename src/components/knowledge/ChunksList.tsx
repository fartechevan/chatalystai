
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Chunk {
  id: string;
  content: string;
  created_at: string;
}

interface ChunksListProps {
  documentId: string | null;
}

export function ChunksList({ documentId }: ChunksListProps) {
  const { toast } = useToast();
  
  const { data: chunks = [], isLoading } = useQuery({
    queryKey: ['knowledge-chunks', documentId],
    queryFn: async () => {
      if (!documentId) return [];
      
      const { data, error } = await supabase
        .from('knowledge_chunks')
        .select('id, content, created_at')
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error fetching chunks",
          description: error.message,
        });
        return [];
      }
      
      return data as Chunk[];
    },
    enabled: !!documentId,
  });

  if (!documentId) {
    return (
      <div className="bg-muted p-8 rounded-lg text-center">
        <p>Select a document to view chunks</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-muted/50">
            <CardHeader className="p-4">
              <Skeleton className="h-5 w-full" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (chunks.length === 0) {
    return (
      <div className="bg-muted p-8 rounded-lg text-center">
        <p>No chunks found for this document.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      {chunks.map((chunk, index) => (
        <Card key={chunk.id}>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">Chunk {index + 1}</CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4">
            <p className="text-sm whitespace-pre-wrap">{chunk.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
