import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

type UserStatsType = {
  activeMonthly: number;
  activeWeekly: number;
  newUsers: number;
};

async function fetchUserStats(): Promise<UserStatsType> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Calculate the start and end dates for the current week
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (6 - today.getDay()));

  // Get weekly active users - using DISTINCT
  const { data: weeklyData, error: weeklyError } = await supabase
    .from("conversations")
    .select("user_id")
    .gte("created_at", startOfWeek.toISOString())
    .lt("created_at", endOfWeek.toISOString());

  if (weeklyError) throw weeklyError;
  
  const uniqueWeeklyUsers = new Set(weeklyData?.map(row => row.user_id));
  console.log("Weekly Active Users:", uniqueWeeklyUsers.size);

  // Get monthly active users - using DISTINCT
  const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const endOfMonth = new Date(currentYear, currentMonth, 0);

  const { data: monthlyData, error: monthlyError } = await supabase
    .from("conversations")
    .select("user_id")
    .gte("created_at", startOfMonth.toISOString())
    .lte("created_at", endOfMonth.toISOString());

  if (monthlyError) throw monthlyError;

  const uniqueMonthlyUsers = new Set(monthlyData?.map(row => row.user_id));
  console.log("Monthly Active Users:", uniqueMonthlyUsers.size);

  // Get new users in current month
  const { data: newUsers, error: newUsersError } = await supabase
    .from("profiles")
    .select("id, created_at")
    .gte("created_at", startOfMonth.toISOString())
    .lte("created_at", endOfMonth.toISOString());

  if (newUsersError) throw newUsersError;
  
  console.log("New Users this month:", newUsers?.map(user => ({
    id: user.id,
    created_at: user.created_at
  })));

  return {
    activeMonthly: uniqueMonthlyUsers.size,
    activeWeekly: uniqueWeeklyUsers.size,
    newUsers: newUsers?.length || 0,
  };
}

export function UserStats() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["userStats"],
    queryFn: fetchUserStats,
  });

  if (isLoading) {
    return <div>Loading stats...</div>;
  }

  if (error) {
    return <div>Error loading stats: {(error as Error).message}</div>;
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