import React from 'react';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useDashboardData } from '@/hooks/useDashboardData';
import { DateRange } from 'react-day-picker';
import { formatInTimeZone } from 'date-fns-tz';

interface CampaignsCreatedChartProps {
  timeFilter: 'today' | 'yesterday' | 'week' | 'month' | 'custom';
  userFilter: string;
  dateRange?: DateRange;
}

const CampaignsCreatedChart: React.FC<CampaignsCreatedChartProps> = ({ timeFilter, userFilter, dateRange }) => {
  const { broadcasts, broadcastRecipients } = useDashboardData(
    timeFilter,
    userFilter,
    dateRange ? { from: dateRange.from!, to: dateRange.to! } : undefined
  );

  const aggregatedData = broadcasts.reduce((acc, broadcast) => {
    const date = formatInTimeZone(new Date(broadcast.created_at), 'UTC', 'yyyy-MM-dd');
    const recipients = broadcastRecipients.filter(r => r.broadcast_id === broadcast.id);
    if (!acc[date]) {
      acc[date] = { name: date, campaigns: 0, users: 0 };
    }
    acc[date].campaigns += 1;
    acc[date].users += recipients.length;
    return acc;
  }, {} as Record<string, { name: string; campaigns: number; users: number }>);

  const data = Object.values(aggregatedData).filter(item => item.campaigns > 0);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Campaigns Created Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(value, name, props) => {
            if (name === 'campaigns') {
              return [`${value} campaigns`, `Users blasted: ${props.payload.users}`];
            }
            return [value, name];
          }} />
          <Legend />
          <Line type="monotone" dataKey="campaigns" stroke="#8884d8" activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CampaignsCreatedChart;
