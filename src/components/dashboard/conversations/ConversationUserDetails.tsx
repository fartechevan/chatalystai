
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Conversation, Message } from "./types";

interface ConversationUserDetailsProps {
  conversation: Conversation;
  messages: Message[];
}

export function ConversationUserDetails({ conversation, messages }: ConversationUserDetailsProps) {
  return (
    <div className="bg-muted/30 backdrop-blur-sm p-6">
      <div className="max-w-5xl mx-auto">
        <h3 className="font-medium mb-4">User Details</h3>
        <div className="flex items-start gap-6">
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16">
              <AvatarFallback>
                {conversation.receiver.name?.[0] || 
                 conversation.receiver.email[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">
                {conversation.receiver.name || 
                 conversation.receiver.email}
              </p>
              <p className="text-sm text-muted-foreground">
                {conversation.receiver.email}
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-medium">Chat Info</h4>
            <div className="text-sm text-muted-foreground">
              <p>Started: {new Date(conversation.created_at).toLocaleString()}</p>
              <p>Messages: {messages.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
