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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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

  // Fetch monthly active users
  // const { data: monthlyUsers } = await supabase
  //   .from('conversations')
  //   .select('user_id, created_at')
  //   .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    const { data: monthlyUsers, error } = await supabase
  .from('conversations')
  .select('user_id, created_at')
  .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
  .lte('created_at', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString());

  const uniqueUserIds = new Set(monthlyUsers.map(user => user.user_id));
const uniqueUserCount = uniqueUserIds.size;


  // Fetch weekly active users
  const { data: weeklyUsers } = await supabase
    .from('conversations')
    .select('user_id, created_at')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  // Fetch users based on search criteria
  let query = supabase
    .from('profiles')
    .select('id, created_at, email, name', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (searchEmail) {
    query = query.ilike('email', `%${searchEmail}%`);
  }
  
  if (filterByMonth) {
    query = query.gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
  }

  // Add pagination
  const { data: newUsers, count } = await query
    .range(startIndex, startIndex + itemsPerPage - 1);

  console.log('Users found:', newUsers);

  // Calculate unique users
  const uniqueMonthlyUsers = new Set(monthlyUsers?.map(user => user.user_id) || []);
  const uniqueWeeklyUsers = new Set(weeklyUsers?.map(user => user.user_id) || []);

  const totalPages = count ? Math.ceil(count / itemsPerPage) : 1;

  return {
    activeMonthly: 111,
    activeWeekly: 222,
    newUsers: count || 0,
    newUserDetails: newUsers || [],
    totalPages,
  };
}

export function UserStats() {
  const [searchEmail, setSearchEmail] = useState("");
  const [showNewUsersDialog, setShowNewUsersDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterByMonth, setFilterByMonth] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['userStats', searchEmail, currentPage, filterByMonth],
    queryFn: () => fetchUserStats(searchEmail, currentPage, filterByMonth),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchEmail(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
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
        <Card 
          className="cursor-pointer transition-colors hover:bg-accent"
          onClick={() => setShowNewUsersDialog(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.newUsers}</div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showNewUsersDialog} onOpenChange={setShowNewUsersDialog}>
        <DialogContent className="max-w-full h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>User List</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-4 space-y-4">
              <div className="flex items-center justify-between">
                <Input
                  type="email"
                  placeholder="Search by email..."
                  value={searchEmail}
                  onChange={handleSearch}
                  className="max-w-sm"
                />
                <div className="flex items-center space-x-2">
                  <Switch
                    id="filter-month"
                    checked={filterByMonth}
                    onCheckedChange={setFilterByMonth}
                  />
                  <Label htmlFor="filter-month">Show only this month</Label>
                </div>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Joined Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.newUserDetails.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name || 'N/A'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {format(new Date(user.created_at), "PPpp")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {data && data.totalPages > 1 && (
              <div className="mt-4 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => handlePageChange(currentPage - 1)}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => handlePageChange(page)}
                          isActive={currentPage === page}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => handlePageChange(currentPage + 1)}
                        className={currentPage === data.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}