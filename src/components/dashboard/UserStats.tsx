import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { useState } from "react";

type UserStatsType = {
  activeMonthly: number;
  activeWeekly: number;
  newUsers: number;
  newUserDetails: Array<{
    id: string;
    created_at: string;
    email: string;
  }>;
};

async function fetchUserStats(searchEmail?: string): Promise<UserStatsType> {
  // Fetch monthly active users
  const { data: monthlyUsers } = await supabase
    .from('conversations')
    .select('user_id, created_at')
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

  // Fetch weekly active users
  const { data: weeklyUsers } = await supabase
    .from('conversations')
    .select('user_id, created_at')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  // Fetch users based on search criteria
  let query = supabase
    .from('profiles')
    .select('id, created_at, email')
    .order('created_at', { ascending: false });

  if (searchEmail) {
    query = query.ilike('email', `%${searchEmail}%`);
  } else {
    // If no search, show only this month's users
    query = query.gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
  }

  const { data: newUsers } = await query;

  console.log('Users found:', newUsers);

  // Calculate unique users
  const uniqueMonthlyUsers = new Set(monthlyUsers?.map(user => user.user_id) || []);
  const uniqueWeeklyUsers = new Set(weeklyUsers?.map(user => user.user_id) || []);

  return {
    activeMonthly: uniqueMonthlyUsers.size,
    activeWeekly: uniqueWeeklyUsers.size,
    newUsers: newUsers?.length || 0,
    newUserDetails: newUsers || [],
  };
}

export function UserStats() {
  const [searchEmail, setSearchEmail] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['userStats', searchEmail],
    queryFn: () => fetchUserStats(searchEmail),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchEmail(e.target.value);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent>Loading stats...</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
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

      {data?.newUserDetails && (
        <Card>
          <CardHeader>
            <CardTitle>User Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input
                type="email"
                placeholder="Search by email..."
                value={searchEmail}
                onChange={handleSearch}
                className="max-w-sm"
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.newUserDetails.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono">{user.id}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {format(new Date(user.created_at), "PPpp")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}