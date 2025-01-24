import { X, MessageSquare, Send, Smile, Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

interface Profile {
  name: string | null;
  email: string;
}

interface ConversationMessage {
  sender: "user" | "bot";
  content: string;
  timestamp: string;
}

interface ConversationWithProfile {
  id: string;
  user_id: string;
  session_id: string;
  created_at: string;
  messages: ConversationMessage[];
  profile: Profile | null;
}

interface ConversationViewProps {
  date: string;
  onClose: () => void;
}

export function ConversationView({ date, onClose }: ConversationViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithProfile | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // Fetch conversations for the selected date
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations', date],
    queryFn: async () => {
      const selectedDate = new Date(date);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      console.log('Fetching conversations for date:', {
        date,
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString()
      });

      const { data, error } = await supabase
        .from('conversations')
        .select('*, profiles(name, email)')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());

      if (error) {
        console.error('Error fetching conversations:', error);
        throw error;
      }

      return data.map(conv => ({
        id: conv.id,
        user_id: conv.user_id,
        session_id: conv.session_id,
        created_at: conv.created_at,
        messages: (conv.messages as Json[] as unknown) as ConversationMessage[],
        profile: conv.profiles as Profile | null,
      }));
    },
  });

  // Enhanced filter function to search by name, email, and session ID
  const filteredConversations = conversations.filter(conv => {
    const searchLower = searchQuery.toLowerCase();
    return (
      conv.profile?.name?.toLowerCase().includes(searchLower) ||
      conv.profile?.email.toLowerCase().includes(searchLower) ||
      conv.session_id.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="flex h-full">
        {/* Left Sidebar with Hamburger Menu */}
        <div className={`${leftPanelOpen ? 'w-64' : 'w-12'} border-r bg-muted/30 transition-all duration-300 relative md:w-64`}>
          <button
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            className="md:hidden absolute right-0 top-0 p-2 transform translate-x-full bg-background border rounded-r-lg"
          >
            {leftPanelOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          
          <div className={`${leftPanelOpen ? 'opacity-100' : 'opacity-0 md:opacity-100'} transition-opacity duration-300`}>
            <div className="p-4 border-b">
              <Input
                placeholder="Search by name, email or session..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <ScrollArea className="h-[calc(100vh-5rem)]">
              <div className="space-y-2 p-4">
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer ${
                      selectedConversation?.id === conv.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => setSelectedConversation(conv)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="/placeholder.svg" />
                      <AvatarFallback>
                        {conv.profile?.name?.[0] || conv.profile?.email[0].toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {conv.profile?.name || conv.profile?.email || `User ${conv.session_id}`}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {new Date(conv.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">Chat</h2>
              <MessageSquare className="h-4 w-4" />
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1 px-6 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p>Loading messages...</p>
              </div>
            ) : !selectedConversation ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Select a conversation to view messages.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedConversation.messages.map((message, index) => (
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
                          {message.sender === "user" ? 
                            (selectedConversation.profile?.name?.[0] || 
                             selectedConversation.profile?.email[0].toUpperCase() || 'U') : 
                            'B'
                          }
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {message.sender === "user" ? 
                              (selectedConversation.profile?.name || 
                               selectedConversation.profile?.email || 
                               "You") : 
                              "Assistant"
                            }
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

        {/* Right Sidebar with Hamburger Menu */}
        <div className={`${rightPanelOpen ? 'w-64' : 'w-12'} border-l bg-muted/30 transition-all duration-300 relative md:w-64`}>
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="md:hidden absolute left-0 top-0 p-2 transform -translate-x-full bg-background border rounded-l-lg"
          >
            {rightPanelOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          
          <div className={`${rightPanelOpen ? 'opacity-100' : 'opacity-0 md:opacity-100'} transition-opacity duration-300`}>
            <div className="p-4 border-b">
              <h3 className="font-medium">User Details</h3>
            </div>
            <ScrollArea className="h-[calc(100vh-5rem)]">
              <div className="space-y-2 p-4">
                {selectedConversation && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src="/placeholder.svg" />
                        <AvatarFallback>
                          {selectedConversation.profile?.name?.[0] || 
                           selectedConversation.profile?.email[0].toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {selectedConversation.profile?.name || 
                           selectedConversation.profile?.email || 
                           `User ${selectedConversation.session_id}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedConversation.profile?.email}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Chat Info</h4>
                      <div className="text-sm">
                        <p>Started: {new Date(selectedConversation.created_at).toLocaleString()}</p>
                        <p>Messages: {selectedConversation.messages.length}</p>
                        <p>Session ID: {selectedConversation.session_id}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}