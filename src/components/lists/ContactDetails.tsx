
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Added Button
import { ChevronLeft } from "lucide-react"; // Added Icon
import { cn } from "@/lib/utils"; // Added cn

interface ContactDetailsProps {
  contactId: string;
  onCloseDetails?: () => void; // Added optional prop
}

export function ContactDetails({ contactId, onCloseDetails }: ContactDetailsProps) {
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
    <div className="p-6 h-full flex flex-col"> {/* Ensure full height */}
       {/* Mobile Back Button Removed */}
      <Card className="flex-1 overflow-auto"> {/* Allow card content to scroll if needed */}
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
