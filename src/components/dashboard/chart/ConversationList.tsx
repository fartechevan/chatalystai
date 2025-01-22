import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface ConversationMessage {
  sender: "user" | "bot";
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  user_id: string;
  session_id: string;
  created_at: string;
  messages: ConversationMessage[];
}

interface ConversationListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: Conversation[];
  isLoading: boolean;
  onConversationClick: (conversation: Conversation) => void;
}

export function ConversationList({
  open,
  onOpenChange,
  conversations,
  isLoading,
  onConversationClick,
}: ConversationListProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>User Conversations</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {isLoading ? (
            <p>Loading conversations...</p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className="cursor-pointer rounded-lg border p-4 hover:bg-accent"
                onClick={() => onConversationClick(conv)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">Session: {conv.session_id}</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(conv.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}