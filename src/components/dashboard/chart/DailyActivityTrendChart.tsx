import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardData } from '@/hooks/useDashboardData'; // Adjust path as needed

interface DailyActivityTrendChartProps {
  timeFilter: 'today' | 'yesterday' | 'week' | 'month';
  userFilter: string; 
}

const DailyActivityTrendChart: React.FC<DailyActivityTrendChartProps> = ({ timeFilter, userFilter }) => {
  const { dailyActivityData, isLoading } = useDashboardData(timeFilter, userFilter);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Campaign Users vs Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading chart data...</p>
        </CardContent>
      </Card>
    );
  }

  if (!dailyActivityData || dailyActivityData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Campaign Users vs Appointments ({timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1)})</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No data available for the selected period.</p>
        </CardContent>
      </Card>
    );
  }
  
  // Ensure data is sorted by date for the line chart
  const sortedData = [...dailyActivityData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Campaign Users vs Appointments ({timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1)})</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={sortedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(tick) => new Date(tick).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            />
            <YAxis allowDecimals={false} />
            <Tooltip 
              labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            />
            <Legend />
            <Line type="monotone" dataKey="segmentedCampaignUsers" stroke="#3b82f6" name="Segmented Campaign Users" activeDot={{ r: 8 }} />
            <Line type="monotone" dataKey="appointmentsMade" stroke="#82ca9d" name="Appointments Made" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DailyActivityTrendChart;
