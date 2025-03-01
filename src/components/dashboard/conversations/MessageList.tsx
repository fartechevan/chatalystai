
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
    return user.email[0].toUpperCase();
  };

  const getUserDisplayName = (user: { name: string | null; email: string } | null) => {
    if (!user) return 'Unknown User';
    return user.name || user.email;
  };

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const isCurrentSender = message.sender_participant_id === (selectedConversation.sender_id || '');
        const participant = isCurrentSender ? selectedConversation.sender : selectedConversation.receiver;
        const participantType = isCurrentSender 
          ? selectedConversation.sender_type || 'unknown'
          : selectedConversation.receiver_type || 'unknown';

        return (
          <div
            key={message.message_id}
            className={`flex ${isCurrentSender ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`flex max-w-[70%] items-start gap-2 ${
                isCurrentSender ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {getAvatarFallback(participant)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">
                    {getUserDisplayName(participant)}
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
                    isCurrentSender
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
