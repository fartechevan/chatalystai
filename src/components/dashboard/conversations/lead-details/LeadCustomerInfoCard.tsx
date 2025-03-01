
import { Card } from "@/components/ui/card";
import { User, Mail, Phone } from "lucide-react";
import type { Lead, Customer } from "../types";

interface LeadCustomerInfoCardProps {
  lead: Lead;
}

export function LeadCustomerInfoCard({ lead }: LeadCustomerInfoCardProps) {
  if (!lead.customer) {
    return (
      <Card className="p-4">
        <h4 className="font-medium mb-2">Customer Details</h4>
        <div className="text-sm text-muted-foreground">No customer linked</div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h4 className="font-medium mb-2">Customer Details</h4>
      <div className="space-y-2">
        <div className="flex items-center">
          <User className="h-4 w-4 mr-2 opacity-70" />
          <span>{lead.customer.name}</span>
        </div>
        {lead.customer.email && (
          <div className="flex items-center">
            <Mail className="h-4 w-4 mr-2 opacity-70" />
            <span>{lead.customer.email}</span>
          </div>
        )}
        {lead.customer.phone_number && (
          <div className="flex items-center">
            <Phone className="h-4 w-4 mr-2 opacity-70" />
            <span>{lead.customer.phone_number}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
