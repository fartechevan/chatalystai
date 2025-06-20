import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardData } from '@/hooks/useDashboardData';

interface SegmentedBroadcastsAppointmentsChartProps {
  timeFilter: 'today' | 'yesterday' | 'week' | 'month';
  userFilter: string;
}

const SegmentedBroadcastsAppointmentsChart: React.FC<SegmentedBroadcastsAppointmentsChartProps> = ({ timeFilter, userFilter }) => {
  const { segmentedBroadcasts, appointments, isLoading } = useDashboardData(timeFilter, userFilter);

  // Log the data for debugging
  console.log('SegmentedBroadcastsAppointmentsChart - segmentedBroadcasts:', segmentedBroadcasts);
  console.log('SegmentedBroadcastsAppointmentsChart - appointments:', appointments);
  console.log('SegmentedBroadcastsAppointmentsChart - isLoading:', isLoading);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Segmented Broadcasts vs Appointments</CardTitle>
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
      segmentedBroadcastsSent: segmentedBroadcasts.length,
      appointmentsMade: appointments.length,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Segmented Broadcasts vs Appointments ({timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1)})</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="segmentedBroadcastsSent" fill="#3b82f6" name="Segmented Broadcasts" />
            <Bar dataKey="appointmentsMade" fill="#82ca9d" name="Appointments Made" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default SegmentedBroadcastsAppointmentsChart;
