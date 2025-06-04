"use client";

import * as React from "react";
import {
  ColumnDef,
  // ColumnFiltersState, // No longer managed here
  // SortingState, // No longer managed here
  // VisibilityState, // No longer managed here
  flexRender,
  // getCoreRowModel, // No longer managed here
  // getFacetedRowModel, // No longer managed here
  // getFacetedUniqueValues, // No longer managed here
  // getFilteredRowModel, // No longer managed here
  // getPaginationRowModel, // No longer managed here
  // getSortedRowModel, // No longer managed here
  // useReactTable, // No longer used here
  type Table as TanstackTable, // Renamed to avoid conflict with HTML Table
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DataTablePagination } from "@/components/ui/data-table-pagination"; // Assuming this exists or will be created
// import { BroadcastTableToolbar } from "./BroadcastTableToolbar"; // Corrected path - No longer imported here

interface DataTableProps<TData, TValue> {
  table: TanstackTable<TData>; // Accept table instance as a prop
  columns: ColumnDef<TData, TValue>[]; // Still need columns for colSpan in empty state
  // data is now part of the table instance
  // pageCount, pageIndex, pageSize, onPageChange, onPageSizeChange are handled by the passed table instance
  totalItems?: number; // Total number of items for display in pagination
}

export function BroadcastDataTable<TData, TValue>({
  table,
  columns, // Keep columns prop for determining colSpan
  totalItems,
}: DataTableProps<TData, TValue>) {
  // All table state and logic (useReactTable, state hooks) are now in BroadcastListView.tsx

  return (
    <div className="space-y-4">
      {/* Toolbar is now rendered in the parent component (BroadcastListView) */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length} // Use columns.length here
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination
        table={table}
        totalItems={totalItems}
        pageSizeOptions={[10, 20, 30, 40, 50]}
      />
    </div>
  );
}
