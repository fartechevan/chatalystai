
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoreHorizontal, PlusCircle, Search, FileUp, FileDown } from "lucide-react"; 
import { 
  DropdownMenu,
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export function LeadsHeader() {
  return (
    <div className="flex items-center justify-between space-x-2">
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Search leads..."
          className="w-64"
        />
        <Button variant="outline" size="icon">
          <Search className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex items-center space-x-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <MoreHorizontal className="mr-2 h-4 w-4" />
              Options
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Broadcast
            </DropdownMenuItem>
            <DropdownMenuItem>
              <MoreHorizontal className="mr-2 h-4 w-4" />
              Edit Pipeline
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <FileUp className="mr-2 h-4 w-4" />
              Import Leads
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FileDown className="mr-2 h-4 w-4" />
              Export Leads
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Lead
        </Button>
      </div>
    </div>
  );
}
