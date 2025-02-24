
import { Search, Plus, MoreHorizontal, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LeadsHeader() {
  return (
    <div className="border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="sm">
            Active leads
          </Button>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search leads..." 
              className="w-[300px] pl-8" 
            />
          </div>
          <span className="text-sm text-muted-foreground">
            0 leads: 0 RM
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          <Button variant="outline">
            <Zap className="h-4 w-4 mr-2" />
            Automate
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Lead
          </Button>
        </div>
      </div>
    </div>
  );
}
