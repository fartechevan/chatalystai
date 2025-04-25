
import { useQuery, useQueryClient } from "@tanstack/react-query"; // Import useQueryClient
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { AddContactDialog } from "./components/AddContactDialog"; // Import the dialog
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react"; // Added Trash2
import { useState } from "react"; // Added useState
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'; // Added Dialog components
import { useToast } from "@/hooks/use-toast"; // Added useToast
import { Database } from "@/integrations/supabase/types"; // Import generated types

type Customer = Database['public']['Tables']['customers']['Row']; // Define Customer type

interface ContactListProps {
  onSelectContact: (contactId: string) => void;
}

export function ContactList({ onSelectContact }: ContactListProps) {
  const queryClient = useQueryClient(); // Get query client instance
  const { toast } = useToast(); // Initialize toast
  const [contactToDelete, setContactToDelete] = useState<Customer | null>(null); // State for delete confirmation
  const { data: contacts, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
     },
   });
 
   const handleDeleteContact = async (contactId: string) => {
     try {
       const { error } = await supabase
         .from('customers')
         .delete()
         .match({ id: contactId });
 
       if (error) throw error;
 
       toast({ title: 'Contact deleted successfully!' });
       setContactToDelete(null); // Close confirmation dialog
       queryClient.invalidateQueries({ queryKey: ['customers'] }); // Refresh the list
     } catch (error) {
       const errorMessage = error instanceof Error ? error.message : 'Could not delete the contact.';
       console.error('Error deleting contact:', error);
       toast({
         title: 'Error deleting contact',
         description: errorMessage,
         variant: 'destructive',
       });
       setContactToDelete(null); // Close confirmation dialog on error too
     }
   };
 
   if (isLoading) {
     return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">CONTACTS</h2>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
            Full list
          </Button>
          <Input 
            placeholder="Search and filter" 
            className="w-[200px] h-7 text-sm" 
          />
          <span className="text-sm text-muted-foreground">
            {contacts?.length || 0} contacts
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Removed the MoreHorizontal button */}
          {/* Replace the old button with the AddContactDialog component */}
          <AddContactDialog 
            onContactAdded={() => {
              queryClient.invalidateQueries({ queryKey: ['customers'] }); // Invalidate query on success
            }} 
          />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <table className="w-full">
            <thead className="sticky top-0 bg-background border-b">
              <tr>
                <th className="w-12 p-3">
                  <Checkbox />
                </th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                  NAME
                </th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                  COMPANY
                </th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                  PHONE
                </th>
                 <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                   EMAIL
                 </th>
                 <th className="text-right p-3 text-sm font-medium text-muted-foreground">
                   ACTIONS
                 </th>
               </tr>
             </thead>
             <tbody>
              {contacts?.map((contact) => (
                <tr 
                  key={contact.id}
                  onClick={() => onSelectContact(contact.id)}
                  className="hover:bg-muted/50 cursor-pointer"
                >
                  <td className="w-12 p-3">
                    <Checkbox 
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="p-3">
                    {contact.name}
                  </td>
                  <td className="p-3">
                    <span className="text-muted-foreground">•</span>
                  </td>
                  <td className="p-3">
                    {contact.phone_number}
                  </td>
                   <td className="p-3">
                     {contact.email}
                   </td>
                   <td className="p-3 text-right">
                     <Dialog open={contactToDelete?.id === contact.id} onOpenChange={(isOpen) => !isOpen && setContactToDelete(null)}>
                       <DialogTrigger asChild>
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           onClick={(e) => {
                             e.stopPropagation(); // Prevent row click
                             setContactToDelete(contact);
                           }}
                           title="Delete Contact"
                         >
                           <Trash2 className="h-4 w-4 text-destructive" />
                         </Button>
                       </DialogTrigger>
                       <DialogContent onClick={(e) => e.stopPropagation()}> {/* Prevent row click */}
                         <DialogHeader>
                           <DialogTitle>Delete Contact</DialogTitle>
                         </DialogHeader>
                         <p>Are you sure you want to delete the contact "{contactToDelete?.name}"? This action cannot be undone.</p>
                         <DialogFooter>
                           <Button variant="outline" onClick={(e) => { e.stopPropagation(); setContactToDelete(null); }}>Cancel</Button>
                           <Button variant="destructive" onClick={(e) => { e.stopPropagation(); handleDeleteContact(contactToDelete!.id); }}>Delete</Button>
                         </DialogFooter>
                       </DialogContent>
                     </Dialog>
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>
        </ScrollArea>
      </div>
    </div>
  );
}
