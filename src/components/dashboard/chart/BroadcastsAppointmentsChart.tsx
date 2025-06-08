import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Assuming shadcn/ui
import { useDashboardData } from '@/hooks/useDashboardData'; // Adjust path as needed

interface BroadcastsAppointmentsChartProps {
  timeFilter: 'today' | 'yesterday' | 'week' | 'month';
  userFilter: string; // Or whatever type your userFilter is
}

const BroadcastsAppointmentsChart: React.FC<BroadcastsAppointmentsChartProps> = ({ timeFilter, userFilter }) => {
  const { broadcasts, appointments, isLoading } = useDashboardData(timeFilter, userFilter);

  // Log the data for debugging
  console.log('BroadcastsAppointmentsChart - broadcasts:', broadcasts);
  console.log('BroadcastsAppointmentsChart - appointments:', appointments);
  console.log('BroadcastsAppointmentsChart - isLoading:', isLoading);


  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Broadcasts vs Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading chart data...</p>
        </CardContent>
      </Card>
    );
  }

  const data = [
    {
      name: 'Metrics',
      broadcastsSent: broadcasts.length,
      appointmentsMade: appointments.length,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Broadcasts vs Appointments ({timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1)})</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="broadcastsSent" fill="#8884d8" name="Broadcasts Sent" />
            <Bar dataKey="appointmentsMade" fill="#82ca9d" name="Appointments Made" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default BroadcastsAppointmentsChart;
