"use client";

import React from 'react';
import { Table } from "@tanstack/react-table";

import { Input } from "@/components/ui/input";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import { Button } from "@/components/ui/button";
import { TrashIcon } from "@radix-ui/react-icons";

interface BroadcastTableToolbarProps<TData> {
  table: Table<TData>;
  onDeleteSelected: () => void; // Add this prop
}

export function BroadcastTableToolbar<TData>({
  table,
  onDeleteSelected,
}: BroadcastTableToolbarProps<TData>) {
  const numSelected = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Filter broadcasts..."
          value={(table.getColumn("message_text")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("message_text")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {numSelected > 0 && (
          <Button
            variant="destructive"
            onClick={onDeleteSelected}
            className="h-8 px-2 lg:px-3"
          >
            <TrashIcon className="mr-2 h-4 w-4" />
            Delete ({numSelected})
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  );
}
