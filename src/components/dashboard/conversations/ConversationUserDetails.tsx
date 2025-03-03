
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, Building, MapPin, User, X } from "lucide-react";
import { useState } from "react";
import type { Conversation, Lead, Customer } from "./types";

interface ConversationUserDetailsProps {
  conversation: Conversation | null;
}

export function ConversationUserDetails({
  conversation
}: ConversationUserDetailsProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');
  
  // Extract lead from the conversation
  const lead = conversation?.lead || null;
  
  // Get customer name from lead or conversation
  const customerName = conversation?.customer_name || lead?.name || 'Unknown Customer';
  
  // Get avatar initials
  const getInitials = () => {
    if (customerName && customerName.length > 0) {
      return customerName.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-6">
          <Avatar className="h-16 w-16">
            <AvatarImage alt={customerName} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-medium">{customerName}</h3>
            {lead?.company_name && (
              <p className="text-sm text-muted-foreground">{lead.company_name}</p>
            )}
          </div>
        </div>
        
        <div className="flex space-x-4 mb-6">
          <Button 
            variant={activeTab === 'details' ? 'default' : 'ghost'} 
            onClick={() => setActiveTab('details')}
            className="flex-1"
          >
            Details
          </Button>
          <Button 
            variant={activeTab === 'activity' ? 'default' : 'ghost'} 
            onClick={() => setActiveTab('activity')}
            className="flex-1"
          >
            Activity
          </Button>
        </div>
        
        {activeTab === 'details' ? (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center">
                <User className="h-4 w-4 mr-2" />
                Contact Information
              </h4>
              <div className="space-y-2 text-sm">
                {lead?.contact_phone && (
                  <div className="flex items-start">
                    <Phone className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p>{lead.contact_phone}</p>
                    </div>
                  </div>
                )}
                
                {lead?.contact_email && (
                  <div className="flex items-start">
                    <Mail className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p>{lead.contact_email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center">
                <Building className="h-4 w-4 mr-2" />
                Company Information
              </h4>
              <div className="space-y-2 text-sm">
                {lead?.company_name && (
                  <div className="flex items-start">
                    <Building className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Company Name</p>
                      <p>{lead.company_name}</p>
                    </div>
                  </div>
                )}
                
                {lead?.company_address && (
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Address</p>
                      <p>{lead.company_address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="text-sm font-medium mb-2">Lead Information</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Lead ID</p>
                  <p className="truncate">{lead?.id ? lead.id.slice(0, 8) : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Value</p>
                  <p>${lead?.value || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{lead?.created_at ? new Date(lead.created_at).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">No activity records available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
