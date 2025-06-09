"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Copy, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Broadcast } from "../BroadcastListView"; // Assuming Broadcast type is exported from there
import { format } from 'date-fns';

// Define available statuses and their visual representation
export const statuses = [
  { value: "draft", label: "Draft", color: "bg-gray-400" },
  { value: "scheduled", label: "Scheduled", color: "bg-blue-500" },
  { value: "sent", label: "Sent", color: "bg-green-500" },
  { value: "failed", label: "Failed", color: "bg-red-500" },
  { value: "cancelled", label: "Cancelled", color: "bg-yellow-500" },
];


export type BroadcastColumnActionsProps = {
  broadcast: Broadcast;
  onViewDetails: (id: string) => void;
  onDuplicate: (message: string) => void;
  // Add other actions like onEdit, onDelete if needed
};

const BroadcastTableActions: React.FC<BroadcastColumnActionsProps> = ({
  broadcast,
  onViewDetails,
  onDuplicate,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onViewDetails(broadcast.id)}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDuplicate(broadcast.message_text)}>
          <Copy className="mr-2 h-4 w-4" />
          Duplicate
        </DropdownMenuItem>
        {/* Add more actions here */}
        {/* <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600 hover:!text-red-700">
          Delete
        </DropdownMenuItem> */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const getBroadcastColumns = (actions: Omit<BroadcastColumnActionsProps, 'broadcast'>): ColumnDef<Broadcast>[] => [
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
    accessorKey: "message_text",
    header: "Message Preview",
    cell: ({ row }) => {
      const message = row.getValue("message_text") as string;
      return <div className="truncate max-w-xs">{message}</div>;
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Status
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const statusValue = row.getValue("status") as string;
      const statusInfo = statuses.find(s => s.value === statusValue) || { label: statusValue, color: "bg-gray-200 text-gray-800" };
      return <Badge className={`${statusInfo.color} text-white hover:${statusInfo.color}`}>{statusInfo.label}</Badge>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "recipient_count",
    header: "Recipients",
    cell: ({ row }) => row.getValue("recipient_count") ?? 0,
  },
  {
    accessorKey: "scheduled_at",
    header: "Scheduled At",
    cell: ({ row }) => {
      const scheduledAt = row.getValue("scheduled_at") as string | null;
      return scheduledAt ? format(new Date(scheduledAt), "PPpp") : <span className="text-muted-foreground">Not scheduled</span>;
    },
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }) => format(new Date(row.getValue("created_at")), "PPpp"),
  },
  {
    id: "actions",
    cell: ({ row }) => <BroadcastTableActions broadcast={row.original} {...actions} />,
  },
];
