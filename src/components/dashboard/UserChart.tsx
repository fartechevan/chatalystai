import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ChartControls } from "./chart/ChartControls";
import { DataChart } from "./chart/DataChart";
import { ConversationView } from "./conversations/ConversationView";
import type { TimeRange, ChartData } from "./chart/types";

async function fetchConversationData(timeRange: TimeRange): Promise<ChartData[]> {
  const now = new Date();
  let startDate: Date;
  let dateFormat: Intl.DateTimeFormatOptions = {};

  switch (timeRange) {
    case "daily":
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      dateFormat = { weekday: 'short' };
      break;
    case "weekly":
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 28); // 4 weeks
      dateFormat = { day: 'numeric', month: 'short' };
      break;
    case "yearly":
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
      dateFormat = { month: 'short' };
      break;
    default: // monthly
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      dateFormat = { month: 'short', day: 'numeric' };
  }

  const { data, error } = await supabase
    .from('conversations')
    .select('created_at')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error("Error fetching conversation data:", error);
    throw error;
  }

  const groupedData = data.reduce((acc: { [key: string]: number }, item) => {
    const date = new Date(item.created_at);
    const key = date.toLocaleDateString('en-US', dateFormat);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  // Store the actual dates for each display key
  const dateMap = data.reduce((acc: { [key: string]: string }, item) => {
    const date = new Date(item.created_at);
    const key = date.toLocaleDateString('en-US', dateFormat);
    if (!acc[key]) {
      acc[key] = item.created_at;
    }
    return acc;
  }, {});

  return Object.entries(groupedData).map(([name, users]) => ({
    name,
    users: users as number,
    date: dateMap[name], // Add the actual date to the chart data
  }));
}

export function UserChart() {
  const [timeRange, setTimeRange] = useState<TimeRange>("monthly");
  const [splitView, setSplitView] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: chartData = [], isLoading: isChartLoading } = useQuery({
    queryKey: ['conversationStats', timeRange],
    queryFn: () => fetchConversationData(timeRange),
  });

  const handleBarClick = (data: ChartData) => {
    setSelectedDate(data.date); // Use the actual date from the data
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
          ) : splitView ? (
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
          )}
        </CardContent>
      </Card>

      {selectedDate && (
        <ConversationView
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </>
  );
}