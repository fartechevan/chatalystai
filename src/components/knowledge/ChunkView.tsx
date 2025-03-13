import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface Chunk {
  id: string;
  content: string;
  document_id: string;
  created_at: string;
}

export function ChunkView() {
  const { documentId } = useParams<{ documentId: string }>();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
    };

    checkAuth();
  }, []);

  const { data: chunks = [], isLoading } = useQuery({
    queryKey: ['knowledge-chunks', documentId],
    queryFn: async () => {
      if (!isAuthenticated || !documentId) return [];

      const { data, error } = await supabase
        .from('knowledge_chunks')
        .select('*')
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
    enabled: isAuthenticated && !!documentId,
  });

  if (!isAuthenticated) {
    return (
      <div className="bg-muted p-4 rounded-lg text-center">
        <p>Please sign in to view document chunks.</p>
      </div>
    );
  }

  if (!documentId) {
    return (
      <div className="bg-muted p-4 rounded-lg text-center">
        <p>No document selected.</p>
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
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="p-4">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (chunks.length === 0) {
    return (
      <div className="bg-muted p-4 rounded-lg text-center">
        <p>No chunks found for this document.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {chunks.map((chunk) => (
        <Card key={chunk.id} className="bg-muted">
          <CardHeader>
            <CardTitle>Chunk ID: {chunk.id}</CardTitle>
            <CardDescription>Created at: {new Date(chunk.created_at).toLocaleString()}</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{chunk.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
