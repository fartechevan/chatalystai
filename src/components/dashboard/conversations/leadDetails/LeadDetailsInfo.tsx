
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Profile, Customer, Lead } from "../types";

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

      <LeadContactDetails customer={customer} lead={lead} />

      <Button variant="link" size="sm" className="text-muted-foreground px-0">
        cancel
      </Button>
    </div>
  );
}

function LeadContactDetails({ customer, lead }: { customer: Customer | null, lead: Lead | null }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 items-center">
        <label className="text-sm text-muted-foreground">Work phone</label>
        <div className="text-sm">{lead?.contact_phone || customer?.phone_number || '...'}</div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 items-center">
        <label className="text-sm text-muted-foreground">Work email</label>
        <div className="text-sm">{lead?.contact_email || customer?.email || '...'}</div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 items-center">
        <label className="text-sm text-muted-foreground">Company</label>
        <div className="text-sm">{lead?.company_name || '...'}</div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 items-center">
        <label className="text-sm text-muted-foreground">Address</label>
        <div className="text-sm">{lead?.company_address || '...'}</div>
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";
