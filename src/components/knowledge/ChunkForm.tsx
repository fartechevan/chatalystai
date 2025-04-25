import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChunkingMethod, ChunkingOptions, generateChunks } from "./utils/chunkingUtils";
import { ProductChunkingGuide } from "./ProductChunkingGuide";
import { Badge } from "@/components/ui/badge";
import { Package, Box } from "lucide-react";
import { saveChunkWithEmbedding } from "@/lib/knowledgebase";
import { useToast } from "@/hooks/use-toast";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefetchOptions, QueryObserverResult } from "@tanstack/react-query";
import { ChunkView } from "./ChunkView";

interface ChunkFormProps {
  content?: string;
  onChunk?: (options: ChunkingOptions) => void;
  isProcessing?: boolean;
  documentId: string;
  onClose: () => void;
  refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<any, Error>>;
}

export function ChunkForm({ 
  content = "", 
  onChunk, 
  isProcessing = false,
  documentId,
  onClose,
  refetch
}: ChunkFormProps) {
  const [method, setMethod] = useState<ChunkingMethod>("paragraph");
  const [customSize, setCustomSize] = useState(500);
  const [customPattern, setCustomPattern] = useState("\\n\\n\\n");
  const [headerLevels, setHeaderLevels] = useState<number[]>([1, 2]);
  const [chunkContent, setChunkContent] = useState("");
  const [previewChunks, setPreviewChunks] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handlePreview = () => {
    const options: ChunkingOptions = {
      method,
      customChunkSize: customSize,
      customLineBreakPattern: customPattern,
      headerLevels,
    };
    
    const chunks = generateChunks(chunkContent, options);
    setPreviewChunks(chunks);
    
    if (onChunk) {
      onChunk(options);
    }
  };

  const handleSaveChunk = async () => {
    if (!chunkContent.trim()) {
      toast({
        title: "Empty content",
        description: "Please enter some content to create a chunk.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      await saveChunkWithEmbedding(chunkContent, documentId);
      
      toast({
        title: "Chunk saved",
        description: "Your content has been successfully chunked and saved.",
      });
      
      setChunkContent("");
      setPreviewChunks([]);
      refetch();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error saving chunk",
        description: error.message || "An error occurred while saving the chunk.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold">Add Knowledge Chunk</DialogTitle>
      </DialogHeader>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Content Chunking</h2>
          </div>

          <ProductChunkingGuide />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Enter Content</Label>
              <Textarea 
                className="min-h-[200px]"
                placeholder="Enter the knowledge content to chunk..."
                value={chunkContent}
                onChange={(e) => setChunkContent(e.target.value)}
              />
              {chunkContent && (
                <div className="text-xs text-muted-foreground">
                  {chunkContent.length.toLocaleString()} characters
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Chunking Method</Label>
              <Select
                value={method}
                onValueChange={(value) => setMethod(value as ChunkingMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paragraph">By Paragraph</SelectItem>
                  <SelectItem value="header">By Headers</SelectItem>
                  <SelectItem value="custom">Custom Size</SelectItem>
                  <SelectItem value="openai">Smart AI Chunking</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {method === "custom" && (
              <div className="space-y-2">
                <Label>Chunk Size (characters)</Label>
                <Input
                  type="number"
                  min={100}
                  max={2000}
                  value={customSize}
                  onChange={(e) => setCustomSize(Number(e.target.value))}
                />
              </div>
            )}

            {method === "header" && (
              <div className="space-y-2">
                <Label>Header Levels</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6].map((level) => (
                    <Button
                      key={level}
                      type="button"
                      size="sm"
                      variant={headerLevels.includes(level) ? "default" : "outline"}
                      onClick={() => {
                        setHeaderLevels((prev) =>
                          prev.includes(level)
                            ? prev.filter((l) => l !== level)
                            : [...prev, level].sort()
                        );
                      }}
                    >
                      H{level}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 flex gap-2">
              <Button
                type="button"
                onClick={handlePreview}
                disabled={!chunkContent.trim() || isProcessing}
                variant="outline"
              >
                {isProcessing ? "Processing..." : "Preview Chunks"}
              </Button>

              <Button
                type="button"
                onClick={handleSaveChunk}
                disabled={!chunkContent.trim() || isSaving}
              >
                {isSaving ? "Saving..." : "Save Chunk"}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Box className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Preview</h2>
            {previewChunks.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {previewChunks.length} chunks
              </Badge>
            )}
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {previewChunks.length > 0 ? (
              previewChunks.map((chunk, index) => (
                <ChunkView 
                  key={index} 
                  chunk={chunk} 
                  index={index} 
                  total={previewChunks.length} 
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Enter content and click "Preview Chunks" to see how your knowledge will be divided.
              </div>
            )}
          </div>
        </div>
      </div>
    </DialogContent>
  );
}
