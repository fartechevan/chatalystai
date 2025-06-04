"use client";

import * as React from "react";
import {
  // ColumnDef, // Removed from here to avoid duplicate
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  // useReactTable, // Will be managed by the parent component
  Table as ShadcnTable, // Renamed to avoid conflict if we pass 'table' prop
} from "@tanstack/react-table";

import {
  Table, // This is now referring to the UI component
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination"; 
// Assuming a generic DataTableToolbar exists or we create a specific one.
// For now, let's assume a generic one or skip it if not essential for basic display.
// import { DataTableToolbar } from "@/components/ui/data-table-toolbar"; 
// import { Input } from "@/components/ui/input"; // For filtering - Will be moved to header
// import { DataTableViewOptions } from "@/components/ui/data-table-view-options"; // For column visibility - Will be moved to header
import { type Table as ReactTableType, type ColumnDef } from "@tanstack/react-table"; // Import Table type and ColumnDef for props

interface ContactsDataTableProps<TData, TValue> { // Added TValue back
  columns: ColumnDef<TData, TValue>[]; 
  table: ReactTableType<TData>; // Pass the table instance as a prop
}

export function ContactsDataTable<TData, TValue>({ // Added TValue back
  columns, // columns is still needed for colSpan in "No results"
  table,
}: ContactsDataTableProps<TData, TValue>) {
  // const [rowSelection, setRowSelection] = React.useState({}); // Managed by parent
  // const [columnVisibility, setColumnVisibility] =
  //   React.useState<VisibilityState>({}); // Managed by parent
  // const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
  //   []
  // ); // Managed by parent
  // const [sorting, setSorting] = React.useState<SortingState>([]); // Managed by parent

  // const table = useReactTable({ // table instance is now passed as a prop
  //   data,
  //   columns,
  //   state: {
  //     sorting,
  //     columnVisibility,
  //     rowSelection,
  //     columnFilters,
  //   },
  //   enableRowSelection: true,
  //   onRowSelectionChange: setRowSelection,
  //   onSortingChange: setSorting,
  //   onColumnFiltersChange: setColumnFilters,
  //   onColumnVisibilityChange: setColumnVisibility,
  //   getCoreRowModel: getCoreRowModel(),
  //   getFilteredRowModel: getFilteredRowModel(),
  //   getPaginationRowModel: getPaginationRowModel(),
  //   getSortedRowModel: getSortedRowModel(),
  // });

  return (
    <div className="space-y-4">
      {/* Toolbar removed from here, will be in the header */}
      {/* <div className="flex items-center justify-between">
        <Input
          placeholder="Filter by name..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <DataTableViewOptions table={table} />
      </div> */}
      {/* <DataTableToolbar table={table} /> */}
      <div className="rounded-md border">
        <Table> {/* This refers to the UI component Table */}
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
      <DataTablePagination table={table} />
    </div>
  );
}
