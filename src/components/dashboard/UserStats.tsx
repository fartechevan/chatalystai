import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserStats as UserStatsType } from "@/types/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function fetchUserStats(): Promise<UserStatsType> {
  // Get current month using date_part from PostgreSQL
  const { data: currentMonthData, error: monthError } = await supabase
    .rpc('get_current_month');
  
  if (monthError) throw monthError;
  
  const currentMonth = currentMonthData?.[0]?.month_number;

  // Get monthly active users for current month
  const { data: monthlyData, error: monthlyError } = await supabase
    .from('conversations')
    .select('user_id')
    .eq('created_at::date_part(\'month\')', currentMonth);

  if (monthlyError) throw monthlyError;

  // Get weekly active users (current week)
  const { data: weeklyData, error: weeklyError } = await supabase
    .from('conversations')
    .select('user_id')
    .eq('created_at::date_part(\'week\')', 
      // Get the current week number using PostgreSQL
      (await supabase.rpc('get_current_week')).data?.[0]?.week_of_month
    );

  if (weeklyError) throw weeklyError;

  // Get unique user counts
  const uniqueMonthlyUsers = [...new Set(monthlyData?.map(conv => conv.user_id) || [])];
  const uniqueWeeklyUsers = [...new Set(weeklyData?.map(conv => conv.user_id) || [])];

  // Get new users in the current month
  const { data: newUsersData, error: newUsersError } = await supabase
    .from('profiles')
    .select('id')
    .eq('created_at::date_part(\'month\')', currentMonth);

  if (newUsersError) throw newUsersError;

  return {
    activeMonthly: uniqueMonthlyUsers.length,
    activeWeekly: uniqueWeeklyUsers.length,
    newUsers: newUsersData?.length || 0,
  };
}

export function UserStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['userStats'],
    queryFn: fetchUserStats,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="glass-card animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="h-4 w-32 bg-muted rounded"></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="glass-card animate-enter">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Active Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.activeMonthly}</div>
        </CardContent>
      </Card>
      <Card className="glass-card animate-enter [animation-delay:100ms]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Weekly Active Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.activeWeekly}</div>
        </CardContent>
      </Card>
      <Card className="glass-card animate-enter [animation-delay:200ms]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">New Active Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.newUsers}</div>
        </CardContent>
      </Card>
    </div>
  );
}