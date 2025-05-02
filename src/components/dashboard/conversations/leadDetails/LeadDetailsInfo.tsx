
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Profile, Customer, Lead } from "../types";
import { Button } from "@/components/ui/button";

interface LeadDetailsInfoProps {
  profiles: Profile[];
  selectedAssignee: string | null;
  onAssigneeChange: (userId: string) => void;
  customer: Customer | null;
  lead: Lead | null;
  isLoading: boolean; // This prop represents isLoadingProfiles in the parent
}

export function LeadDetailsInfo({ 
  profiles, 
  selectedAssignee, 
  onAssigneeChange, 
  customer, 
  lead, 
  isLoading // Represents isLoadingProfiles from parent
}: LeadDetailsInfoProps) {
  // console.log("[Render LeadDetailsInfo] Props:", { profiles, selectedAssignee, customer, lead, isLoading }); // Remove log
  const selectedProfile = profiles.find(profile => profile.id === selectedAssignee);
  // console.log("[Render LeadDetailsInfo] Found selectedProfile:", selectedProfile); // Remove log

  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-2 gap-2 items-center">
        <label className="text-sm text-muted-foreground">Responsible user</label>
        <div className="text-sm">
          {isLoading ? (
            <div className="h-5 w-24 bg-muted animate-pulse rounded"></div>
          ) : profiles.length === 0 ? (
             <p className="text-xs text-muted-foreground italic">No users available</p>
          ) : (
            <Select 
              value={selectedAssignee || undefined} // Use undefined if null for placeholder
              onValueChange={onAssigneeChange}
              disabled={profiles.length === 0} // Disable if no profiles
            >
              <SelectTrigger className="h-auto py-1 px-2 text-sm border-none shadow-none data-[disabled]:opacity-100 data-[disabled]:cursor-not-allowed">
                <SelectValue placeholder="Select user">
                  {/* Show selected name or placeholder */}
                  {selectedProfile?.name || (selectedAssignee ? "Unknown User" : "Select user")} 
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {profiles.map(profile => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name || profile.email} {/* Display name or email */}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {lead && (
        <div className="grid grid-cols-2 gap-2 items-center">
          <label className="text-sm text-muted-foreground">Sale</label>
          <div className="text-sm">{lead.value?.toLocaleString() || 0} RM</div>
        </div>
      )}

      <Button variant="link" size="sm" className="text-muted-foreground px-0">
        cancel
      </Button>
    </div>
  );
}
