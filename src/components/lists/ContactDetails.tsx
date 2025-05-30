
import { useQuery, useQueryClient } from "@tanstack/react-query"; // Import useQueryClient
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Pencil } from "lucide-react"; // Import Pencil icon
import { cn } from "@/lib/utils";
import { EditContactDialog } from "./components/EditContactDialog"; // Import EditContactDialog
import { Tables } from "@/integrations/supabase/types"; // Import the Tables type

interface ContactDetailsProps {
  contactId: string;
  onCloseDetails?: () => void; // Added optional prop
} // Closing brace was missing or misplaced

export function ContactDetails({ contactId, onCloseDetails }: ContactDetailsProps) {
  const queryClient = useQueryClient(); // Get query client instance
  const { data: contact, isLoading, isError } = useQuery<Tables<'customers'>>({ // Use the specific table type
    queryKey: ['customer', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', contactId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!contactId, // Only run query if contactId is present
  });

  const handleContactUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['customer', contactId] });
    queryClient.invalidateQueries({ queryKey: ['customers'] }); // Also invalidate the list query
  };


  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!contact) {
    return <div className="p-6 text-muted-foreground">Contact not found or error loading details.</div>;
  }

  // Define a type for the contact data expected by the EditContactDialog
  // Ensure this matches the structure returned by your query and expected by the dialog
  const dialogContact = {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    phone: contact.phone_number, // Corrected field name
    company: contact.company_name, // Corrected field name
  };

  return (
    // The parent in ListsView.tsx handles the main panel styling (border-l, bg-background, shadow-lg)
    // This component will now just manage its internal content structure and padding.
    <div className="h-full flex flex-col"> 
      {/* Header Section */}
      <div className="flex justify-between items-center p-4 border-b">
        <div>
          <h2 className="text-xl font-semibold truncate">{contact.name}</h2>
          <p className="text-sm text-muted-foreground truncate">{contact.email || 'No email'}</p>
        </div>
        <EditContactDialog contact={dialogContact} onContactUpdated={handleContactUpdated}>
          <Button variant="ghost" size="icon"> {/* Changed to ghost for a less prominent edit button */}
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit Contact</span>
          </Button>
        </EditContactDialog>
      </div>

      {/* Content Section */}
      <div className="flex-1 overflow-y-auto p-4"> {/* Added padding to content area */}
        <div className="space-y-6"> {/* Increased spacing between sections */}
          <div>
            <h3 className="text-xs font-medium uppercase text-muted-foreground mb-1">Phone</h3>
            <p className="text-sm">{contact.phone_number || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-xs font-medium uppercase text-muted-foreground mb-1">Company</h3>
            <p className="text-sm">{contact.company_name || 'N/A'}</p>
          </div>
          {contact.metadata && typeof contact.metadata === 'object' && Object.keys(contact.metadata).length > 0 && (
            <div>
              <h3 className="text-xs font-medium uppercase text-muted-foreground mb-1">Additional Information</h3>
              <pre className="mt-1 text-xs bg-muted/50 p-3 rounded-md overflow-x-auto"> {/* Adjusted pre styling */}
                {JSON.stringify(contact.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
      {/* Optional: Add a CardFooter here if actions are needed at the bottom of the panel */}
    </div>
  );
}
