
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
import { ChunkingMethod, ChunkingOptions } from "./utils/chunkingUtils";
import { ProductChunkingGuide } from "./ProductChunkingGuide";
import { Badge } from "@/components/ui/badge";
import { Package, Box } from "lucide-react";

interface ChunkFormProps {
  content: string;
  onChunk: (options: ChunkingOptions) => void;
  isProcessing: boolean;
}

export function ChunkForm({ content, onChunk, isProcessing }: ChunkFormProps) {
  const [method, setMethod] = useState<ChunkingMethod>("paragraph");
  const [customSize, setCustomSize] = useState(500);
  const [customPattern, setCustomPattern] = useState("\\n\\n\\n");
  const [headerLevels, setHeaderLevels] = useState<number[]>([1, 2]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChunk({
      method,
      customChunkSize: customSize,
      customLineBreakPattern: customPattern,
      headerLevels,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Package className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Content Chunking</h2>
        <Badge variant="secondary" className="ml-2">
          {content.length.toLocaleString()} characters
        </Badge>
      </div>

      <ProductChunkingGuide />

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div className="pt-4">
          <Button
            type="submit"
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? "Processing..." : "Generate Chunks"}
          </Button>
        </div>
      </form>
    </div>
  );
}
