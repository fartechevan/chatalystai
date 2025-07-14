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
import { Checkbox } from "@/components/ui/checkbox"; // If row selection is needed

// This type is based on the Customer type in ContactsPage.tsx
// Ensure it matches the data structure being passed to the DataTable
export type ContactEntry = {
  id: string;
  name: string;
  email: string | null;
  phone_number: string;
  company_name: string | null;
  // Add any other fields from 'customers' table you might use, even if not directly in columns
};

// Define the type for the onDeleteContact function
type OnDeleteContactHandler = (id: string) => Promise<void>;
// Define the type for the onEditContact function
type OnEditContactHandler = (contact: ContactEntry) => void;
// Define the type for the onViewContact function
type OnViewContactHandler = (contact: ContactEntry) => void;

export const getColumns = (
  onDeleteContact: OnDeleteContactHandler,
  onEditContact: OnEditContactHandler,
  onViewContact: OnViewContactHandler // Add onViewContact parameter
): ColumnDef<ContactEntry>[] => [
  // If row selection is needed:
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
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
    cell: ({ row }) => <div className="capitalize">{row.getValue("name")}</div>,
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
    cell: ({ row }) => <div className="lowercase">{row.getValue("email") || "N/A"}</div>,
  },
  {
    accessorKey: "phone_number",
    header: "Phone Number",
    cell: ({ row }) => <div>{row.getValue("phone_number")}</div>,
  },
  {
    accessorKey: "company_name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Company
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div>{row.getValue("company_name") || "N/A"}</div>,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const contact = row.original;

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
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(contact.id)}
            >
              Copy contact ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onViewContact(contact)}>
              View contact
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEditContact(contact)}>
              Edit contact
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600 hover:text-red-700 focus:text-red-700"
              onClick={() => onDeleteContact(contact.id)}
            >
              Delete contact
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
