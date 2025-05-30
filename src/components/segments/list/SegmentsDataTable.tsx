"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
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
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Input } from "@/components/ui/input"; // Re-add Input
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import { Segment } from "@/types/segments"; 
import { usePageActionContext } from "@/context/PageActionContext"; // Re-add context

// Define a more specific type for the meta object
// These handlers will be defined in SegmentsPage.tsx
export interface SegmentsTableMeta {
  handleViewSegment?: (segment: Segment) => void; // Optional for now
  handleOpenEditModal: (segment: Segment) => void;
  handleDeleteSegment: (segmentId: string) => Promise<void>;
  // Add any other necessary functions or data, e.g. isLoading
  isProcessing?: boolean; 
}

interface SegmentsDataTableProps<TData extends Segment, TValue> { // Constrain TData to Segment
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  meta?: SegmentsTableMeta; // Add meta prop
}

export function SegmentsDataTable<TData extends Segment, TValue>({ // Use constrained TData
  columns,
  data,
  meta, // Destructure meta
}: SegmentsDataTableProps<TData, TValue>) {
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
    meta, // Pass meta to useReactTable
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const { setSecondaryActionNode } = usePageActionContext();

  React.useEffect(() => {
    const filterNode = (
      <Input
        placeholder="Filter by segment name..."
        value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
        onChange={(event) =>
          table.getColumn("name")?.setFilterValue(event.target.value)
        }
        className="max-w-sm h-9" 
      />
    );
    setSecondaryActionNode(filterNode);

    return () => {
      setSecondaryActionNode(null); 
    };
  }, [table, setSecondaryActionNode]);

  return (
    <div className="space-y-4">
      {/* Toolbar now only contains view options, or could be removed if view options also move to header */}
      <div className="flex items-center justify-end py-4"> 
        <DataTableViewOptions table={table} />
      </div>
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
      <DataTablePagination table={table} />
    </div>
  );
}
