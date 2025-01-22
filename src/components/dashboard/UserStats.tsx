import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserStats as UserStatsType } from "@/types/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function fetchUserStats(): Promise<UserStatsType> {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // Months are 0-indexed

  // Format months as two digits
  const startMonth = `${currentYear}-${currentMonth.toString().padStart(2, "0")}`;
  const nextMonth = new Date(currentYear, currentMonth, 1) // Handles year transitions
    .toISOString()
    .slice(0, 7); // YYYY-MM format

  // Fetch monthly active users
  const { data: monthlyData, error: monthlyError } = await supabase
    .from("conversations")
    .select("user_id")
    .gte("created_at", startMonth)
    .lt("created_at", nextMonth);

  if (monthlyError) throw new Error(`Error fetching monthly data: ${monthlyError.message}`);

  // Fetch weekly active users
const now = new Date();
const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()); // Start of current week (Sunday)
const startOfWeekStr = startOfWeek.toISOString().split("T")[0]; // YYYY-MM-DD format

console.log("Start of Week:", startOfWeekStr); // Debugging



  const { data: weeklyData, error: weeklyError } = await supabase
    .from("conversations")
    .select("user_id")
    .gte("created_at", startOfWeekStr)
    .lt("created_at", new Date().toISOString().split("T")[0]);

  if (weeklyError) throw new Error(`Error fetching weekly data: ${weeklyError.message}`);

  // Fetch new users in the current month
  const { data: newUsersData, error: newUsersError } = await supabase
    .from("profiles")
    .select("id")
    .gte("created_at", `${startMonth}-01`)
    .lt("created_at", `${nextMonth}-01`);

  if (newUsersError) throw new Error(`Error fetching new users: ${newUsersError.message}`);

  // Extract unique user IDs
  const uniqueMonthlyUsers = new Set(monthlyData?.map((conv) => conv.user_id));
  const uniqueWeeklyUsers = new Set(weeklyData?.map((conv) => conv.user_id));

  return {
    activeMonthly: uniqueMonthlyUsers.size,
    activeWeekly: uniqueWeeklyUsers.size,
    newUsers: newUsersData?.length || 0,
  };
}

export function UserStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["userStats"],
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
