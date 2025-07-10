
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Hash, Search, SlidersHorizontal, Pencil, Trash2 } from "lucide-react"; // Added Pencil, Trash2
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // Added Textarea
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // Added AlertDialog
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"; // Added Dialog
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
import { Switch } from "@/components/ui/switch"; // Added Switch import
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
  enabled: boolean; // Added enabled field
}

interface ChunksListProps {
  documentId: string | null;
}

export function ChunksList({ documentId }: ChunksListProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const queryClient = useQueryClient();
  const [chunkToDelete, setChunkToDelete] = useState<Chunk | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [chunkToEdit, setChunkToEdit] = useState<Chunk | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: chunks = [], isLoading } = useQuery({
    queryKey: ['knowledge-chunks', documentId],
    queryFn: async () => {
      if (!documentId) return [];

      const { data, error } = await supabase
        .from('knowledge_chunks')
        .select('id, content, created_at, sequence, metadata, enabled') // Added enabled to select
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

  // --- Mutation for updating chunk status ---
  const updateChunkStatusMutation = useMutation({
    mutationFn: async ({ chunkId, enabled }: { chunkId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('knowledge_chunks')
        .update({ enabled })
        .eq('id', chunkId);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch the chunks query to update the UI
      queryClient.invalidateQueries({ queryKey: ['knowledge-chunks', documentId] });
      toast({
        title: "Chunk status updated",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error updating chunk status",
        description: error.message,
      });
    },
  });

  const handleToggleChunk = (chunkId: string, currentStatus: boolean) => {
    updateChunkStatusMutation.mutate({ chunkId, enabled: !currentStatus });
  };
  // --- End Toggle Mutation ---

  // --- Mutation for deleting chunk ---
  const deleteChunkMutation = useMutation({
    mutationFn: async (chunkId: string) => {
      const { error } = await supabase
        .from('knowledge_chunks')
        .delete()
        .eq('id', chunkId);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-chunks', documentId] });
      toast({ title: "Chunk deleted successfully" });
      setIsDeleteDialogOpen(false);
      setChunkToDelete(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error deleting chunk",
        description: error.message,
      });
    },
  });

  const handleDeleteClick = (chunk: Chunk) => {
    setChunkToDelete(chunk);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (chunkToDelete) {
      deleteChunkMutation.mutate(chunkToDelete.id);
    }
  };
  // --- End Delete Mutation ---

  // --- Mutation for editing chunk ---
   const editChunkMutation = useMutation({
    mutationFn: async ({ chunkId, content }: { chunkId: string; content: string }) => {
      // Only update the content, not the embedding
      const { error } = await supabase
        .from('knowledge_chunks')
        .update({ content: content, updated_at: new Date().toISOString() }) // Also update updated_at
        .eq('id', chunkId);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-chunks', documentId] });
      toast({ title: "Chunk updated successfully" });
      setIsEditDialogOpen(false);
      setChunkToEdit(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error updating chunk",
        description: error.message,
      });
    },
  });

  const handleEditClick = (chunk: Chunk) => {
    setChunkToEdit(chunk);
    setEditedContent(chunk.content); // Pre-fill textarea
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (chunkToEdit && editedContent !== chunkToEdit.content) {
      editChunkMutation.mutate({ chunkId: chunkToEdit.id, content: editedContent });
    } else {
      // Close dialog if no changes were made
      setIsEditDialogOpen(false);
      setChunkToEdit(null);
    }
  };
  // --- End Edit Mutation ---

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

  // Updated filtering logic
  const filteredChunks = chunks.filter(chunk => {
    const matchesSearch = chunk.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' ||
                          (filterStatus === 'enabled' && chunk.enabled) ||
                          (filterStatus === 'disabled' && !chunk.enabled);
    return matchesSearch && matchesStatus;
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
      
      {/* THIS PART IS NOT NEEDED NOW SINCE THE ORIGINAL DOCUMENT IS OPENED IN A NEW TAB, AND THE URL IS FROM GOOGLE BUCKET */}
      {/* {documentData?.file_path && documentData.file_type === 'pdf' && (
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
      )} */}
      
      <div className="max-h-[70vh] overflow-y-auto pr-2 border rounded-lg"> {/* Moved border and rounded-lg to the container */}
        <Table> {/* Removed className="border rounded-lg" */}
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/50"> {/* Added subtle bg to header row */}
              <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Chunk</TableHead>
              <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[150px]">Characters</TableHead>
              {/* <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[180px]">Retrieval count</TableHead> */}
              <TableHead className="h-12 px-4 text-center align-middle font-medium text-muted-foreground w-[80px]">Status</TableHead>
              <TableHead className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-[100px]">Actions</TableHead>
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
                <TableRow key={chunk.id} className="group hover:bg-muted/50"> {/* Ensured hover state */}
                  <TableCell className="p-4 align-middle">
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
                  <TableCell className="p-4 align-middle text-muted-foreground">
                    {chunk.content.length.toLocaleString()} characters
                  </TableCell>
                  <TableCell className="p-4 align-middle text-muted-foreground"> {/* Added consistent styling */}
                    {retrievalCount} Retrieval count
                  </TableCell>
                  <TableCell className="p-4 align-middle text-center"> {/* Centered switch */}
                    <Switch
                      checked={chunk.enabled}
                      onCheckedChange={() => handleToggleChunk(chunk.id, chunk.enabled)}
                      disabled={updateChunkStatusMutation.isPending} // Disable while updating
                      aria-label={chunk.enabled ? "Disable chunk" : "Enable chunk"}
                    />
                  </TableCell>
                  <TableCell className="p-4 align-middle text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button variant="ghost" size="icon" onClick={() => handleEditClick(chunk)} title="Edit Chunk">
                         <Pencil className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(chunk)} title="Delete Chunk">
                         <Trash2 className="h-4 w-4 text-destructive" />
                       </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the chunk.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setChunkToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteChunkMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteChunkMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Chunk Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Chunk</DialogTitle>
            <DialogDescription>
              Modify the content of the chunk below. Note: Changing content does not re-generate the embedding.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             <Textarea
               value={editedContent}
               onChange={(e) => setEditedContent(e.target.value)}
               rows={10}
               className="min-h-[200px]"
               placeholder="Chunk content..."
             />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSaveEdit}
              disabled={editChunkMutation.isPending || editedContent === chunkToEdit?.content}
            >
              {editChunkMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
