
import { DataTable } from "./DataTable";
import { columns } from "./columns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMediaQuery } from "@/hooks/use-media-query"; // Import useMediaQuery
import { BillingStats } from "./BillingStats";
import { IntegrationsView } from "./IntegrationsView";
import { ProfileAccessManagement } from "./integration-access/ProfileAccessManagement";
import { UserCardList } from "./UserCardList"; // Import the new card list component
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton for loading state

interface SettingsContentProps {
  section: string;
}

export function SettingsContent({ section }: SettingsContentProps) {
  const isMobile = useMediaQuery("(max-width: 768px)"); // Check for mobile screen size
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          name,
          created_at,
          role
        `);
      
      if (error) throw error;
      return data;
    },
  });

  if (section === 'billing') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <BillingStats />
      </div>
    );
  }

  if (section === 'users') {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto"> {/* Use responsive padding */}
        {isLoading ? (
          // Loading state for both mobile and desktop
          isMobile ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-md" />
              ))}
            </div>
          ) : (
             <div className="rounded-md border p-4">
               <Skeleton className="h-8 w-1/4 mb-4" /> {/* Placeholder for potential search/add */}
               <Skeleton className="h-96 w-full" /> {/* Placeholder for table */}
             </div>
          )
        ) : (
          // Data state
          isMobile ? (
            <UserCardList users={users} />
          ) : (
            <DataTable columns={columns} data={users} />
          )
        )}
      </div>
    );
  }

  if (section === 'integrations') {
    // Use responsive padding for the wrapper
    return (
      <div className="p-4 md:p-6"> 
        <IntegrationsView isActive={section === 'integrations'} />
      </div>
    );
  }

  if (section === 'access') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <ProfileAccessManagement />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-lg font-semibold">{section.charAt(0).toUpperCase() + section.slice(1)}</h2>
      <p className="text-muted-foreground">This section is under development.</p>
    </div>
  );
}
