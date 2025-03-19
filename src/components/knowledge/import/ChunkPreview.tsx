
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ChunkPreviewProps {
  chunks: string[];
  onBack: () => void;
}

export function ChunkPreview({ chunks, onBack }: ChunkPreviewProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Document Chunks Preview</h3>
        <Button 
          variant="outline" 
          onClick={onBack}
        >
          Back to Edit
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-md p-4 max-h-[500px] overflow-y-auto">
        {chunks.map((chunk, index) => (
          <Card key={index} className="mb-2 bg-muted/30">
            <CardHeader className="py-3 px-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">
                  Chunk {index + 1}
                </CardTitle>
                <span className="text-xs text-muted-foreground">{chunk.length} characters</span>
              </div>
            </CardHeader>
            <CardContent className="py-2 px-4">
              <p className="text-sm whitespace-pre-wrap">{chunk}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
