
import { AlertCircle, Box, Layers } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ProductChunkingGuide() {
  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Chunking Guidelines</AlertTitle>
        <AlertDescription>
          Break down your product or service information into meaningful, searchable chunks.
          Each chunk should represent a complete, self-contained piece of information.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Box className="h-4 w-4" />
              Product Information
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="list-disc pl-4 space-y-2">
              <li>Product features and specifications</li>
              <li>Use cases and benefits</li>
              <li>Technical requirements</li>
              <li>Pricing information</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4" />
              Service Details
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="list-disc pl-4 space-y-2">
              <li>Service descriptions and scope</li>
              <li>Implementation process</li>
              <li>Support and maintenance</li>
              <li>Service level agreements</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
