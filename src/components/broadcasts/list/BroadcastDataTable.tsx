"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
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
import { BroadcastTableToolbar } from "./BroadcastTableToolbar"; // Corrected path

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  // Add props for server-side pagination, if needed
  pageCount?: number; // Total number of pages
  pageIndex?: number; // Current page index (0-based)
  pageSize?: number; // Number of rows per page
  onPageChange?: (pageIndex: number) => void; // Handler for page change
  onPageSizeChange?: (pageSize: number) => void; // Handler for page size change
  totalItems?: number; // Total number of items for display
}

export function BroadcastDataTable<TData, TValue>({
  columns,
  data,
  pageCount: controlledPageCount,
  pageIndex: controlledPageIndex,
  pageSize: controlledPageSize,
  onPageChange,
  onPageSizeChange,
  totalItems,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      ...(controlledPageIndex !== undefined && controlledPageSize !== undefined && {
        pagination: {
          pageIndex: controlledPageIndex,
          pageSize: controlledPageSize,
        },
      })
    },
    pageCount: controlledPageCount ?? -1, // -1 if pagination is fully client-side or unknown
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: controlledPageCount !== undefined, // True if server-side pagination
    manualFiltering: true, // Assuming server-side filtering or controlled filtering
    manualSorting: true, // Assuming server-side sorting or controlled sorting
    onPaginationChange: controlledPageCount !== undefined && onPageChange && onPageSizeChange ? (updater) => {
        if (typeof updater === 'function') {
          const newPaginationState = updater({ pageIndex: controlledPageIndex!, pageSize: controlledPageSize! });
          onPageChange(newPaginationState.pageIndex);
          onPageSizeChange(newPaginationState.pageSize);
        } else {
          onPageChange(updater.pageIndex);
          onPageSizeChange(updater.pageSize);
        }
    } : undefined,
  });

  return (
    <div className="space-y-4">
      <BroadcastTableToolbar table={table} />
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
                  colSpan={columns.length}
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
