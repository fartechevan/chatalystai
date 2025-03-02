
import {
  Calendar,
  Clock,
  Mail,
  MapPin,
  Phone,
  User,
  Building,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { Conversation } from "./types";

interface ConversationUserDetailsProps {
  conversation: Conversation | null;
}

export function ConversationUserDetails({
  conversation,
}: ConversationUserDetailsProps) {
  if (!conversation || !conversation.lead) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <User className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium">No User Selected</h3>
        <p className="text-sm text-gray-500 max-w-xs mt-2">
          Select a conversation to view customer details
        </p>
      </div>
    );
  }

  const lead = conversation.lead;

  // Format date strings
  const formattedDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
    } catch (e) {
      return "Invalid date";
    }
  };

  // Format time strings
  const formattedTime = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      }).format(date);
    } catch (e) {
      return "";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Contact Information</h3>
        <div className="space-y-3">
          <div className="flex items-start">
            <User className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
            <div>
              <p className="font-medium">
                {lead.contact_first_name || "Unknown"}
              </p>
              <p className="text-sm text-gray-500">Contact name</p>
            </div>
          </div>
          {lead.contact_email && (
            <div className="flex items-start">
              <Mail className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
              <div>
                <p className="font-medium">{lead.contact_email}</p>
                <p className="text-sm text-gray-500">Email address</p>
              </div>
            </div>
          )}
          {lead.contact_phone && (
            <div className="flex items-start">
              <Phone className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
              <div>
                <p className="font-medium">{lead.contact_phone}</p>
                <p className="text-sm text-gray-500">Phone number</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-2">Company Information</h3>
        <div className="space-y-3">
          {lead.company_name && (
            <div className="flex items-start">
              <Building className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
              <div>
                <p className="font-medium">{lead.company_name}</p>
                <p className="text-sm text-gray-500">Company name</p>
              </div>
            </div>
          )}
          {lead.company_address && (
            <div className="flex items-start">
              <MapPin className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
              <div>
                <p className="font-medium">{lead.company_address}</p>
                <p className="text-sm text-gray-500">Company address</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-2">Lead Timeline</h3>
        <div className="space-y-3">
          <div className="flex items-start">
            <Calendar className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
            <div>
              <p className="font-medium">{formattedDate(lead.created_at)}</p>
              <p className="text-sm text-gray-500">Lead created</p>
            </div>
          </div>
          <div className="flex items-start">
            <Clock className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
            <div>
              <p className="font-medium">
                {formattedDate(conversation.created_at)}{" "}
                {formattedTime(conversation.created_at)}
              </p>
              <p className="text-sm text-gray-500">Conversation started</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
