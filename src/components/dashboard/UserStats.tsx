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
  const currentMonth = now.getMonth() + 1; // Months are 0-indexed in JavaScript

  // Calculate the start and end dates for the current week
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (6 - today.getDay())); // End of current week (Saturday)

  // Get weekly active users
  const { count: weeklyCount, error: weeklyError } = await supabase
    .from("conversations")
    .select("user_id", { count: "exact", head: true }) // Distinct count from Supabase
    .gte("created_at", startOfWeek.toISOString())
    .lt("created_at", endOfWeek.toISOString());

  if (weeklyError) throw weeklyError;

  // Get monthly active users - using first day of current month to last day
  const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const endOfMonth = new Date(currentYear, currentMonth, 0); // Last day of current month

  const { count: monthlyCount, error: monthlyError } = await supabase
    .from("conversations")
    .select("user_id", { count: "exact", head: true }) // Distinct count from Supabase
    .gte("created_at", startOfMonth.toISOString())
    .lte("created_at", endOfMonth.toISOString());

  if (monthlyError) throw monthlyError;

  // Get new users in current month
  const { count: newUsersCount, error: newUsersError } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true }) // Distinct count from Supabase
    .gte("created_at", startOfMonth.toISOString())
    .lte("created_at", endOfMonth.toISOString());

  if (newUsersError) throw newUsersError;

  return {
    activeMonthly: monthlyCount || 0,
    activeWeekly: weeklyCount || 0,
    newUsers: newUsersCount || 0,
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
