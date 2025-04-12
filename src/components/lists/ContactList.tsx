
import { useQuery, useQueryClient } from "@tanstack/react-query"; // Import useQueryClient
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { AddContactDialog } from "./components/AddContactDialog"; // Import the dialog
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal, Plus } from "lucide-react";

interface ContactListProps {
  onSelectContact: (contactId: string) => void;
}

export function ContactList({ onSelectContact }: ContactListProps) {
  const queryClient = useQueryClient(); // Get query client instance
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
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </div>
    </div>
  );
}
