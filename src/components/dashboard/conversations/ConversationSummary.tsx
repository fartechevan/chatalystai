
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { UseMutationResult } from "@tanstack/react-query";

interface ConversationSummaryProps {
  summarizeMutation: UseMutationResult<string | null, Error, void, unknown>;
  summary: string | null;
  hasMessages: boolean;
}

export function ConversationSummary({ summarizeMutation, summary, hasMessages }: ConversationSummaryProps) {
  return (
    <div className="border-t bg-muted/30 backdrop-blur-sm p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <Button 
          variant="outline" 
          size="sm"
          className="gap-2"
          disabled={!hasMessages || summarizeMutation.isPending}
          onClick={() => summarizeMutation.mutate()}
        >
          <FileText className="h-4 w-4" />
          {summarizeMutation.isPending ? "Summarizing..." : "Summarize"}
        </Button>
        
        {summary && (
          <div className="rounded-lg bg-muted p-4">
            <h4 className="text-sm font-medium mb-2">Summary</h4>
            <p className="text-sm text-muted-foreground">{summary}</p>
          </div>
        )}
      </div>
    </div>
  );
}
