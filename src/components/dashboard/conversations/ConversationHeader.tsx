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
  Search,
  PhoneCall,
  Video,
  Eye,
  Star,
  Flag,
  Clock,
  Tag,
  User,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import type { Conversation } from "./types";
import type { Customer } from "./types/customer";
import { supabase } from "@/integrations/supabase/client";

interface ConversationHeaderProps {
  conversation: Conversation | null;
}

export function ConversationHeader({ conversation }: ConversationHeaderProps) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [customerData, setCustomerData] = useState<Customer | null>(null);
  
  // Fetch customer data when conversation changes
  useEffect(() => {
    const fetchCustomerData = async () => {
      setCustomerData(null); // Reset customerData before fetching new data

      if (!conversation?.lead?.customer_id) {
        // If no customer_id in lead, try to find from participants
        if (conversation?.participants) {
          const memberParticipant = conversation.participants.find(
            p => p.role === 'member'
          );
          
          if (memberParticipant?.customer_id) {
            try {
              const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('id', memberParticipant.customer_id)
                .maybeSingle();
              
              if (error) {
                console.error('Error fetching customer data:', error);
                return;
              }
              
              if (data) {
                setCustomerData(data);
              }
            } catch (err) {
              console.error('Error processing customer data:', err);
            }
          }
        }
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', conversation.lead.customer_id)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching customer data:', error);
          return;
        }
        
        if (data) {
          setCustomerData(data);
        }
      } catch (err) {
        console.error('Error processing customer data:', err);
      }
    };
    
    fetchCustomerData();
  }, [conversation]);

  if (!conversation) {
    return (
      <div className="flex items-center justify-between p-3 border-b">
        <h2 className="text-lg font-semibold">Please select a conversation</h2>
      </div>
    );
  }

  // Determine the contact name to display based on available data
  const contactName = customerData?.name || 
                      conversation.customer_name || 
                      getContactNameFromParticipants(conversation) ||
                      "Unknown Contact";
  
  // Get the first letter for the avatar
  const avatarInitial = contactName.charAt(0);
  
  // Get customer phone number
  const phoneNumber = customerData?.phone_number || 
                      getPhoneNumberFromParticipants(conversation) || 
                      "No phone number";

  return (
    <div className="flex items-center justify-between p-3 border-b">
      <div className="flex items-center space-x-3">
        <div className="relative">
          <div className="w-10 h-10 overflow-hidden rounded-full bg-gray-200 flex items-center justify-center">
            {avatarInitial ? (
              <span className="text-lg font-medium text-gray-700">
                {avatarInitial.toUpperCase()}
              </span>
            ) : (
              <User className="w-6 h-6 text-gray-500" />
            )}
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
        </div>
        <div>
          <h2 className="font-semibold">{contactName}</h2>
          <p className="text-xs text-gray-500">{phoneNumber}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {isSearchExpanded ? (
          <div className="flex items-center rounded-md bg-gray-100 px-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              className="h-8 w-40 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Search conversation..."
              autoFocus
              onBlur={() => setIsSearchExpanded(false)}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsSearchExpanded(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchExpanded(true)}
          >
            <Search className="h-5 w-5" />
          </Button>
        )}
        <Button variant="ghost" size="icon">
          <PhoneCall className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <Video className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
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

// Helper function to extract contact name from participants
function getContactNameFromParticipants(conversation: Conversation): string | null {
  if (!conversation.participants) return null;
  
  const memberParticipant = conversation.participants.find(p => p.role === 'member');
  if (memberParticipant && memberParticipant.external_user_identifier) {
    return memberParticipant.external_user_identifier;
  }
  
  return null;
}

// Helper function to extract phone number from participants
function getPhoneNumberFromParticipants(conversation: Conversation): string | null {
  if (!conversation.participants) return null;
  
  const memberParticipant = conversation.participants.find(p => p.role === 'member');
  if (memberParticipant && memberParticipant.external_user_identifier) {
    return memberParticipant.external_user_identifier;
  }
  
  return null;
}
