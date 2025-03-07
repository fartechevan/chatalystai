
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Message, Conversation } from "./types";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MessageListProps {
  messages: Message[];
  selectedConversation: Conversation;
}

export function MessageList({ messages, selectedConversation }: MessageListProps) {
  const [participantInfo, setParticipantInfo] = useState<Record<string, any>>({});

  useEffect(() => {
    const loadParticipantInfo = async () => {
      if (!selectedConversation?.conversation_id) return;

      try {
        const { data, error } = await supabase
          .from('conversation_participants')
          .select('id, customer_id, external_user_identifier, role')
          .eq('conversation_id', selectedConversation.conversation_id);

        if (error) throw error;

        const participantMap: Record<string, any> = {};
        for (const participant of data || []) {
          participantMap[participant.id] = participant;
        }

        setParticipantInfo(participantMap);
      } catch (err) {
        console.error('Error loading participant info:', err);
      }
    };

    loadParticipantInfo();
  }, [selectedConversation?.conversation_id]);

  const getAvatarFallback = (participantId: string) => {
    const participant = participantInfo[participantId];
    if (!participant) return 'U';
    
    if (participant.role === 'admin') {
      return 'A';
    } else {
      return 'C';
    }
  };

  const getUserDisplayName = (participantId: string) => {
    const participant = participantInfo[participantId];
    if (!participant) return 'Unknown User';
    
    if (participant.role === 'admin') {
      return 'Admin';
    } else {
      return 'Customer';
    }
  };

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const participantId = message.sender_participant_id || '';
        const isAdmin = participantInfo[participantId]?.role === 'admin';

        return (
          <div
            key={message.message_id}
            className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`flex max-w-[70%] items-start gap-2 ${
                isAdmin ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {getAvatarFallback(participantId)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">
                    {getUserDisplayName(participantId)}
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
      })}
    </div>
  );
}
