
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Message, Conversation } from "./types";

interface MessageListProps {
  messages: Message[];
  selectedConversation: Conversation;
}

export function MessageList({ messages, selectedConversation }: MessageListProps) {
  const getAvatarFallback = (user: { name: string | null; email: string } | null) => {
    if (!user) return '?';
    if (user.name) return user.name[0].toUpperCase();
    if (user.email) return user.email[0].toUpperCase();
    return '?';
  };

  const getUserDisplayName = (user: { name: string | null; email: string } | null) => {
    if (!user) return 'Unknown User';
    return user.name || user.email;
  };

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.message_id}
          className={`flex ${
            message.sender_id === selectedConversation.sender_id ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`flex max-w-[70%] items-start gap-2 ${
              message.sender_id === selectedConversation.sender_id ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {message.sender_id === selectedConversation.sender_id 
                  ? getAvatarFallback(selectedConversation.sender)
                  : getAvatarFallback(selectedConversation.receiver)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">
                  {message.sender_id === selectedConversation.sender_id 
                    ? getUserDisplayName(selectedConversation.sender)
                    : getUserDisplayName(selectedConversation.receiver)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div
                className={`rounded-lg p-3 ${
                  message.sender_id === selectedConversation.sender_id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
