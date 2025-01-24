import { X, MessageSquare, Users, Send, Smile } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Conversation } from "../chart/types";

interface ConversationViewProps {
  date: string;
  onClose: () => void;
}

export function ConversationView({ date, onClose }: ConversationViewProps) {
  const [activeTab, setActiveTab] = useState<"messages" | "participants">("messages");

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

      return data.map(conv => ({
        id: conv.id,
        user_id: conv.user_id,
        session_id: conv.session_id,
        created_at: conv.created_at,
        messages: (conv.messages as any[]).map(msg => ({
          sender: msg.sender as "user" | "bot",
          content: msg.content as string,
          timestamp: msg.timestamp as string,
        })),
      })) as Conversation[];
    },
  });

  const currentConversation = conversations[0]; // For now, showing the first conversation

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">Group Chat</h2>
            <div className="flex gap-2">
              <Button
                variant={activeTab === "messages" ? "default" : "ghost"}
                onClick={() => setActiveTab("messages")}
                className="h-8"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Messages
              </Button>
              <Button
                variant={activeTab === "participants" ? "default" : "ghost"}
                onClick={() => setActiveTab("participants")}
                className="h-8"
              >
                <Users className="mr-2 h-4 w-4" />
                Participants
              </Button>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex flex-1">
          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 p-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <p>Loading messages...</p>
                </div>
              ) : !currentConversation ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No messages found for this date.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentConversation.messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.sender === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`flex max-w-[70%] items-start gap-2 ${
                          message.sender === "user" ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/placeholder.svg" />
                          <AvatarFallback>
                            {message.sender === "user" ? "U" : "B"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {message.sender === "user" ? "You" : "Assistant"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(message.timestamp).toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div
                            className={`rounded-lg p-3 ${
                              message.sender === "user"
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
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="border-t p-4">
              <div className="flex items-center gap-2">
                <Input 
                  placeholder="Write your message..." 
                  className="flex-1"
                />
                <Button size="icon" variant="ghost">
                  <Smile className="h-5 w-5" />
                </Button>
                <Button size="icon">
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}