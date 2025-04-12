import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Lead } from "./types/lead";
import type { Conversation } from "./types";
import type { ConversationParticipant } from "./types/conversation";

interface ConversationParticipantsProps {
  conversation: Conversation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Customer {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
}

export function ConversationParticipants({
  conversation,
  open,
  onOpenChange
}: ConversationParticipantsProps) {
  // console.log("CP: Conversation:", conversation); // Removed log

  if (!conversation || !conversation.participants) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conversation Participants</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {conversation.participants.map((participant: ConversationParticipant) => (
            <div key={participant.id} className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {participant.role === "admin" ? "A" : "C"}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">
                  {participant.role === "admin"
                    ? "Admin"
                    : participant.customer?.name || "User"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {participant.profiles?.email || "No email"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
