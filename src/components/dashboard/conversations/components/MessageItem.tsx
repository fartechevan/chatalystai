
import { Avatar } from "@/components/ui/avatar";
import type { Conversation, Message as MessageType } from "../types";

interface MessageItemProps {
  message: MessageType;
  conversation: Conversation | null;
}

export function MessageItem({ message, conversation }: MessageItemProps) {
  // Determine if this message is from an admin based on the sender_participant_id
  // We need to check if the sender's participant ID corresponds to an admin role in the conversation
  const isAdmin = conversation?.participants?.some(
    participant => participant.id === message.sender_participant_id && participant.role === 'admin'
  ) || false;
  
  return (
    <div
      className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`flex max-w-[70%] items-start gap-2 ${
          isAdmin ? "flex-row-reverse" : "flex-row"
        }`}
      >
        <Avatar className="h-8 w-8">
          <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary font-medium">
            {isAdmin ? 'A' : 'U'}
          </div>
        </Avatar>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">
              {isAdmin ? 'Admin' : 'User'}
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
              isAdmin
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
}
