import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Split } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";

type TimeRange = "daily" | "weekly" | "monthly" | "yearly";

interface ConversationMessage {
  sender: "user" | "bot";
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  user_id: string;
  session_id: string;
  created_at: string;
  messages: ConversationMessage[];
}

interface ChartData {
  name: string;
  users: number;
}

async function fetchConversationData(timeRange: TimeRange): Promise<ChartData[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('created_at')
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Group conversations by date and count users
  const groupedData = data.reduce((acc: { [key: string]: number }, item) => {
    const date = new Date(item.created_at);
    const key = date.toLocaleDateString('en-US', { month: 'short' });
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(groupedData).map(([name, users]) => ({
    name,
    users,
  }));
}

async function fetchConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;

  // Transform the messages from Json to ConversationMessage[]
  return data.map(conv => ({
    ...conv,
    messages: (conv.messages as any[]).map(msg => ({
      sender: msg.sender as "user" | "bot",
      content: msg.content as string,
      timestamp: msg.timestamp as string
    }))
  }));
}

export function UserChart() {
  const [timeRange, setTimeRange] = useState<TimeRange>("monthly");
  const [splitView, setSplitView] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [showConversationDetail, setShowConversationDetail] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const { toast } = useToast();

  const { data: chartData = [], isLoading: isChartLoading } = useQuery({
    queryKey: ['conversationStats', timeRange],
    queryFn: () => fetchConversationData(timeRange),
  });

  const { data: conversations = [], isLoading: isConversationsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
    enabled: showConversations,
  });

  const handleBarClick = () => {
    setShowConversations(true);
  };

  const handleConversationClick = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowConversationDetail(true);
  };

  return (
    <>
      <Card className="glass-card animate-enter">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">User Activity</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSplitView(!splitView)}
              className="h-8 w-8"
            >
              <Split className="h-4 w-4" />
            </Button>
            <Select 
              value={timeRange} 
              onValueChange={setTimeRange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent className={splitView ? "grid grid-rows-2 gap-4" : "h-[300px]"}>
          {isChartLoading ? (
            <div className="flex items-center justify-center h-full">
              <p>Loading chart data...</p>
            </div>
          ) : (
            splitView ? (
              <>
                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} onClick={handleBarClick}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="users" fill="hsl(var(--primary))" name="Users" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} onClick={handleBarClick}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="users" fill="hsl(var(--primary))" name="Users" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} onClick={handleBarClick}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="users" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            )
          )}
        </CardContent>
      </Card>

      <Sheet open={showConversations} onOpenChange={setShowConversations}>
        <SheetContent side="right" className="w-full sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>User Conversations</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {isConversationsLoading ? (
              <p>Loading conversations...</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="cursor-pointer rounded-lg border p-4 hover:bg-accent"
                  onClick={() => handleConversationClick(conv)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Session: {conv.session_id}</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(conv.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={showConversationDetail} onOpenChange={setShowConversationDetail}>
        <SheetContent side="right" className="w-full sm:w-[640px]">
          <SheetHeader>
            <SheetTitle>Conversation Detail - Session {selectedConversation?.session_id}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {selectedConversation?.messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`rounded-lg p-3 ${
                    message.sender === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p>{message.content}</p>
                  <span className="mt-1 block text-xs opacity-70">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}