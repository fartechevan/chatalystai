import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

type UserStatsType = {
  activeMonthly: number;
  activeWeekly: number;
  newUsers: number;
};

async function fetchUserStats(): Promise<UserStatsType> {

  if (monthError) throw monthError;
  if (!monthData || monthData.length === 0) throw new Error('Failed to get current month');
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = new Date().getMonth() + 1; 

  const { data: weekData, error: weekError } = await supabase
    .rpc('get_current_week');

  if (weekError) throw weekError;
  if (!weekData || weekData.length === 0) throw new Error('Failed to get current week');

  const weekOfMonth = weekData[0].week_of_month;
  if (!weekOfMonth) throw new Error('Failed to get current week');

  // Calculate the start and end dates for the current week
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (6 - today.getDay())); // End of current week (Saturday)

  const { data: weeklyData, error: weeklyError } = await supabase
    .from('conversations')
    .select('user_id')
    .filter('created_at', 'gte', startOfWeek.toISOString().split('T')[0])
    .filter('created_at', 'lt', endOfWeek.toISOString().split('T')[0]);

  if (weeklyError) throw weeklyError;

  // Get monthly active users
  
    const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString(); // Start of current month
    const startOfNextMonth = new Date(currentYear, currentMonth + 1, 1).toISOString(); // Start of next month
    
    const { data: monthlyData, error: monthlyError } = await supabase
      .from('conversations')
      .select('user_id')
      .gte('created_at', startOfMonth)
      .lt('created_at', startOfNextMonth);

    


  if (monthlyError) throw monthlyError;

  // Get new users in current month
  const { data: newUsersData, error: newUsersError } = await supabase
    .from('profiles')
    .select('id')
    .filter('created_at', 'gte', `${new Date().getFullYear()}-${currentMonth}-01`)
    .filter('created_at', 'lt', `${new Date().getFullYear()}-${currentMonth + 1}-01`);

  if (newUsersError) throw newUsersError;

  // Count unique users
  const uniqueMonthlyUsers = new Set(monthlyData?.map(conv => conv.user_id));
  const uniqueWeeklyUsers = new Set(weeklyData?.map(conv => conv.user_id));

  return {
    activeMonthly: uniqueMonthlyUsers.size,
    activeWeekly: uniqueWeeklyUsers.size,
    newUsers: newUsersData?.length || 0,
  };
}

export function UserStats() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['userStats'],
    queryFn: fetchUserStats,
  });

  if (isLoading) {
    return <div>Loading stats...</div>;
  }

  if (error) {
    return <div>Error loading stats: {error.message}</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Active Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data?.activeMonthly}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Weekly Active Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data?.activeWeekly}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">New Users This Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data?.newUsers}</div>
        </CardContent>
      </Card>
    </div>
  );
}