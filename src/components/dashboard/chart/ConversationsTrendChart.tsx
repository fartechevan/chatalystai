import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Tables } from "@/integrations/supabase/types";
import { useMemo } from "react";
import { format, parseISO, startOfDay, startOfWeek, startOfMonth, eachDayOfInterval, subDays, subWeeks, subMonths } from 'date-fns';

interface ConversationsTrendChartProps {
  conversations: Tables<'conversations'>[];
  timeFilter: 'today' | 'yesterday' | 'week' | 'month';
  className?: string;
}

const formatDate = (date: Date, timeFilter: ConversationsTrendChartProps['timeFilter']): string => {
  switch (timeFilter) {
    case 'today':
    case 'yesterday':
      return format(date, 'HH:00');
    case 'week':
    case 'month':
      return format(date, 'MMM d');
    default:
      return format(date, 'MMM d');
  }
};

const aggregateData = (conversations: Tables<'conversations'>[], timeFilter: ConversationsTrendChartProps['timeFilter']) => {
  if (!conversations.length) return [];

  const now = new Date();
  let startDate: Date;
  let endDate: Date = startOfDay(now);

  switch (timeFilter) {
    case 'today':
      startDate = startOfDay(now);
      break;
    case 'yesterday':
      startDate = startOfDay(subDays(now, 1));
      endDate = startOfDay(now);
      break;
    case 'week':
      startDate = startOfWeek(subWeeks(now, 0), { weekStartsOn: 1 });
      break;
    case 'month':
      startDate = startOfMonth(subMonths(now, 0));
      break;
    default:
      startDate = startOfDay(subDays(now, 7));
  }

  const relevantConversations = conversations.filter(conversation => {
    const conversationDate = parseISO(conversation.created_at);
    return conversationDate >= startDate && conversationDate <= (timeFilter === 'yesterday' ? endDate : now);
  });

  const groupedData: { [key: string]: number } = {};

  relevantConversations.forEach(conversation => {
    const conversationDate = parseISO(conversation.created_at);
    let key: string;
    if (timeFilter === 'today' || timeFilter === 'yesterday') {
      key = format(conversationDate, 'yyyy-MM-dd HH:00');
    } else {
      key = format(startOfDay(conversationDate), 'yyyy-MM-dd');
    }
    groupedData[key] = (groupedData[key] || 0) + 1;
  });

  let intervalDates: Date[] = [];
  if (timeFilter === 'today' || timeFilter === 'yesterday') {
    for (let i = 0; i < 24; i++) {
        const hourDate = new Date(startDate);
        hourDate.setHours(i);
        intervalDates.push(hourDate);
    }
  } else if (timeFilter === 'week') {
    intervalDates = eachDayOfInterval({ start: startDate, end: now });
  } else if (timeFilter === 'month') {
    intervalDates = eachDayOfInterval({ start: startDate, end: now });
  }

  return intervalDates.map(date => {
    let dataKey: string;
     if (timeFilter === 'today' || timeFilter === 'yesterday') {
      dataKey = format(date, 'yyyy-MM-dd HH:00');
    } else {
      dataKey = format(date, 'yyyy-MM-dd');
    }
    return {
      name: formatDate(date, timeFilter),
      conversations: groupedData[dataKey] || 0,
    };
  }).sort((a,b) => new Date(a.name).getTime() - new Date(b.name).getTime());
};

export function ConversationsTrendChart({ conversations, timeFilter, className }: ConversationsTrendChartProps) {
  const chartData = useMemo(() => aggregateData(conversations, timeFilter), [conversations, timeFilter]);

  if (!conversations || conversations.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Conversations Over Time</CardTitle>
          <CardDescription>No conversation data available for the selected period.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">No data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Conversations Over Time</CardTitle>
        <CardDescription>
          Number of new conversations over the selected period ({timeFilter}).
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend wrapperStyle={{fontSize: "12px"}} />
            <Line type="monotone" dataKey="conversations" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
