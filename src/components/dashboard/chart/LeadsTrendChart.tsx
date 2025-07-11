import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Tables } from "@/integrations/supabase/types";
import { useMemo } from "react";
import { format, parseISO, startOfDay, startOfWeek, startOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, subDays, subWeeks, subMonths } from 'date-fns';

interface LeadsTrendChartProps {
  leads: Tables<'leads'>[];
  timeFilter: 'today' | 'yesterday' | 'week' | 'month' | 'custom';
  className?: string;
}

const formatDate = (date: Date, timeFilter: LeadsTrendChartProps['timeFilter']): string => {
  switch (timeFilter) {
    case 'today':
    case 'yesterday':
      return format(date, 'HH:00'); // Hourly for today/yesterday (though less granular for single day)
    case 'week':
      return format(date, 'MMM d'); // Daily for week
    case 'month':
      return format(date, 'MMM d'); // Daily for month
    default:
      return format(date, 'MMM d');
  }
};

const aggregateData = (leads: Tables<'leads'>[], timeFilter: LeadsTrendChartProps['timeFilter'], dateRange?: { from: Date, to: Date }) => {
  if (!leads.length) return [];

  const now = new Date();
  let startDate: Date;
  let endDate: Date = startOfDay(now); // Default to today for aggregation end

  if (timeFilter === 'custom' && dateRange) {
    startDate = dateRange.from;
    endDate = dateRange.to;
  } else {
    switch (timeFilter) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case 'yesterday':
        startDate = startOfDay(subDays(now, 1));
        endDate = startOfDay(now); // end of yesterday
        break;
      case 'week':
        startDate = startOfWeek(subWeeks(now, 0), { weekStartsOn: 1 }); // Current week starting Monday
        break;
      case 'month':
        startDate = startOfMonth(subMonths(now, 0)); // Current month
        break;
      default:
        startDate = startOfDay(subDays(now, 7)); // Default to last 7 days
    }
  }
  
  const relevantLeads = leads.filter(lead => {
    const leadDate = parseISO(lead.created_at);
    return leadDate >= startDate && leadDate <= (timeFilter === 'yesterday' ? endDate : now) ;
  });

  const groupedData: { [key: string]: number } = {};

  relevantLeads.forEach(lead => {
    const leadDate = parseISO(lead.created_at);
    let key: string;
    if (timeFilter === 'today' || timeFilter === 'yesterday') {
      key = format(leadDate, 'yyyy-MM-dd HH:00'); // Group by hour
    } else if (timeFilter === 'week' || timeFilter === 'month') {
      key = format(startOfDay(leadDate), 'yyyy-MM-dd'); // Group by day
    } else {
      key = format(startOfDay(leadDate), 'yyyy-MM-dd');
    }
    groupedData[key] = (groupedData[key] || 0) + 1;
  });
  
  // Create a complete series for the chart
  let intervalDates: Date[] = [];
  if (timeFilter === 'today' || timeFilter === 'yesterday') {
    // For hourly, we might need a more dynamic range based on actual lead times or fixed 24h
    // This is simplified for now
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
      leads: groupedData[dataKey] || 0,
    };
  }).sort((a,b) => new Date(a.name).getTime() - new Date(b.name).getTime()); // Ensure correct order
};


export function LeadsTrendChart({ leads, timeFilter, className }: LeadsTrendChartProps) {
  const chartData = useMemo(() => aggregateData(leads, timeFilter), [leads, timeFilter]);

  if (!leads || leads.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Leads Over Time</CardTitle>
          <CardDescription>No lead data available for the selected period.</CardDescription>
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
        <CardTitle>Leads Over Time</CardTitle>
        <CardDescription>
          Number of new leads received over the selected period ({timeFilter}).
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
            <Legend wrapperStyle={{fontSize: "12px"}}/>
            <Line type="monotone" dataKey="leads" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
