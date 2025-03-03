
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-2 gap-2 items-center">
        <label className="text-sm text-muted-foreground">Responsible user</label>
        <div className="text-sm">
          {isLoading ? (
            <div className="h-5 w-24 bg-muted animate-pulse rounded"></div>
          ) : (
            <Select 
              value={selectedAssignee || undefined} 
              onValueChange={onAssigneeChange}
            >
              <SelectTrigger className="h-auto py-1 px-2 text-sm border-none shadow-none">
                <SelectValue placeholder="Select user">
                  {selectedProfile?.name || "Select user"}
                </SelectValue>
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

      <div className="grid grid-cols-2 gap-2 items-center">
        <label className="text-sm text-muted-foreground">Sale</label>
        <div className="text-sm">{lead?.value?.toLocaleString() || 0} RM</div>
      </div>

      <Button variant="link" size="sm" className="text-muted-foreground px-0">
        cancel
      </Button>
    </div>
  );
}
