import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Split } from "lucide-react";

const data = [
  { name: "Jan", users: 400, satisfied: 300, unsatisfied: 100 },
  { name: "Feb", users: 300, satisfied: 200, unsatisfied: 100 },
  { name: "Mar", users: 600, satisfied: 400, unsatisfied: 200 },
  { name: "Apr", users: 800, satisfied: 600, unsatisfied: 200 },
  { name: "May", users: 700, satisfied: 500, unsatisfied: 200 },
];

type TimeRange = "daily" | "weekly" | "monthly" | "yearly";

interface Conversation {
  id: string;
  userId: string;
  sessionId: string;
  timestamp: string;
  messages: Array<{
    sender: "user" | "bot";
    content: string;
    timestamp: string;
  }>;
  satisfied: boolean;
}

const mockConversations: Conversation[] = [
  {
    id: "1",
    userId: "user123",
    sessionId: "session_abc123",
    timestamp: "2024-01-20T10:00:00Z",
    satisfied: true,
    messages: [
      { sender: "user", content: "Hi, I need help with my order", timestamp: "2024-01-20T10:00:00Z" },
      { sender: "bot", content: "Hello! I'd be happy to help. Could you provide your order number?", timestamp: "2024-01-20T10:00:05Z" },
    ],
  },
  // Add more mock conversations as needed
];

export function UserChart() {
  const [timeRange, setTimeRange] = useState<TimeRange>("monthly");
  const [splitView, setSplitView] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showConversations, setShowConversations] = useState(false);
  const [showConversationDetail, setShowConversationDetail] = useState(false);

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
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
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
          {splitView ? (
            <>
              <div className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} onClick={handleBarClick}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="satisfied" fill="hsl(var(--success))" name="Satisfied Users" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} onClick={handleBarClick}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="unsatisfied" fill="hsl(var(--warning))" name="Unsatisfied Users" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} onClick={handleBarClick}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="users" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Sheet open={showConversations} onOpenChange={setShowConversations}>
        <SheetContent side="right" className="w-full sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>User Conversations</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {mockConversations.map((conv) => (
              <div
                key={conv.id}
                className="cursor-pointer rounded-lg border p-4 hover:bg-accent"
                onClick={() => handleConversationClick(conv)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">Session: {conv.sessionId}</span>
                  <span className={conv.satisfied ? "text-success" : "text-warning"}>
                    {conv.satisfied ? "Satisfied" : "Unsatisfied"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {new Date(conv.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={showConversationDetail} onOpenChange={setShowConversationDetail}>
        <SheetContent side="right" className="w-full sm:w-[640px]">
          <SheetHeader>
            <SheetTitle>Conversation Detail - Session {selectedConversation?.sessionId}</SheetTitle>
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
