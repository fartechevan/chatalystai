
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal, Plus } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem 
} from "@/components/ui/dropdown-menu";

export function LeadsList() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">LEADS</h2>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
            Full list
          </Button>
          <Input 
            placeholder="Search and filter" 
            className="w-[200px] h-7 text-sm" 
          />
          <span className="text-sm text-muted-foreground">
            0 leads
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          <Button size="sm" className="h-8">
            <Plus className="h-4 w-4 mr-2" />
            ADD LEAD
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <table className="w-full">
            <thead className="sticky top-0 bg-background border-b">
              <tr>
                <th className="w-12 p-3">
                  <Checkbox />
                </th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                  NAME
                </th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                  COMPANY
                </th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                  STATUS
                </th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                  PHONE
                </th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                  EMAIL
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-center text-muted-foreground">
                <td colSpan={6} className="py-8">
                  No leads found
                </td>
              </tr>
            </tbody>
          </table>
        </ScrollArea>
      </div>
    </div>
  );
}
