import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConversationList } from "../chart/ConversationList";
import { ConversationDetail } from "../chart/ConversationDetail";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Conversation } from "../chart/types";

interface ConversationViewProps {
  date: string;
  onClose: () => void;
}

export function ConversationView({ date, onClose }: ConversationViewProps) {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations', date],
    queryFn: async () => {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());

      if (error) throw error;
      return data as Conversation[];
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h2 className="text-lg font-semibold">Conversations for {date}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex flex-1">
          <div className="flex-1 overflow-auto p-4">
            <div className="grid gap-4">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="cursor-pointer rounded-lg border p-4 hover:bg-accent"
                  onClick={() => {
                    setSelectedConversation(conv);
                    setShowDetail(true);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Session: {conv.session_id}</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(conv.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ConversationDetail
        open={showDetail}
        onOpenChange={setShowDetail}
        conversation={selectedConversation}
      />
    </div>
  );
}