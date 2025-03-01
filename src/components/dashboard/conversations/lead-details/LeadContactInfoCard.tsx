
import { Card } from "@/components/ui/card";
import { User, Mail, Phone } from "lucide-react";
import type { Lead } from "../types";

interface LeadContactInfoCardProps {
  lead: Lead;
}

export function LeadContactInfoCard({ lead }: LeadContactInfoCardProps) {
  return (
    <Card className="p-4">
      <h4 className="font-medium mb-2">Contact Information</h4>
      {lead.contact_first_name || lead.contact_email || lead.contact_phone ? (
        <div className="space-y-2">
          {lead.contact_first_name && (
            <div className="flex items-center">
              <User className="h-4 w-4 mr-2 opacity-70" />
              <span>{lead.contact_first_name}</span>
            </div>
          )}
          {lead.contact_email && (
            <div className="flex items-center">
              <Mail className="h-4 w-4 mr-2 opacity-70" />
              <span>{lead.contact_email}</span>
            </div>
          )}
          {lead.contact_phone && (
            <div className="flex items-center">
              <Phone className="h-4 w-4 mr-2 opacity-70" />
              <span>{lead.contact_phone}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">No contact information</div>
      )}
    </Card>
  );
}
