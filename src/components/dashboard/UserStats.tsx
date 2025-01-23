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
  const currentMonth = now.getMonth(); // Months are 0-indexed in JavaScript

  // Calculate the start and end dates for the current week
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (6 - today.getDay())); // End of current week (Saturday)

  // Get weekly active users
  const { data: weeklyData, error: weeklyError } = await supabase
    .from("conversations")
    .select("user_id")
    .gte("created_at", startOfWeek.toISOString())
    .lt("created_at", endOfWeek.toISOString());

  if (weeklyError) throw new Error(`Error fetching weekly users: ${weeklyError.message}`);

  // Calculate the start and end dates for the current month
  const startOfMonth = new Date(currentYear, currentMonth, 1); // Start of the current month
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0); // Last day of the current month

  // Fetch distinct monthly active users count
  const { count: monthlyCount, error: monthlyError } = await supabase
    .from("conversations")
    .select("user_id", { count: "exact", head: true }) // Only count distinct users
    .gte("created_at", startOfMonth.toISOString())
    .lte("created_at", endOfMonth.toISOString());

  if (monthlyError) throw new Error(`Error fetching monthly users: ${monthlyError.message}`);

  // Fetch new users created in the current month
  const { count: newUsersCount, error: newUsersError } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true }) // Count new users
    .gte("created_at", startOfMonth.toISOString())
    .lte("created_at", endOfMonth.toISOString());

  if (newUsersError) throw new Error(`Error fetching new users: ${newUsersError.message}`);

  // Extract unique users from the weekly data
  const uniqueWeeklyUsers = new Set(weeklyData?.map((conv) => conv.user_id));

  return {
    activeMonthly: monthlyCount || 0,
    activeWeekly: uniqueWeeklyUsers.size,
    newUsers: newUsersCount || 0,
  };
}

export function UserStats() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["userStats"],
    queryFn: fetchUserStats,
    refetchOnWindowFocus: false,
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
