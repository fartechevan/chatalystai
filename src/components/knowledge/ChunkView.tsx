
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Box } from "lucide-react";

interface ChunkViewProps {
  chunk: string;
  index: number;
  total: number;
}

export function ChunkView({ chunk, index, total }: ChunkViewProps) {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Box className="h-4 w-4" />
            Chunk {index + 1} of {total}
          </CardTitle>
          <Badge variant="outline">
            {chunk.length.toLocaleString()} characters
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="whitespace-pre-wrap text-sm text-muted-foreground">
          {chunk}
        </div>
      </CardContent>
    </Card>
  );
}
