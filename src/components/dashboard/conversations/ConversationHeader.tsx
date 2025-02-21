
import { MessageSquare } from "lucide-react";

export function ConversationHeader() {
  return (
    <div className="flex items-center gap-4 border-b px-6 py-4 bg-background">
      <h2 className="text-xl font-semibold">Chat</h2>
      <MessageSquare className="h-4 w-4" />
    </div>
  );
}
