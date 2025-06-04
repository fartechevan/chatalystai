import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type UserTableProps = {
  users: Array<{
    id: string;
    created_at: string;
    email: string;
    name: string | null;
  }>;
  totalPages: number;
  currentPage: number;
  searchEmail: string;
  filterByMonth: boolean;
  isLoading: boolean;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFilterChange: (checked: boolean) => void;
  onPageChange: (page: number) => void;
};

export function UserTable({
  users,
  totalPages,
  currentPage,
  searchEmail,
  filterByMonth,
  isLoading,
  onSearchChange,
  onFilterChange,
  onPageChange,
}: UserTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          type="email"
          placeholder="Search by email..."
          value={searchEmail}
          onChange={onSearchChange}
          className="max-w-sm"
        />
        <div className="flex items-center space-x-2">
          <Switch
            id="filter-month"
            checked={filterByMonth}
            onCheckedChange={onFilterChange}
          />
          <Label htmlFor="filter-month">Show only this month</Label>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden"> {/* Added container for consistent styling */}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/50"> {/* Added subtle bg to header row */}
              <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</TableHead>
              <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Email</TableHead>
              <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Joined Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center p-4 align-middle"> {/* Standardized empty/loading cell */}
                  Loading...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center p-4 align-middle"> {/* Standardized empty/loading cell */}
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/50"> {/* Added hover state */}
                  <TableCell className="p-4 align-middle">{user.name || 'N/A'}</TableCell>
                  <TableCell className="p-4 align-middle">{user.email}</TableCell>
                  <TableCell className="p-4 align-middle text-muted-foreground"> {/* Standardized text color */}
                    {format(new Date(user.created_at), "PPpp")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => onPageChange(currentPage - 1)}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => onPageChange(page)}
                    isActive={currentPage === page}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => onPageChange(currentPage + 1)}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
