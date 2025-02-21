
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

interface ContactDetailsProps {
  contactId: string;
}

export function ContactDetails({ contactId }: ContactDetailsProps) {
  const { data: contact, isLoading } = useQuery({
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
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!contact) {
    return <div className="p-6">Contact not found</div>;
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold">{contact.name}</h2>
          <p className="text-muted-foreground">{contact.email}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Phone Number</label>
              <p>{contact.phone_number}</p>
            </div>
            {contact.metadata && (
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
