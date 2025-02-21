
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface ContactListProps {
  onSelectContact: (contactId: string) => void;
}

export function ContactList({ onSelectContact }: ContactListProps) {
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
    <ScrollArea className="h-[calc(100vh-10rem)]">
      <div className="space-y-2 p-4">
        {contacts?.map((contact) => (
          <button
            key={contact.id}
            onClick={() => onSelectContact(contact.id)}
            className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
          >
            <div className="font-medium">{contact.name}</div>
            <div className="text-sm text-muted-foreground">{contact.email}</div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
