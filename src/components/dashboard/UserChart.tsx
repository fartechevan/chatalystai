import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ChartControls } from "./chart/ChartControls";
import { DataChart } from "./chart/DataChart";
import { ConversationList } from "./chart/ConversationList";
import { ConversationDetail } from "./chart/ConversationDetail";
import type { TimeRange, Conversation, ChartData } from "./chart/types";

async function fetchConversationData(timeRange: TimeRange): Promise<ChartData[]> {
  const now = new Date();
  let startDate: Date;
  let dateFormat: Intl.DateTimeFormatOptions = {};

  switch (timeRange) {
    case "daily":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFormat = { weekday: 'short' };
      break;
    case "weekly":
      startDate = new Date(now.getTime() - 4 * 7 * 24 * 60 * 60 * 1000);
      dateFormat = { day: 'numeric', month: 'short' };
      break;
    case "yearly":
      startDate = new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000);
      dateFormat = { month: 'short' };
      break;
    default: // monthly
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFormat = { month: 'short', day: 'numeric' };
  }

  const { data, error } = await supabase
    .from('conversations')
    .select('created_at')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) throw error;

  const groupedData = data.reduce((acc: { [key: string]: number }, item) => {
    const date = new Date(item.created_at);
    const key = date.toLocaleDateString('en-US', dateFormat);
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
          <ChartControls
            timeRange={timeRange}
            splitView={splitView}
            onTimeRangeChange={setTimeRange}
            onSplitViewToggle={() => setSplitView(!splitView)}
          />
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
                  <DataChart data={chartData} onClick={handleBarClick} />
                </div>
                <div className="h-[140px]">
                  <DataChart data={chartData} onClick={handleBarClick} />
                </div>
              </>
            ) : (
              <DataChart data={chartData} onClick={handleBarClick} />
            )
          )}
        </CardContent>
      </Card>

      <ConversationList
        open={showConversations}
        onOpenChange={setShowConversations}
        conversations={conversations}
        isLoading={isConversationsLoading}
        onConversationClick={handleConversationClick}
      />

      <ConversationDetail
        open={showConversationDetail}
        onOpenChange={setShowConversationDetail}
        conversation={selectedConversation}
      />
    </>
  );
}