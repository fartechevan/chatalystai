"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Segment } from "@/types/segments";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
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

export const columns: ColumnDef<Segment>[] = [
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
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
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
    cell: ({ row }) => {
      const name = row.getValue("name") as string;
      return <div className="font-medium">{name}</div>;
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const description = row.getValue("description") as string;
      return <div>{description || "N/A"}</div>;
    },
  },
  {
    accessorKey: "member_count",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Members
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const memberCount = row.getValue("member_count") as number;
      return <div className="text-center">{memberCount === undefined || memberCount === null ? "N/A" : memberCount}</div>;
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created At
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const createdAt = row.getValue("created_at") as string;
      return <div>{new Date(createdAt).toLocaleDateString()}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => { // Add table to access meta
      const segment = row.original;
      // Type assertion for meta, assuming it's correctly passed from SegmentsDataTable
      const meta = table.options.meta as import('@/components/segments/list/SegmentsDataTable').SegmentsTableMeta;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0" disabled={meta?.isProcessing}>
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(segment.id)}
              disabled={meta?.isProcessing}
            >
              Copy Segment ID
            </DropdownMenuItem>
            {meta?.handleViewSegment && ( // Conditionally render if handler exists
              <DropdownMenuItem 
                onClick={() => meta.handleViewSegment?.(segment)}
                disabled={meta?.isProcessing}
              >
                View Details
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => meta?.handleOpenEditModal(segment)}
              disabled={meta?.isProcessing}
            >
              Edit Segment
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
              onClick={() => meta?.handleDeleteSegment(segment.id)}
              disabled={meta?.isProcessing}
            >
              Delete Segment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];
