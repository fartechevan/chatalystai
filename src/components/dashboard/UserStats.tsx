import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserStats as UserStatsType } from "@/types/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function fetchUserStats(): Promise<UserStatsType> {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayOfWeek = new Date(now);
  firstDayOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)

  // Get monthly active users (current month)
  const { count: activeMonthly, error: monthlyError } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', firstDayOfMonth.toISOString());

  if (monthlyError) throw monthlyError;

  // Get weekly active users (current week)
  const { count: activeWeekly, error: weeklyError } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', firstDayOfWeek.toISOString());

  if (weeklyError) throw weeklyError;

  // Get new users with conversations in the current month
  const { data: activeUserIds } = await supabase
    .from('conversations')
    .select('user_id')
    .gte('created_at', firstDayOfMonth.toISOString());

  const uniqueUserIds = [...new Set(activeUserIds?.map(conv => conv.user_id) || [])];

  const { count: newUsers, error: newUsersError } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', firstDayOfMonth.toISOString())
    .in('id', uniqueUserIds);

  if (newUsersError) throw newUsersError;

  return {
    activeMonthly: activeMonthly || 0,
    activeWeekly: activeWeekly || 0,
    newUsers: newUsers || 0,
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