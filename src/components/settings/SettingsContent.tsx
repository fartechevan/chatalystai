
import { DataTable } from "./DataTable";
import { columns } from "./columns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BillingStats } from "./BillingStats";
import { IntegrationsView } from "./IntegrationsView";

interface SettingsContentProps {
  section: string;
}

export function SettingsContent({ section }: SettingsContentProps) {
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
      <div className="p-8">
        <BillingStats />
      </div>
    );
  }

  if (section === 'users') {
    return (
      <div className="p-4">
        <DataTable columns={columns} data={users} />
      </div>
    );
  }

  if (section === 'integrations') {
    return <IntegrationsView />;
  }

  return (
    <div className="p-8">
      <h2 className="text-lg font-semibold">{section.charAt(0).toUpperCase() + section.slice(1)}</h2>
      <p className="text-muted-foreground">This section is under development.</p>
    </div>
  );
}
