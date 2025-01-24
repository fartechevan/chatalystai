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

async function fetchUserStats(searchEmail?: string, page: number = 1, filterByMonth: boolean = false): Promise<UserStatsType> {
  const itemsPerPage = 10;
  const startIndex = (page - 1) * itemsPerPage;

  // Get total user count
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' });

  // Fetch monthly active users
  const { data: monthlyUsers, error } = await supabase
    .from('conversations')
    .select('user_id, created_at')
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
    .lte('created_at', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString());

  const uniqueUserIds = new Set(monthlyUsers?.map(user => user.user_id) || []);
  const uniqueUserCount = uniqueUserIds.size;

  // Fetch weekly active users
  const { data: weeklyUsers } = await supabase
    .from('conversations')
    .select('user_id, created_at')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  // Fetch users based on search criteria
  let query = supabase
    .from('profiles')
    .select('id, created_at, email, name', { count: 'exact' });

  if (searchEmail) {
    query = query.ilike('email', `%${searchEmail}%`);
  }
  
  if (filterByMonth) {
    query = query.gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
  }

  // Add pagination
  const { data: newUsers, count } = await query
    .range(startIndex, startIndex + itemsPerPage - 1);

  // Calculate unique users
  const uniqueWeeklyUsers = new Set(weeklyUsers?.map(user => user.user_id) || []);

  const totalPages = count ? Math.ceil(count / itemsPerPage) : 1;

  return {
    activeMonthly: uniqueUserCount,
    activeWeekly: uniqueWeeklyUsers.size,
    newUsers: totalUsers || 0,
    newUserDetails: newUsers || [],
    totalPages,
  };
}

export function useUserStats(searchEmail: string, currentPage: number, filterByMonth: boolean) {
  return useQuery({
    queryKey: ['userStats', searchEmail, currentPage, filterByMonth],
    queryFn: () => fetchUserStats(searchEmail, currentPage, filterByMonth),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}