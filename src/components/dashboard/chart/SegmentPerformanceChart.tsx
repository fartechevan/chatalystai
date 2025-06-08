import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardData } from '@/hooks/useDashboardData';

interface SegmentPerformanceChartProps {
  timeFilter: 'today' | 'yesterday' | 'week' | 'month';
  userFilter: string;
}

const SegmentPerformanceChart: React.FC<SegmentPerformanceChartProps> = ({ timeFilter, userFilter }) => {
  const { segmentPerformanceData, isLoading } = useDashboardData(timeFilter, userFilter);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Segment Performance: Targeted Customers vs Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading chart data...</p>
        </CardContent>
      </Card>
    );
  }

  if (!segmentPerformanceData || segmentPerformanceData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Segment Performance ({timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1)})</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No segment performance data available for the selected period.</p>
          <p className="text-sm text-muted-foreground">Ensure broadcasts have been sent to segments and that appointments have matching contact identifiers (phone numbers).</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Segment Performance: Targeted Customers vs Appointments ({timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1)})</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', overflowX: 'auto' }}> {/* Wrapper for horizontal scrolling */}
          <ResponsiveContainer 
            width={Math.max(segmentPerformanceData.length * 100, 500)} /* Dynamic width, min 500px */
            minWidth={500} /* Ensure a minimum width for the container */
            height={400} /* Fixed height for horizontal bar chart */
          >
            <BarChart 
              data={segmentPerformanceData} 
              // layout="horizontal" // Default, or explicitly set
              margin={{ top: 20, right: 30, left: 20, bottom: 70 }} // Adjusted margins, esp. bottom for angled labels
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="segmentName" 
                type="category"
                interval={0} // Show all labels
                angle={-45} // Angle labels to prevent overlap
                textAnchor="end" // Anchor angled labels correctly
                height={80} // Increase space for angled labels
              />
              <YAxis type="number" allowDecimals={false} />
              <Tooltip />
              <Legend verticalAlign="top" wrapperStyle={{ lineHeight: '40px' }} />
              <Bar dataKey="targetedCustomersCount" fill="#3b82f6" name="Targeted Customers" />
              <Bar dataKey="appointmentsFromSegmentContacts" fill="#82ca9d" name="Appointments from Segment" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default SegmentPerformanceChart;
