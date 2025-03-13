
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Save,
  ListPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ChunkingMethod, generateChunks } from "./utils/chunkingUtils";

type Chunk = {
  id: string;
  content: string;
  order: number;
};

export function ChunkEditor() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [newChunkContent, setNewChunkContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [chunkingMethod, setChunkingMethod] = useState<ChunkingMethod>("lineBreak");

  // Fetch document details
  const { data: document, isLoading: isDocumentLoading } = useQuery({
    queryKey: ["knowledge-document", documentId],
    queryFn: async () => {
      if (!documentId) return null;
      
      const { data, error } = await supabase
        .from("knowledge_documents")
        .select("*")
        .eq("id", documentId)
        .single();
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error loading document",
          description: error.message,
        });
        return null;
      }
      
      return data;
    },
    enabled: !!documentId,
  });

  // Fetch existing chunks
  const { data: existingChunks, isLoading: isChunksLoading } = useQuery({
    queryKey: ["knowledge-chunks", documentId],
    queryFn: async () => {
      if (!documentId) return [];
      
      const { data, error } = await supabase
        .from("knowledge_chunks")
        .select("*")
        .eq("document_id", documentId)
        .order("sequence", { ascending: true });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error loading chunks",
          description: error.message,
        });
        return [];
      }
      
      return data;
    },
    enabled: !!documentId,
  });

  // Initialize chunks from existing data
  useEffect(() => {
    if (existingChunks && existingChunks.length > 0) {
      const mappedChunks = existingChunks.map((chunk, index) => ({
        id: chunk.id,
        content: chunk.content,
        order: index,
      }));
      setChunks(mappedChunks);
    }
  }, [existingChunks]);

  const addChunk = () => {
    if (newChunkContent.trim()) {
      setChunks([
        ...chunks,
        {
          id: uuidv4(),
          content: newChunkContent.trim(),
          order: chunks.length,
        },
      ]);
      setNewChunkContent("");
    }
  };

  const deleteChunk = (id: string) => {
    setChunks(chunks.filter(chunk => chunk.id !== id));
  };

  const moveChunk = (id: string, direction: "up" | "down") => {
    const index = chunks.findIndex(chunk => chunk.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === chunks.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const newChunks = [...chunks];
    const temp = newChunks[index];
    newChunks[index] = newChunks[newIndex];
    newChunks[newIndex] = temp;

    // Update order after moving
    const updatedChunks = newChunks.map((chunk, idx) => ({
      ...chunk,
      order: idx,
    }));

    setChunks(updatedChunks);
  };

  const generateChunksFromText = () => {
    if (!document?.content) {
      toast({
        title: "No content",
        description: "The document doesn't have any content to generate chunks from.",
        variant: "destructive",
      });
      return;
    }
    
    const options = {
      method: chunkingMethod,
      customChunkSize: 500, // Default size
      headerLevels: [1, 2, 3],
    };
    
    const generatedChunks = generateChunks(document.content, options);
    
    if (generatedChunks.length === 0) {
      toast({
        title: "No chunks generated",
        description: "No chunks could be generated with the selected method. Try another method.",
        variant: "destructive",
      });
      return;
    }
    
    const newChunks = generatedChunks.map((content, index) => ({
      id: uuidv4(),
      content,
      order: index,
    }));
    
    setChunks(newChunks);
    
    toast({
      title: "Chunks generated",
      description: `Generated ${newChunks.length} chunks from your document content.`,
    });
  };

  const handleSaveChunks = async () => {
    if (!documentId) return;
    
    try {
      setIsSaving(true);
      
      // Delete existing chunks
      if (existingChunks && existingChunks.length > 0) {
        const { error: deleteError } = await supabase
          .from("knowledge_chunks")
          .delete()
          .eq("document_id", documentId);
          
        if (deleteError) throw deleteError;
      }
      
      // Insert new chunks
      if (chunks.length > 0) {
        const chunksToInsert = chunks.map((chunk, index) => ({
          document_id: documentId,
          content: chunk.content,
          sequence: index + 1,
          metadata: JSON.stringify({
            index: index + 1,
            totalChunks: chunks.length,
          }),
        }));
        
        const { error: insertError } = await supabase
          .from("knowledge_chunks")
          .insert(chunksToInsert);
          
        if (insertError) throw insertError;
      }
      
      // Update chunking method on the document
      const { error: updateError } = await supabase
        .from("knowledge_documents")
        .update({ chunking_method: chunkingMethod })
        .eq("id", documentId);
        
      if (updateError) throw updateError;
      
      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ["knowledge-chunks"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
      
      toast({
        title: "Chunks saved",
        description: `Saved ${chunks.length} chunks to your document.`,
      });
      
      // Navigate back to knowledge base
      navigate("/dashboard/knowledge");
    } catch (error) {
      console.error("Error saving chunks:", error);
      toast({
        variant: "destructive",
        title: "Error saving chunks",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isDocumentLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-50 text-red-600 p-4 rounded-md">
          <h2 className="text-lg font-bold">Document not found</h2>
          <p>The document you're looking for couldn't be found.</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigate("/dashboard/knowledge")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Knowledge Base
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/dashboard/knowledge")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">{document.title}</h1>
        </div>
        
        <Button 
          onClick={handleSaveChunks} 
          disabled={isSaving}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          Save Chunks
        </Button>
      </div>
      
      {document.content && (
        <div className="mb-6 p-4 border rounded-md bg-muted/30">
          <h2 className="text-lg font-semibold mb-2">Document Content</h2>
          <p className="whitespace-pre-wrap text-sm">{document.content}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Add New Chunk</h2>
            <Textarea
              placeholder="Enter chunk content"
              className="min-h-[150px]"
              value={newChunkContent}
              onChange={(e) => setNewChunkContent(e.target.value)}
            />
            <Button
              onClick={addChunk}
              className="w-full"
              disabled={!newChunkContent.trim()}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Chunk
            </Button>
          </div>
          
          {document.content && (
            <div className="space-y-3 border rounded-md p-4">
              <h2 className="text-lg font-semibold">Generate Chunks</h2>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Generate chunks automatically from the document content
                </p>
                <RadioGroup
                  value={chunkingMethod}
                  onValueChange={(value) => setChunkingMethod(value as ChunkingMethod)}
                  className="grid grid-cols-2 gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="lineBreak" id="lineBreak" />
                    <Label htmlFor="lineBreak">By Line Break</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="paragraph" id="paragraph" />
                    <Label htmlFor="paragraph">By Paragraph</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="header" id="header" />
                    <Label htmlFor="header">By Headers</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="custom" />
                    <Label htmlFor="custom">Custom Size</Label>
                  </div>
                </RadioGroup>
                <Button 
                  onClick={generateChunksFromText}
                  className="w-full mt-2"
                  variant="outline"
                >
                  <ListPlus className="mr-2 h-4 w-4" />
                  Generate Chunks
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Chunks ({chunks.length})</h2>
          
          {isChunksLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : chunks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 border rounded-md p-4 text-muted-foreground">
              <ListPlus className="h-12 w-12 mb-2" />
              <p>No chunks added yet</p>
              <p className="text-sm">Add chunks manually or generate from your document content</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {chunks.map((chunk, index) => (
                <Card key={chunk.id} className="border">
                  <CardHeader className="py-2 px-3 flex flex-row items-center justify-between space-y-0">
                    <span className="text-sm font-medium">Chunk {index + 1}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveChunk(chunk.id, "up")}
                        disabled={index === 0}
                        className="h-7 w-7"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveChunk(chunk.id, "down")}
                        disabled={index === chunks.length - 1}
                        className="h-7 w-7"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteChunk(chunk.id)}
                        className="h-7 w-7 text-destructive hover:text-destructive/90"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="py-2 px-3">
                    <p className="text-sm whitespace-pre-wrap">{chunk.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
