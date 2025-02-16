
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "./DataTableColumnHeader";
import { Badge } from "@/components/ui/badge";

export const columns: ColumnDef<any>[] = [
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
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="NAME" />
    ),
  },
  {
    accessorKey: "group",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="GROUP" />
    ),
    cell: () => "Sales Office",
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="EMAIL" />
    ),
  },
  {
    accessorKey: "user_roles",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ROLE" />
    ),
    cell: ({ row }) => {
      const role = row.original.user_roles?.[0]?.role || 'user';
      return (
        <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "leads",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="LEADS" />
    ),
    cell: () => "0",
  },
  {
    accessorKey: "contacts",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="CONTACTS" />
    ),
    cell: () => "0",
  },
  {
    accessorKey: "companies",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="COMPANIES" />
    ),
    cell: () => "0",
  },
  {
    accessorKey: "todos",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="TO-DOS" />
    ),
    cell: () => "0",
  },
  {
    accessorKey: "statuses",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="STATUSES" />
    ),
    cell: () => "Active",
  },
];
