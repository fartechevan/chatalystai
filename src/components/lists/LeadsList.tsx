
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, MoreHorizontal } from "lucide-react";
import { Card } from "@/components/ui/card";

interface LeadStatus {
  title: string;
  count: number;
  value: number;
  color: string;
}

const statuses: LeadStatus[] = [
  { title: "INITIAL CONTACT", count: 0, value: 0, color: "border-blue-500" },
  { title: "OFFER MADE", count: 0, value: 0, color: "border-yellow-500" },
  { title: "NEGOTIATION", count: 0, value: 0, color: "border-orange-500" },
];

export function LeadsList() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-sm">
            Active leads
          </div>
          <Input 
            placeholder="Search and filter" 
            className="w-[200px] h-8 text-sm" 
          />
          <span className="text-sm text-muted-foreground">
            0 leads: 0 RM
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          <Button size="sm" className="h-8">
            <Plus className="h-4 w-4 mr-2" />
            NEW LEAD
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-4">
        <div className="grid grid-cols-3 gap-4 h-full">
          {statuses.map((status) => (
            <div key={status.title} className="flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium">{status.title}</div>
                <div className="text-sm text-muted-foreground">
                  {status.count} leads: {status.value} RM
                </div>
              </div>
              <Card className={`flex-1 border-t-2 ${status.color} bg-muted/5`}>
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Quick add
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
