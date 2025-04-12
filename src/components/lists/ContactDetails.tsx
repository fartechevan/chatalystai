
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
    <div className="p-6 h-full flex flex-col">
      <Card className="flex-1 overflow-auto">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">{contact.name}</h2>
              <p className="text-muted-foreground">{contact.email || 'No email'}</p>
            </div>
            {/* Edit Button and Dialog Trigger */}
            <EditContactDialog contact={dialogContact} onContactUpdated={handleContactUpdated}>
              <Button variant="outline" size="icon">
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit Contact</span>
              </Button>
            </EditContactDialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Phone</label>
              <p>{contact.phone_number || 'N/A'}</p> {/* Corrected field name */}
            </div>
             <div>
              <label className="text-sm font-medium">Company</label>
              <p>{contact.company_name || 'N/A'}</p> {/* Corrected field name */}
            </div>
            {contact.metadata && typeof contact.metadata === 'object' && Object.keys(contact.metadata).length > 0 && ( // Check if metadata exists and is not empty object
              <div>
                <label className="text-sm font-medium">Additional Information</label>
                <pre className="mt-1 text-sm bg-muted p-2 rounded-md">
                  {JSON.stringify(contact.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
