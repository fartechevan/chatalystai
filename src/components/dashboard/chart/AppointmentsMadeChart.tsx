import React from 'react';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useDashboardData } from '@/hooks/useDashboardData';
import { DateRange } from 'react-day-picker';
import { formatInTimeZone } from 'date-fns-tz';

interface AppointmentsMadeChartProps {
  timeFilter: 'today' | 'yesterday' | 'week' | 'month' | 'custom';
  userFilter: string;
  dateRange?: DateRange;
}

const AppointmentsMadeChart: React.FC<AppointmentsMadeChartProps> = ({ timeFilter, userFilter, dateRange }) => {
  const { appointments } = useDashboardData(
    timeFilter,
    userFilter,
    dateRange ? { from: dateRange.from!, to: dateRange.to! } : undefined
  );

  const aggregatedData = appointments.reduce((acc, appointment) => {
    const date = formatInTimeZone(new Date(appointment.created_at), 'UTC', 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = { name: date, appointments: 0 };
    }
    acc[date].appointments += 1;
    return acc;
  }, {} as Record<string, { name: string; appointments: number }>);

  const data = Object.values(aggregatedData).filter(item => item.appointments > 0);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Appointments Made Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="appointments" stroke="#82ca9d" activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AppointmentsMadeChart;
