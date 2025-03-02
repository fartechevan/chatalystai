
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { UseMutationResult } from "@tanstack/react-query";

interface ConversationSummaryProps {
  summary: string | null;
  summaryTimestamp: string | null;
  summarizeMutation?: UseMutationResult<any, Error, void, unknown>;
}

export function ConversationSummary({
  summary,
  summaryTimestamp,
  summarizeMutation,
}: ConversationSummaryProps) {
  const formattedDate = (dateString: string | null) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      }).format(date);
    } catch (e) {
      return "";
    }
  };

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center">
        <div className="mb-4 rounded-full bg-gray-100 p-3">
          <RefreshCw className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium">No Summary Available</h3>
        <p className="mt-2 max-w-xs text-sm text-gray-500">
          Generate a summary to get a quick overview of this conversation.
        </p>
        {summarizeMutation && (
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => summarizeMutation.mutate()}
            disabled={summarizeMutation.isPending}
          >
            {summarizeMutation.isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Summary"
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Conversation Summary</h3>
        {summarizeMutation && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => summarizeMutation.mutate()}
            disabled={summarizeMutation.isPending}
          >
            {summarizeMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
      <p className="text-sm text-gray-700">{summary}</p>
      {summaryTimestamp && (
        <p className="text-xs text-gray-500">
          Last updated: {formattedDate(summaryTimestamp)}
        </p>
      )}
    </div>
  );
}
