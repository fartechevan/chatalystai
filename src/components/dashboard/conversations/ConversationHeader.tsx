import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  MoreVertical,
  // Search, // To be removed
  // PhoneCall, // To be removed
  // Video, // To be removed
  Eye,
  Star,
  Flag,
  Clock,
  Tag,
  User,
  PanelRightOpen, // Added for the new trigger button
} from "lucide-react";
import { useState, useEffect } from "react";
import { useMediaQuery } from "@/hooks/use-media-query"; // Added back for isDesktop check
import type { Conversation } from "./types";
import type { Customer } from "./types/customer";
// import { Input } from "@/components/ui/input"; 
import { supabase } from "@/integrations/supabase/client";

interface ConversationHeaderProps {
  conversation: Conversation | null;
  partnerName?: string;
  onOpenLeadDetails?: () => void; // Added prop
}

export function ConversationHeader({ conversation, partnerName, onOpenLeadDetails }: ConversationHeaderProps) {
  // const [isSearchExpanded, setIsSearchExpanded] = useState(false); // Search functionality was removed
  const [customerData, setCustomerData] = useState<Customer | null>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)"); // For showing the button only on desktop

  // Fetch customer data when conversation changes (keeping this part)
  useEffect(() => {
    const fetchCustomerData = async () => {
      setCustomerData(null); // Reset customerData before fetching new data

      if (!conversation) return;
      // Removed line: setDerivedCustomerId(null); 

      let customerId: string | null = null;

      // First priority: Get customer_id from lead (though this component part runs when lead doesn't exist)
      // This check might be redundant here if we only show the button when lead is null,
      // but keeping it for consistency with original logic.
      if (conversation.lead?.customer_id) {
        customerId = conversation.lead.customer_id;
      }
      // Second priority: Get customer_id from participant
      else if (conversation.participants) {
        const memberParticipant = conversation.participants.find(
          p => p.role === 'member' && p.customer_id
        );

        if (memberParticipant?.customer_id) {
          customerId = memberParticipant.customer_id;
        }
      }
      // If we found a customer ID, fetch the customer data
      if (customerId) {
        // Removed setting derivedCustomerId
        try {
          const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .maybeSingle();

          if (error) {
            console.error('Error fetching customer data:', error);
            // Don't return, maybe we still want to show the button even if customer fetch fails
          }

          if (data) {
            setCustomerData(data);
          }
        } catch (err) {
          console.error('Error processing customer data:', err);
        }
      } else {
         // Corrected: Use conversation_id
         console.warn("Could not determine customer ID for conversation:", conversation.conversation_id);
         // Handle cases where customer ID cannot be found - maybe disable the button?
      }
    };

    fetchCustomerData();
  }, [conversation]);

  // Removed createLeadMutation and handleCreateLead function

  if (!conversation) {
    return (
      <div className="flex items-center justify-between p-3 border-b">
        <h2 className="text-lg font-semibold">Please select a conversation</h2>
      </div>
    );
  }

  // Get contact information from various sources
  const localContactName = getContactName(customerData, conversation);
  const displayContactName = (partnerName && partnerName !== "Chat") ? partnerName : localContactName;
  const phoneNumber = getPhoneNumber(customerData, conversation);

  // Get the first letter for the avatar
  const avatarInitial = displayContactName.charAt(0).toUpperCase();
  // Removed showCreateLeadButton calculation

  return (
    <div className="flex items-center justify-between p-3 border-b gap-2">
      <div className="flex items-center space-x-3 flex-shrink min-w-0"> {/* Added flex-shrink and min-w-0 */}
        <div className="relative flex-shrink-0"> {/* Added flex-shrink-0 */}
          <div className="w-10 h-10 overflow-hidden rounded-full bg-gray-200 flex items-center justify-center">
            {avatarInitial ? (
              <span className="text-lg font-medium text-gray-700">
                {avatarInitial}
              </span>
            ) : (
              <User className="w-6 h-6 text-gray-500" />
            )}
          </div>
          {/* <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div> Removed green dot */}
        </div>
        <div className="truncate"> {/* Added truncate */}
          <h2 className="font-semibold truncate" title={displayContactName}>{displayContactName}</h2> {/* Added truncate and title */}
          <p className="text-xs text-gray-500 truncate" title={phoneNumber}>{phoneNumber}</p> {/* Added truncate and title */}
        </div>
      </div>

      {/* Actions Section */}
      <div className="flex items-center space-x-1 flex-shrink-0">
        {/* Desktop Trigger for Lead Details Panel */}
        {isDesktop && onOpenLeadDetails && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onOpenLeadDetails} 
            aria-label="Toggle Lead Details" // Updated aria-label
            title="Toggle Lead Details" // Updated title
          >
            <PanelRightOpen className="h-5 w-5" />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More options">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              <span>Mark as unread</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Star className="mr-2 h-4 w-4" />
              <span>Mark as important</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Flag className="mr-2 h-4 w-4" />
              <span>Flag conversation</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Clock className="mr-2 h-4 w-4" />
              <span>Snooze notifications</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Tag className="mr-2 h-4 w-4" />
              <span>Add tags</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Function to get contact name from various sources
function getContactName(customerData: Customer | null, conversation: Conversation): string {
  // First priority: Customer data from database with non-empty name
  if (customerData?.name && customerData.name.trim() !== '') {
    return customerData.name;
  }

  // If customer exists but name is empty, use phone number
  if (customerData?.phone_number) {
    return customerData.phone_number;
  }

  // Second priority: conversation.customer_name from ConversationView processing
  if (conversation.customer_name && conversation.customer_name.trim() !== '') {
    return conversation.customer_name;
  }

  // Third priority: Try to get name from participants
  if (conversation.participants) {
    const memberParticipant = conversation.participants.find(
      p => p.role === 'member' && p.external_user_identifier
    );

    if (memberParticipant?.external_user_identifier) {
      return memberParticipant.external_user_identifier;
    }
  }

  return 'Unknown Contact';
}

// Function to get phone number from various sources
function getPhoneNumber(customerData: Customer | null, conversation: Conversation): string {
  // First priority: Customer data from database
  if (customerData?.phone_number) {
    return customerData.phone_number;
  }

  // Second priority: Try to get phone from participants
  if (conversation.participants) {
    const memberParticipant = conversation.participants.find(
      p => p.role === 'member' && p.external_user_identifier
    );

    if (memberParticipant?.external_user_identifier) {
      return memberParticipant.external_user_identifier;
    }
  }

  return 'No phone number';
}
