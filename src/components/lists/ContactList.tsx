
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { AddContactDialog } from "./components/AddContactDialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Import Table components
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce"; // Import useDebounce
import { Database } from "@/integrations/supabase/types";

type Customer = Database['public']['Tables']['customers']['Row'];
type SortableColumns = 'name' | 'company' | 'phone_number' | 'email'; // Define sortable columns type
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortableColumns;
  direction: SortDirection;
}

interface ContactListProps {
  onSelectContact: (contactId: string) => void;
}

export function ContactList({ onSelectContact }: ContactListProps) {
  const queryClient = useQueryClient(); // Get query client instance
  const { toast } = useToast();
  const [contactToDelete, setContactToDelete] = useState<Customer | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState(''); // State for search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce search term

  const { data: contacts, isLoading } = useQuery<Customer[]>({
    queryKey: ['customers', sortConfig, debouncedSearchTerm],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*')
        .order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });

      if (debouncedSearchTerm) {
        const searchTermPattern = `%${debouncedSearchTerm}%`;
        query = query.or(
          `name.ilike.${searchTermPattern},email.ilike.${searchTermPattern},phone_number.ilike.${searchTermPattern}`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
     },
   });

   // Function to handle sorting
   const handleSort = (key: SortableColumns) => {
     setSortConfig(prevConfig => ({
       key,
       direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc',
     }));
   };

   // Derived state to check if all contacts are selected
   const allContactsSelected = useMemo(() => {
     if (!contacts || contacts.length === 0) return false;
     return contacts.every(contact => selectedContactIds.has(contact.id));
   }, [contacts, selectedContactIds]);

   // Toggle selection for all contacts
   const handleSelectAll = (checked: boolean) => {
     if (checked) {
       const allIds = new Set(contacts?.map(c => c.id) || []);
       setSelectedContactIds(allIds);
     } else {
       setSelectedContactIds(new Set());
     }
   };

   // Toggle selection for a single contact
   const handleSelectContact = (contactId: string, checked: boolean) => {
     setSelectedContactIds(prev => {
       const newSet = new Set(prev);
       if (checked) {
         newSet.add(contactId);
       } else {
         newSet.delete(contactId);
       }
       return newSet;
     });
   };
 
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
       setSelectedContactIds(prev => { // Remove deleted contact from selection
         const newSet = new Set(prev);
         newSet.delete(contactId);
         return newSet;
       });
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

   const handleBulkDelete = async () => {
    const idsToDelete = Array.from(selectedContactIds);
    if (idsToDelete.length === 0) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .in('id', idsToDelete);

      if (error) throw error;

      toast({ title: `${idsToDelete.length} contact(s) deleted successfully!` });
      setSelectedContactIds(new Set()); // Clear selection
      setIsBulkDeleteConfirmOpen(false); // Close confirmation dialog
      queryClient.invalidateQueries({ queryKey: ['customers'] }); // Refresh the list
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Could not delete the selected contacts.';
      console.error('Error deleting contacts:', error);
      toast({
        title: 'Error deleting contacts',
        description: errorMessage,
        variant: 'destructive',
      });
      setIsBulkDeleteConfirmOpen(false); // Close confirmation dialog on error too
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
          {/* Removed "Full list" button */}
          <Input
            placeholder="Search name, email, phone..." // Updated placeholder
            value={searchTerm} // Bind value to state
            onChange={(e) => setSearchTerm(e.target.value)} // Update state on change
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
           {/* Bulk Delete Button and Dialog */}
           <Dialog open={isBulkDeleteConfirmOpen} onOpenChange={setIsBulkDeleteConfirmOpen}>
             <DialogTrigger asChild>
               <Button
                 variant="destructive"
                 size="sm"
                 className="h-7 px-2 text-xs"
                 disabled={selectedContactIds.size === 0}
                 onClick={(e) => {
                   e.stopPropagation(); // Prevent potential parent clicks
                   if (selectedContactIds.size > 0) {
                     setIsBulkDeleteConfirmOpen(true);
                   }
                 }}
                 title="Delete Selected Contacts"
               >
                 <Trash2 className="h-3 w-3 mr-1" />
                 Delete ({selectedContactIds.size})
               </Button>
             </DialogTrigger>
             <DialogContent onClick={(e) => e.stopPropagation()}>
               <DialogHeader>
                 <DialogTitle>Delete Selected Contacts</DialogTitle>
               </DialogHeader>
               <p>Are you sure you want to delete the selected {selectedContactIds.size} contact(s)? This action cannot be undone.</p>
               <DialogFooter>
                 <Button variant="outline" onClick={(e) => { e.stopPropagation(); setIsBulkDeleteConfirmOpen(false); }}>Cancel</Button>
                 <Button variant="destructive" onClick={(e) => { e.stopPropagation(); handleBulkDelete(); }}>Delete</Button>
               </DialogFooter>
             </DialogContent>
           </Dialog>
         </div>
       </div>

       <div className="flex-1 min-h-0 relative"> {/* Added relative positioning */}
        <ScrollArea className="h-full absolute inset-0"> {/* Use absolute positioning for scroll area */}
          <Table className="w-full">
            <TableHeader className="sticky top-0 bg-background z-10"> {/* Make header sticky */}
              <TableRow>
                <TableHead className="w-12 px-3"> {/* Adjusted padding */}
                  <Checkbox
                    checked={allContactsSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all contacts"
                    disabled={!contacts || contacts.length === 0}
                  />
                </TableHead>
                <TableHead className="px-3">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('name')}
                    className="px-0 hover:bg-transparent"
                  >
                    NAME
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="px-3">
                   <Button
                     variant="ghost"
                     onClick={() => handleSort('company')} // Assuming 'company' is a valid column in your DB
                     className="px-0 hover:bg-transparent"
                   >
                     COMPANY
                     <ArrowUpDown className="ml-2 h-4 w-4" />
                   </Button>
                 </TableHead>
                <TableHead className="px-3">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('phone_number')}
                    className="px-0 hover:bg-transparent"
                  >
                    PHONE
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                 <TableHead className="px-3">
                   <Button
                     variant="ghost"
                     onClick={() => handleSort('email')}
                     className="px-0 hover:bg-transparent"
                   >
                     EMAIL
                     <ArrowUpDown className="ml-2 h-4 w-4" />
                   </Button>
                 </TableHead>
                 <TableHead className="text-right px-3">
                   ACTIONS
                 </TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
              {isLoading && ( // Simplified loading state within tbody
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Loading contacts...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && contacts?.length === 0 && ( // Empty state
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No contacts found. Add your first contact!
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && contacts?.map((contact) => (
                <TableRow
                  key={contact.id}
                  onClick={() => onSelectContact(contact.id)}
                  className="hover:bg-muted/50 cursor-pointer"
                  data-state={selectedContactIds.has(contact.id) ? 'selected' : undefined} // Add selected state
                >
                  <TableCell className="px-3"> {/* Adjusted padding */}
                    <Checkbox
                      checked={selectedContactIds.has(contact.id)}
                      onCheckedChange={(checked) => handleSelectContact(contact.id, !!checked)}
                      onClick={(e) => e.stopPropagation()} // Prevent row click when clicking checkbox
                      aria-label={`Select contact ${contact.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium px-3">{contact.name}</TableCell> {/* Adjusted padding */}
                  <TableCell className="text-muted-foreground px-3">{/* Removed dot */}</TableCell> {/* Adjusted padding */}
                  <TableCell className="px-3">{contact.phone_number}</TableCell> {/* Adjusted padding */}
                   <TableCell className="px-3">{contact.email}</TableCell> {/* Adjusted padding */}
                   <TableCell className="text-right px-3"> {/* Adjusted padding */}
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
                   </TableCell>
                 </TableRow>
               ))}
             </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}
