import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatsCards } from "./stats/StatsCards";
import { UserTable } from "./stats/UserTable";
import { useUserStats } from "./stats/useUserStats";

export function UserStats() {
  const [searchEmail, setSearchEmail] = useState("");
  const [showNewUsersDialog, setShowNewUsersDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterByMonth, setFilterByMonth] = useState(false);

  const { data, isLoading } = useUserStats(searchEmail, currentPage, filterByMonth);

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
        <div>Loading stats...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <StatsCards
        activeMonthly={data?.activeMonthly || 0}
        activeWeekly={data?.activeWeekly || 0}
        totalUsers={data?.newUsers || 0}
        onTotalUsersClick={() => setShowNewUsersDialog(true)}
      />

      <Dialog open={showNewUsersDialog} onOpenChange={setShowNewUsersDialog}>
        <DialogContent className="max-w-full h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>User List</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6">
            <UserTable
              users={data?.newUserDetails || []}
              totalPages={data?.totalPages || 1}
              currentPage={currentPage}
              searchEmail={searchEmail}
              filterByMonth={filterByMonth}
              onSearchChange={handleSearch}
              onFilterChange={setFilterByMonth}
              onPageChange={handlePageChange}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}