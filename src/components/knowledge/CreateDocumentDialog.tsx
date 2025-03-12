
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { v4 as uuidv4 } from "uuid";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FilePlus, Plus, ListPlus, ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ChunkingMethod, generateChunks } from "./utils/chunkingUtils";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  chunkingMethod: z.enum(["lineBreak", "paragraph", "page", "custom", "header", "customLineBreak"], {
    required_error: "Please select a chunking method",
  }),
});

interface CreateDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Chunk = {
  id: string;
  content: string;
  order: number;
};

export function CreateDocumentDialog({ open, onOpenChange, onSuccess }: CreateDocumentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [newChunkContent, setNewChunkContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      chunkingMethod: "lineBreak",
    },
  });

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
    const description = form.getValues("description") || "";
    const method = form.getValues("chunkingMethod") as ChunkingMethod;
    
    if (!description) {
      toast({
        title: "No content",
        description: "Please add content to generate chunks.",
        variant: "destructive",
      });
      return;
    }
    
    const options = {
      method,
      customChunkSize: 500, // Default size
      headerLevels: [1, 2, 3],
    };
    
    const generatedChunks = generateChunks(description, options);
    
    const newChunks = generatedChunks.map((content, index) => ({
      id: uuidv4(),
      content,
      order: index,
    }));
    
    setChunks(newChunks);
    
    toast({
      title: "Chunks generated",
      description: `Generated ${newChunks.length} chunks from your text.`,
    });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (chunks.length === 0) {
        toast({
          title: "No chunks",
          description: "Please add at least one chunk to your document.",
          variant: "destructive",
        });
        return;
      }

      setIsSubmitting(true);

      // Create document
      const { data: documentData, error: documentError } = await supabase
        .from("knowledge_documents")
        .insert({
          title: values.title,
          content: values.description || "",
          chunking_method: values.chunkingMethod,
          file_type: "text",
        })
        .select("id")
        .single();

      if (documentError) {
        throw documentError;
      }

      // Insert chunks
      const chunksToInsert = chunks.map((chunk, index) => ({
        document_id: documentData.id,
        content: chunk.content,
        sequence: index + 1,
        metadata: JSON.stringify({
          chunkingMethod: values.chunkingMethod,
          index: index + 1,
          totalChunks: chunks.length,
        }),
      }));

      const { error: chunksError } = await supabase
        .from("knowledge_chunks")
        .insert(chunksToInsert);

      if (chunksError) {
        throw chunksError;
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });

      // Success handling
      setIsSubmitting(false);
      onOpenChange(false);
      setChunks([]);
      form.reset();
      onSuccess();

      toast({
        title: "Document created",
        description: `Created document with ${chunks.length} chunks.`,
      });
    } catch (error) {
      setIsSubmitting(false);
      console.error("Error creating document:", error);
      toast({
        variant: "destructive",
        title: "Error creating document",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus className="h-5 w-5" />
            Create New Document
          </DialogTitle>
          <DialogDescription>
            Create a document and add knowledge chunks manually
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter document title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Description/Content</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter document content or description"
                          className="min-h-[150px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="chunkingMethod"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Chunking Method</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
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
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("description") && (
                  <Button 
                    type="button" 
                    onClick={generateChunksFromText}
                    className="w-full"
                    variant="outline"
                  >
                    <ListPlus className="mr-2 h-4 w-4" />
                    Generate Chunks from Text
                  </Button>
                )}

                <div className="space-y-3">
                  <FormLabel>Add New Chunk</FormLabel>
                  <Textarea
                    placeholder="Enter chunk content"
                    className="min-h-[100px]"
                    value={newChunkContent}
                    onChange={(e) => setNewChunkContent(e.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={addChunk}
                    className="w-full"
                    disabled={!newChunkContent.trim()}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Chunk
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <FormLabel>Chunks ({chunks.length})</FormLabel>
                </div>
                <div className="border rounded-md p-3 h-[500px] overflow-y-auto space-y-3">
                  {chunks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <ListPlus className="h-12 w-12 mb-2" />
                      <p>No chunks added yet</p>
                      <p className="text-sm">Add chunks manually or generate from your document text</p>
                    </div>
                  ) : (
                    chunks.map((chunk, index) => (
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
                    ))
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || chunks.length === 0}>
                Create Document
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
