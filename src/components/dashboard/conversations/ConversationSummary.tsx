
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { UseMutationResult } from "@tanstack/react-query";
import { format } from "date-fns";

interface ConversationSummaryProps {
  summarizeMutation: UseMutationResult<string | null, Error, void, unknown>;
  summary: string | null;
  summaryTimestamp: string | null;
  hasMessages: boolean;
}

export function ConversationSummary({ 
  summarizeMutation, 
  summary, 
  summaryTimestamp,
  hasMessages 
}: ConversationSummaryProps) {
  return (
    <div className="border-t bg-muted/30 backdrop-blur-sm p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-4">
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
          {summaryTimestamp && (
            <span className="text-sm text-muted-foreground">
              Last summarized: {format(new Date(summaryTimestamp), "MMM d, yyyy 'at' h:mm a")}
            </span>
          )}
        </div>
        
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
