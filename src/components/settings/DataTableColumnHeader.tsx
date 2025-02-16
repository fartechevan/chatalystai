
import { Column } from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => column.toggleSorting()}
    >
      {title}
      {{
        asc: <ArrowUpIcon className="ml-2 h-4 w-4" />,
        desc: <ArrowDownIcon className="ml-2 h-4 w-4" />,
      }[column.getIsSorted() as string] ?? (
        <ChevronsUpDown className="ml-2 h-4 w-4" />
      )}
    </Button>
  );
}
