
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trash2, UserPlus, Mail, PhoneCall } from "lucide-react";
import type { Conversation, Customer } from "./types";
import { getCustomerName, getCustomerEmail } from "./utils/participantUtils";
import { supabase } from "@/integrations/supabase/client";

interface ConversationUserDetailsProps {
  conversation: Conversation | null;
}

export function ConversationUserDetails({ conversation }: ConversationUserDetailsProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const getCustomerData = async () => {
      if (!conversation || !conversation.lead?.customer_id) return;

      setIsLoading(true);
      try {
        // Fetch the customer data
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', conversation.lead.customer_id)
          .single();

        if (error) throw error;
        setCustomer(data);
      } catch (error) {
        console.error('Error fetching customer:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getCustomerData();
  }, [conversation]);

  if (!conversation) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">No conversation selected</p>
      </div>
    );
  }

  const name = getCustomerName(conversation);
  const email = getCustomerEmail(conversation);
  const phone = customer?.phone_number || 'Unknown';

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col items-center text-center gap-3">
        <Avatar className="h-16 w-16">
          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-medium text-lg">{name}</h3>
          <p className="text-sm text-muted-foreground">{customer ? 'Customer' : 'Unknown Contact'}</p>
        </div>
      </div>

      <div className="flex gap-2 justify-center">
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-1" />
          Add contact
        </Button>
        <Button variant="outline" size="sm" className="text-destructive">
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="text-sm font-medium">Contact Information</h4>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{email || 'No email'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <PhoneCall className="h-4 w-4 text-muted-foreground" />
            <span>{phone}</span>
          </div>
        </div>
      </div>

      <Separator />

      {isLoading ? (
        <p className="text-sm text-center">Loading customer information...</p>
      ) : (
        customer && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Additional Info</h4>
            <p className="text-sm">
              {customer.name} has been a customer since {
                new Date(customer.created_at).toLocaleDateString()
              }.
            </p>
          </div>
        )
      )}
    </div>
  );
}
