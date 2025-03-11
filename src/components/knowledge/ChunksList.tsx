
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChunkMetadata {
  chunkingMethod: string;
  index: number;
  totalChunks: number;
  pageNumber?: number;
}

interface Chunk {
  id: string;
  content: string;
  created_at: string;
  sequence: number;
  metadata: string;
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
        .select('id, content, created_at, sequence, metadata')
        .eq('document_id', documentId)
        .order('sequence', { ascending: true });
      
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

  const { data: documentData } = useQuery({
    queryKey: ['knowledge-document-detail', documentId],
    queryFn: async () => {
      if (!documentId) return null;
      
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('title, content, file_path, file_type, chunking_method')
        .eq('id', documentId)
        .single();
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error fetching document details",
          description: error.message,
        });
        return null;
      }
      
      return data;
    },
    enabled: !!documentId,
  });

  const handleDownloadChunks = () => {
    if (!chunks.length) return;
    
    const chunksData = chunks.map(chunk => {
      const metadata = chunk.metadata ? JSON.parse(chunk.metadata) : {};
      return {
        id: chunk.id,
        content: chunk.content,
        sequence: chunk.sequence,
        metadata
      };
    });
    
    const blob = new Blob([JSON.stringify(chunksData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chunks-${documentId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Document Chunks</h2>
          <Badge variant="outline">
            {chunks.length} chunks
          </Badge>
          {documentData?.chunking_method && (
            <Badge variant="secondary">
              {documentData.chunking_method === 'lineBreak' ? 'Line Break' : 
               documentData.chunking_method === 'paragraph' ? 'Paragraph' : 
               documentData.chunking_method === 'page' ? 'Page' : 'Custom Size'}
            </Badge>
          )}
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleDownloadChunks}
          className="flex items-center gap-1"
        >
          <Download className="h-4 w-4" />
          Download Chunks
        </Button>
      </div>
      
      {documentData?.file_path && documentData.file_type === 'pdf' && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              PDF Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded h-[300px] overflow-hidden">
              <iframe 
                src={`${supabase.storage.from('documents').getPublicUrl(documentData.file_path).data.publicUrl}#toolbar=0`}
                className="w-full h-full"
                title="PDF Preview"
              />
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-4">
        {chunks.map((chunk) => {
          let metadata: ChunkMetadata = { chunkingMethod: 'lineBreak', index: 1, totalChunks: chunks.length };
          try {
            if (chunk.metadata) {
              metadata = JSON.parse(chunk.metadata);
            }
          } catch (e) {
            console.error("Error parsing chunk metadata:", e);
          }
          
          return (
            <Card key={chunk.id}>
              <CardHeader className="py-3 px-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-medium">
                    Chunk {chunk.sequence}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{chunk.content.length} characters</span>
                    {metadata.pageNumber && (
                      <Badge variant="outline" className="text-xs">
                        Page {metadata.pageNumber}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-2 px-4">
                <p className="text-sm whitespace-pre-wrap">{chunk.content}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
