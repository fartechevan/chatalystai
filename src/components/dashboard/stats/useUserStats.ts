import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

type UserStatsType = {
  activeMonthly: number;
  activeWeekly: number;
  newUsers: number;
  newUserDetails: Array<{
    id: string;
    created_at: string;
    email: string;
    name: string | null;
  }>;
  totalPages: number;
};

async function fetchUserStats(
  searchEmail?: string,
  page: number = 1,
  filterByMonth: boolean = false
): Promise<UserStatsType> {
  const itemsPerPage = 10;
  const startIndex = (page - 1) * itemsPerPage;

  // Get total user count
  const { count: totalUsers, error: totalUsersError } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  if (totalUsersError) {
    console.error("Error fetching total users:", totalUsersError);
    throw totalUsersError;
  }

  console.log("Total users:", totalUsers);

  // Fetch monthly active users
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

  const { data: monthlyUsers, error: monthlyError } = await supabase
    .from("conversations")
    .select("user_id, created_at");

  if (monthlyError) {
    console.error("Error fetching monthly users:", monthlyError);
    throw monthlyError;
  }

  console.log("Monthly users data:", monthlyUsers);

  const uniqueMonthlyUserIds = new Set(monthlyUsers?.map((user) => user.user_id).filter(Boolean) || []);
  const uniqueMonthlyUserCount = uniqueMonthlyUserIds.size;

  console.log("Unique monthly users:", uniqueMonthlyUserCount);

  // Fetch weekly active users
  const startOfWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const { data: weeklyUsers, error: weeklyError } = await supabase
    .from("conversations")
    .select("user_id, created_at")
    .gte("created_at", startOfWeek.toISOString());

  if (weeklyError) {
    console.error("Error fetching weekly users:", weeklyError);
    throw weeklyError;
  }

  console.log("Weekly users data:", weeklyUsers);

  const uniqueWeeklyUserIds = new Set(weeklyUsers?.map((user) => user.user_id).filter(Boolean) || []);
  const uniqueWeeklyUserCount = uniqueWeeklyUserIds.size;

  console.log("Unique weekly users:", uniqueWeeklyUserCount);

  // Fetch users based on search criteria
  let query = supabase
    .from("profiles")
    .select("id, created_at, email, name", { count: "exact" });

  if (searchEmail) {
    query = query.ilike("email", `%${searchEmail}%`);
  }

  if (filterByMonth) {
    query = query.gte("created_at", startOfMonth.toISOString());
  }

  // Add pagination
  const { data: newUsers, count, error: newUsersError } = await query
    .range(startIndex, startIndex + itemsPerPage - 1);

  if (newUsersError) {
    console.error("Error fetching new users:", newUsersError);
    throw newUsersError;
  }

  const totalPages = count ? Math.ceil(count / itemsPerPage) : 1;

  return {
    activeMonthly: uniqueMonthlyUserCount,
    activeWeekly: uniqueWeeklyUserCount,
    newUsers: totalUsers || 0,
    newUserDetails: newUsers || [],
    totalPages,
  };
}

export function useUserStats(searchEmail: string, currentPage: number, filterByMonth: boolean) {
  return useQuery({
    queryKey: ["userStats", searchEmail, currentPage, filterByMonth],
    queryFn: () => fetchUserStats(searchEmail, currentPage, filterByMonth),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}