"use client";

import React from 'react';
import { Cross2Icon } from "@radix-ui/react-icons";
import { Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options"; // Assuming this exists or will be created

// We'll need a faceted filter component, similar to the one in shadcn/ui examples
import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter"; // Assuming this exists or will be created
import { statuses } from "./columns"; // Import statuses from columns.tsx

interface BroadcastTableToolbarProps<TData> {
  table: Table<TData>;
  // Add specific filter state and setters if not managed by the table instance directly
  // For example:
  // searchTerm: string;
  // onSearchTermChange: (value: string) => void;
  // statusFilter: string[];
  // onStatusFilterChange: (selected: string[]) => void;
}

export function BroadcastTableToolbar<TData>({
  table,
}: BroadcastTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  // Example: If you manage search outside table's global filter
  // const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   onSearchTermChange(event.target.value);
  // };

  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Filter broadcasts..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""} // Example: filtering by name column
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value) // Or use a global filter
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {table.getColumn("status") && (
          <DataTableFacetedFilter
            column={table.getColumn("status")}
            title="Status"
            options={statuses.map(status => ({ label: status.label, value: status.value }))}
          />
        )}
        {/* Add more faceted filters if needed, e.g., for priority or other categories */}
        {/* {table.getColumn("priority") && (
          <DataTableFacetedFilter
            column={table.getColumn("priority")}
            title="Priority"
            options={priorities} // Assuming priorities is defined elsewhere
          />
        )} */}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  );
}
