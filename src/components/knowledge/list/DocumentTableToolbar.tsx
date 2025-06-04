"use client";

import { Table } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
// Import DataTableViewOptions if you want to add column toggling
// import { DataTableViewOptions } from "@/components/ui/data-table-view-options"; 

interface DocumentTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DocumentTableToolbar<TData>({
  table,
}: DocumentTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Filter documents by title..."
          value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("title")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {/* Add faceted filters or other toolbar items here if needed */}
      </div>
      {/* <DataTableViewOptions table={table} /> */}
    </div>
  );
}
