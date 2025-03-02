
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Phone, Plus } from "lucide-react";
import { Customer, Lead } from "../types";

interface LeadContactInfoProps {
  customer: Customer | null;
  lead: Lead | null;
}

export function LeadContactInfo({ customer, lead }: LeadContactInfoProps) {
  return (
    <>
      <div className="border-t border-b py-4 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src="https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80" />
            <AvatarFallback>{customer?.name?.charAt(0) || 'C'}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="font-medium">{customer?.name || lead?.contact_first_name || 'Contact'}</div>
            <Button variant="outline" size="sm" className="h-6 text-xs">
              <Phone className="h-3 w-3 mr-1" />
              WhatsApp Lite
            </Button>
          </div>
        </div>
      </div>

      <Button variant="ghost" className="w-full justify-start text-muted-foreground">
        <div className="h-8 w-8 rounded-full border flex items-center justify-center mr-3">
          <Plus className="h-4 w-4" />
        </div>
        Add contact
      </Button>

      <Button variant="ghost" className="w-full justify-start text-muted-foreground border-b pb-6">
        <div className="h-8 w-8 rounded-full border flex items-center justify-center mr-3">
          <Plus className="h-4 w-4" />
        </div>
        Add company
      </Button>
    </>
  );
}
