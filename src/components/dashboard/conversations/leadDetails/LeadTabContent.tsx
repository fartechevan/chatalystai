
import { Button } from "@/components/ui/button";
import { Check, LinkIcon, Trash2 } from "lucide-react";
import { LeadDetailsInfo } from "./LeadDetailsInfo";
import { Customer, Lead, Profile } from "../types";

interface LeadTabContentProps {
  activeTab: string;
  profiles: Profile[];
  selectedAssignee: string | null;
  onAssigneeChange: (userId: string) => void;
  customer: Customer | null;
  lead: Lead | null;
  isLoading: boolean;
}

export function LeadTabContent({ 
  activeTab, 
  profiles, 
  selectedAssignee, 
  onAssigneeChange, 
  customer, 
  lead, 
  isLoading 
}: LeadTabContentProps) {
  return (
    <>
      {activeTab === "main" && (
        <LeadDetailsInfo 
          profiles={profiles}
          selectedAssignee={selectedAssignee}
          onAssigneeChange={onAssigneeChange}
          customer={customer}
          lead={lead}
          isLoading={isLoading}
        />
      )}
      
      {activeTab === "statistics" && (
        <div className="flex items-center justify-center h-full p-4">
          <p className="text-sm text-muted-foreground">Statistics will appear here</p>
        </div>
      )}
      
      {activeTab === "media" && (
        <div className="flex items-center justify-center h-full p-4">
          <p className="text-sm text-muted-foreground">Media files will appear here</p>
        </div>
      )}
      
      {activeTab === "setup" && (
        <div className="flex items-center justify-center h-full p-4">
          <p className="text-sm text-muted-foreground">Setup options will appear here</p>
        </div>
      )}

      <div className="mt-auto border-t p-4">
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Check className="h-4 w-4 mr-2" />
            Accept
          </Button>
          <Button variant="outline" size="icon" className="shrink-0">
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="shrink-0">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
