import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { generateEmbedding } from "@/lib/embeddings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ChunkFormProps {
  documentId: string;
  onClose: () => void;
  refetch: () => void;
}

export function ChunkForm({ documentId, onClose, refetch }: ChunkFormProps) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const embedding = await generateEmbedding(content);

      const { error } = await supabase
        .from('knowledge_chunks')
        .insert([{ document_id: documentId, content, embedding: JSON.stringify(embedding) }]);

      if (error) {
        throw error;
      }

      toast({
        title: "Chunk added",
        description: "The chunk has been successfully added.",
      });
      await refetch();
      onClose();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error adding chunk",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Add New Chunk</DialogTitle>
        <DialogDescription>
          Add a new chunk to the document.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="content" className="text-right">
            Content
          </Label>
          <Textarea
            id="content"
            className="col-span-3"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? "Saving..." : "Save"}
      </Button>
    </DialogContent>
  );
}
