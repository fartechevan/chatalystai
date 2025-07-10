"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Trash2, ExternalLink, FileText, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client"; // For public URL generation

// Define the Document type (can be imported from a shared types file later)
export interface Document {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  file_type: string;
  file_path: string | null; // file_path can be null
}

export type DocumentColumnActionsProps = {
  document: Document;
  onDelete: (id: string) => void;
  onViewOriginal: (document: Document) => void;
  onSelectDocument: (id: string) => void; // Added for row click
};

const DocumentTableActions: React.FC<DocumentColumnActionsProps> = ({
  document,
  onDelete,
  onViewOriginal,
}) => {
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
        {document.file_type === 'pdf' && document.file_path && (
          <DropdownMenuItem onClick={() => window.open(document.file_path, '_blank')}>
            <ExternalLink className="mr-2 h-4 w-4" />
            View Original
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => {
            onDelete(document.id)
            console.log(document.title);
        }} className="text-red-600 hover:!text-red-700">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const getDocumentColumns = (actions: Omit<DocumentColumnActionsProps, 'document'>): ColumnDef<Document>[] => [
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
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
        onClick={(e) => e.stopPropagation()} // Prevent row click when clicking checkbox
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "title",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const doc = row.original;
      return (
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => actions.onSelectDocument(doc.id)}>
          {doc.file_type === 'pdf' ? (
            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
          ) : (
            <File className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
          <span className="font-medium truncate">{doc.title}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "file_type",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Type
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const fileType = row.getValue("file_type") as string;
      return fileType ? <Badge variant="outline" className="text-xs">{fileType.toUpperCase()}</Badge> : null;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "updated_at",
    header: "Updated At",
    cell: ({ row }) => {
      const updatedAt = row.getValue("updated_at") as string;
      return <div className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <DocumentTableActions document={row.original} {...actions} />,
  },
];
