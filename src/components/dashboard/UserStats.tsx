async function fetchUserStats(): Promise<UserStatsType> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed (January = 0)

  // Start of the current month
  const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString(); // Start of current month
  // Start of the next month
  const startOfNextMonth = new Date(currentYear, currentMonth + 1, 1).toISOString(); // Start of next month

  console.log("Start of Month:", startOfMonth); // Debugging
  console.log("Start of Next Month:", startOfNextMonth); // Debugging

  // Fetch monthly active users
  const { data: monthlyData, error: monthlyError } = await supabase
    .from("conversations")
    .select("user_id")
    .gte("created_at", startOfMonth)
    .lt("created_at", startOfNextMonth);

  if (monthlyError) throw new Error(`Error fetching monthly data: ${monthlyError.message}`);

  // Fetch new users in the current month
  const { data: newUsersData, error: newUsersError } = await supabase
    .from("profiles")
    .select("id")
    .gte("created_at", startOfMonth)
    .lt("created_at", startOfNextMonth);

  if (newUsersError) throw new Error(`Error fetching new users: ${newUsersError.message}`);

  // Fetch weekly active users
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()); // Start of the current week (Sunday)
  const startOfWeekStr = startOfWeek.toISOString().split("T")[0]; // YYYY-MM-DD

  const { data: weeklyData, error: weeklyError } = await supabase
    .from("conversations")
    .select("user_id")
    .gte("created_at", startOfWeekStr)
    .lt("created_at", now.toISOString().split("T")[0]);

  if (weeklyError) throw new Error(`Error fetching weekly data: ${weeklyError.message}`);

  // Extract unique user IDs
  const uniqueMonthlyUsers = new Set(monthlyData?.map((conv) => conv.user_id));
  const uniqueWeeklyUsers = new Set(weeklyData?.map((conv) => conv.user_id));

  return {
    activeMonthly: uniqueMonthlyUsers.size,
    activeWeekly: uniqueWeeklyUsers.size,
    newUsers: newUsersData?.length || 0,
  };
}
