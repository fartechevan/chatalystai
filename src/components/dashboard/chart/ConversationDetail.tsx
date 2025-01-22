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

interface ConversationDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation | null;
}

export function ConversationDetail({
  open,
  onOpenChange,
  conversation,
}: ConversationDetailProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[640px]">
        <SheetHeader>
          <SheetTitle>Conversation Detail - Session {conversation?.session_id}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {conversation?.messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`rounded-lg p-3 ${
                  message.sender === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p>{message.content}</p>
                <span className="mt-1 block text-xs opacity-70">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}