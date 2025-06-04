"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { CheckedState } from "@radix-ui/react-checkbox"; // Import from Radix
import { Tables } from "@/types/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react"; // For remove user icon

// Define a type for the team member, combining profile and team user info
export type TeamMember = Pick<Tables<"profiles">, "id" | "name" | "email"> & {
  role: Tables<"team_users">["role"];
  // Add any other relevant fields from team_users if needed, e.g., join date
  team_user_id: Tables<"team_users">["id"]; // ID from the team_users table for actions
};

export const columns: ColumnDef<TeamMember>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected()
            ? true
            : table.getIsSomePageRowsSelected()
            ? "indeterminate"
            : false
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="font-medium">{row.getValue("name") || "N/A"}</div>,
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Email
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "role",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Role
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row, table }) => {
      const teamMember = row.original;
      const role = teamMember.role;
      // Type assertion for meta, assuming it's correctly passed from TeamUsersDataTable
      const meta = table.options.meta as {
        handleRoleChange: (teamUserId: string, newRole: Tables<"team_users">["role"]) => Promise<void>;
        handleRemoveUser: (teamUserId: string, userEmail?: string) => Promise<void>;
        isCurrentUserOwner: (teamId: string) => boolean;
        currentUserId?: string;
        teamId: string;
        isLoading: boolean;
      };

      const canEditRole = meta.currentUserId !== teamMember.id && // Cannot edit self directly here (usually)
                          !(role === 'owner' && !meta.isCurrentUserOwner(meta.teamId)); // Non-owners cannot edit owners

      if (canEditRole) {
        return (
          <Select
            value={role}
            onValueChange={(value) => meta.handleRoleChange(teamMember.team_user_id, value as Tables<"team_users">["role"])}
            disabled={meta.isLoading}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {meta.isCurrentUserOwner(meta.teamId) && <SelectItem value="owner">Owner</SelectItem>}
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="member">Member</SelectItem>
            </SelectContent>
          </Select>
        );
      }

      // Fallback to Badge if not editable by current user via Select
      let badgeVariant: "default" | "secondary" | "outline" | "destructive" = "secondary";
      if (role === "owner") badgeVariant = "default";
      if (role === "admin") badgeVariant = "outline";
      return <Badge variant={badgeVariant} className="capitalize">{role}</Badge>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const teamMember = row.original;
      const meta = table.options.meta as {
        handleRemoveUser: (teamUserId: string, userEmail?: string) => Promise<void>;
        isCurrentUserOwner: (teamId: string) => boolean; // Or admin
        isCurrentUserAdmin: (teamId: string) => boolean;
        currentUserId?: string;
        teamId: string;
        isLoading: boolean;
      };
      
      const canRemove = (meta.isCurrentUserOwner(meta.teamId) || meta.isCurrentUserAdmin(meta.teamId)) &&
                        teamMember.id !== meta.currentUserId && // Cannot remove self
                        !(teamMember.role === 'owner' && !meta.isCurrentUserOwner(meta.teamId)); // Non-owners cannot remove owners

      return (
        <div className="flex items-center justify-end"> {/* Align actions to the right */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(teamMember.email || "")}
              >
                Copy email
              </DropdownMenuItem>
              {canRemove && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => meta.handleRemoveUser(teamMember.team_user_id, teamMember.email)}
                    disabled={meta.isLoading}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove from team
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
