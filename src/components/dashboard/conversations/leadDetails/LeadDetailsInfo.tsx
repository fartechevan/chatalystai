import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Profile, Customer, Lead } from "../types";
import { Button } from "@/components/ui/button";

interface LeadDetailsInfoProps {
  profiles: Profile[];
  selectedAssignee: string | null;
  onAssigneeChange: (userId: string) => void;
  customer: Customer | null;
  lead: Lead | null;
  isLoading: boolean;
}

export function LeadDetailsInfo({ 
  profiles, 
  selectedAssignee, 
  onAssigneeChange, 
  customer, 
  lead, 
  isLoading
}: LeadDetailsInfoProps) {
  const selectedProfile = profiles.find(profile => profile.id === selectedAssignee);

  let selectValueDisplay = "Select user"; 
  if (selectedProfile?.name) {
    selectValueDisplay = selectedProfile.name;
  } else if (selectedAssignee) {
    selectValueDisplay = "Unknown User";
  }

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 items-center">
        <Label className="text-xs text-muted-foreground">Responsible user</Label>
        <div className="text-sm">
          {isLoading ? (
            <div className="h-8 w-full bg-muted animate-pulse rounded"></div>
          ) : profiles.length === 0 ? (
             <p className="text-xs text-muted-foreground italic">No users available</p>
          ) : (
            <Select 
              value={selectedAssignee || undefined}
              onValueChange={onAssigneeChange}
              disabled={profiles.length === 0}
            >
              <SelectTrigger className="h-auto py-1 px-2 text-sm border-none shadow-none data-[disabled]:opacity-100 data-[disabled]:cursor-not-allowed">
                <SelectValue placeholder="Select user">{selectValueDisplay}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {profiles.map(profile => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name || profile.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {lead && (
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 items-center">
          <Label className="text-xs text-muted-foreground">Sale</Label>
          <div className="text-sm font-medium">{lead.value?.toLocaleString() || "0"} RM</div>
        </div>
      )}

      {/* 
      <Button variant="link" size="sm" className="text-muted-foreground px-0 mt-2">
        cancel
      </Button> 
      */}
    </div>
  );
}
