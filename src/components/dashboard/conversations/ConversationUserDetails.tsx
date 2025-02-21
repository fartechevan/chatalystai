
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Conversation, Message } from "./types";

interface ConversationUserDetailsProps {
  conversation: Conversation;
  messages: Message[];
}

export function ConversationUserDetails({ conversation, messages }: ConversationUserDetailsProps) {
  // Determine which participant is the customer
  const customer = conversation.sender_type === 'customer' 
    ? conversation.sender 
    : conversation.receiver;

  const getAvatarFallback = (name: string | null) => {
    if (!name) return '?';
    return name[0].toUpperCase();
  };

  return (
    <div className="bg-muted/30 backdrop-blur-sm p-6">
      <div className="max-w-5xl mx-auto">
        <h3 className="font-medium mb-4">Customer Details</h3>
        <div className="flex items-start gap-6">
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16">
              <AvatarFallback>
                {getAvatarFallback(customer.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">
                {customer.name || 'Unnamed Customer'}
              </p>
              <p className="text-sm text-muted-foreground">
                {customer.email || 'No email provided'}
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
