
import { Button } from "@/components/ui/button";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import { UseMutationResult } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import type { ConversationSummary as ConversationSummaryType } from "./types";

interface ConversationSummaryProps {
  summarizeMutation: UseMutationResult<ConversationSummaryType | null, Error, void, unknown>;
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
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border-t bg-muted/30 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto">
        <div className="p-4 flex items-center justify-between">
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
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              {isExpanded ? "Collapse" : "Expand"}
            </Button>
          )}
        </div>
        
        {summary && isExpanded && (
          <div className="px-4 pb-4">
            <div className="rounded-lg bg-muted p-4">
              <h4 className="text-sm font-medium mb-2">Summary</h4>
              <p className="text-sm text-muted-foreground">{summary}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
