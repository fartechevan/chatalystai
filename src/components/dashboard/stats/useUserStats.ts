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

  console.log('Total users:', totalUsers);


    // Fetch monthly active users

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

  const { data: monthlyUsers, error: monthlyError } = await supabase
  .from('conversations')
  .select('user_id, created_at')
  .gte('created_at', startOfMonth.toISOString()) // Ensure UTC
  .lte('created_at', endOfMonth.toISOString()); // Ensure UTC


  console.log('Monthly users data:', monthlyUsers);
  console.log('Monthly users error:', monthlyError);

  const uniqueUserIds = new Set(monthlyUsers?.map(user => user.user_id) || []);
  const uniqueUserCount = uniqueUserIds.size;

  console.log('Unique monthly users:', uniqueUserCount);

  // Fetch weekly active users
  const { data: weeklyUsers, error: weeklyError } = await supabase
    .from('conversations')
    .select('user_id, created_at')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  console.log('Weekly users data:', weeklyUsers);
  console.log('Weekly users error:', weeklyError);

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
  console.log('Unique weekly users:', uniqueWeeklyUsers.size);

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