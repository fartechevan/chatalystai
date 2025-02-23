
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, MoreHorizontal, Zap } from "lucide-react";

const stages = [
  { id: "initial", title: "INITIAL CONTACT", count: 0 },
  { id: "offer", title: "OFFER MADE", count: 0 },
  { id: "negotiation", title: "NEGOTIATION", count: 0 },
];

export function KanbanBoard() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm">
              Active leads
            </Button>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search and filter" 
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
              AUTOMATE
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              NEW LEAD
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-4">
        <div className="grid grid-cols-3 gap-4 h-full">
          {stages.map((stage) => (
            <div key={stage.id} className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">{stage.title}</h3>
                <span className="text-sm text-muted-foreground">
                  {stage.count} leads: 0 RM
                </span>
              </div>
              <Card className="flex-1 p-4 bg-muted/30">
                <div className="h-full flex items-center justify-center border-2 border-dashed rounded-lg p-4">
                  <Button variant="ghost" className="text-sm">
                    Quick add
                  </Button>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
