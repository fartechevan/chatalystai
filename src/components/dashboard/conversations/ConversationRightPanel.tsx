
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";
import { ConversationSummary } from "./ConversationSummary";
import { ConversationUserDetails } from "./ConversationUserDetails";
import type { Conversation } from "./types";

interface ConversationRightPanelProps {
  conversation: Conversation | null;
  summary: string | null;
  summaryTimestamp: string | null;
}

export function ConversationRightPanel({
  conversation,
  summary,
  summaryTimestamp
}: ConversationRightPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`border-l transition-all ${
        isExpanded ? "w-80" : "w-0 md:w-80"
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b p-3">
          <h3 className="font-semibold">Conversation Details</h3>
          <Button
            variant="ghost"
            size="icon"
            className="block md:hidden"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ArrowRight className="h-5 w-5" />
            ) : (
              <ArrowLeft className="h-5 w-5" />
            )}
          </Button>
        </div>
        <div
          className={`flex-1 overflow-auto transition-all ${
            isExpanded ? "opacity-100" : "opacity-0 md:opacity-100"
          }`}
        >
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="p-4">
              <ConversationSummary 
                summary={summary} 
                summaryTimestamp={summaryTimestamp} 
              />
            </TabsContent>
            <TabsContent value="details" className="p-4">
              <ConversationUserDetails conversation={conversation} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
