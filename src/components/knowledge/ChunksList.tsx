
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Hash, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

interface ChunkMetadata {
  chunkingMethod: string;
  index: number;
  totalChunks: number;
  pageNumber?: number;
  customOptions?: {
    method: string;
    customChunkSize?: number;
    customLineBreakPattern?: string;
    headerLevels?: number[];
  };
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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  
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

  const getChunkingMethodDisplay = (method: string) => {
    switch (method) {
      case 'lineBreak': return 'Line Break';
      case 'customLineBreak': return 'Custom Line Break';
      case 'paragraph': return 'Paragraph';
      case 'page': return 'Page';
      case 'header': return 'Header';
      case 'custom': return 'Custom Size';
      default: return method;
    }
  };

  const truncateContent = (content: string, maxLength = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  const filteredChunks = chunks.filter(chunk => 
    chunk.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!documentId) {
    return (
      <div className="bg-muted p-8 rounded-lg text-center">
        <p>Select a document to view chunks</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        {Array(3).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
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
          <h2 className="text-xl font-semibold">{chunks.length} CHUNKS</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative w-[200px]">
            <Select 
              defaultValue="all"
              onValueChange={setFilterStatus}
            >
              <SelectTrigger className="w-full bg-muted/50">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="relative w-[250px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleDownloadChunks}
            title="Download chunks"
          >
            <Download className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="outline" 
            size="icon"
            title="Filter options"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
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
      
      <div className="max-h-[70vh] overflow-y-auto pr-2">
        <Table className="border rounded-lg">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Chunk</TableHead>
              <TableHead className="w-[180px]">Characters</TableHead>
              <TableHead className="w-[180px]">Retrieval count</TableHead>
              <TableHead className="w-[120px] text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredChunks.map((chunk, index) => {
              let metadata: ChunkMetadata = { 
                chunkingMethod: 'lineBreak', 
                index: 1, 
                totalChunks: chunks.length 
              };
              
              try {
                if (chunk.metadata) {
                  metadata = JSON.parse(chunk.metadata);
                }
              } catch (e) {
                console.error("Error parsing chunk metadata:", e);
              }
              
              const retrievalCount = metadata.customOptions?.headerLevels?.length || 0;
              
              return (
                <TableRow key={chunk.id} className="group">
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        Chunk-{String(index + 1).padStart(2, '0')}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {truncateContent(chunk.content)}
                      </p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {chunk.content.split(" ")
                          .filter((word, i, arr) => word.length > 3 && i < 8)
                          .filter((word, i, arr) => arr.indexOf(word) === i)
                          .slice(0, 5)
                          .map((word, i) => (
                            <Badge key={i} variant="outline" className="text-xs bg-slate-50">
                              #{word.toLowerCase().replace(/[^\w]/g, '')}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {chunk.content.length.toLocaleString()} characters
                  </TableCell>
                  <TableCell>
                    {retrievalCount} Retrieval count
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      className="ml-auto bg-green-100 text-green-800 hover:bg-green-100"
                    >
                      Enabled
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
