
import React, { useState, useCallback } from 'react'; // Added useState, useCallback
import { DataTable } from "./DataTable";
import { columns } from "./columns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMediaQuery } from "@/hooks/use-media-query"; // Import useMediaQuery
import { Button } from "@/components/ui/button"; // Added Button
import { Loader2, DatabaseZap } from 'lucide-react'; // Added Loader2, DatabaseZap
import { toast } from '@/hooks/use-toast'; // Added toast
import { BillingStats } from "./BillingStats";
import { IntegrationsView } from "./IntegrationsView";
import { ProfileAccessManagement } from "./integration-access/ProfileAccessManagement";
import { UserCardList } from "./UserCardList"; // Import the new card list component
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton for loading state

import type { IntegrationsTabValue } from "@/components/dashboard/DashboardLayout"; // Import the specific tab value type

interface SettingsContentProps {
  section: string;
  // Props for lifted state for integrations tab
  integrationsTab?: IntegrationsTabValue; // Use specific type
  setIntegrationsTab?: React.Dispatch<React.SetStateAction<IntegrationsTabValue>>; // Use React's Dispatch type
}

export function SettingsContent({ section, integrationsTab, setIntegrationsTab }: SettingsContentProps) {
  const isMobile = useMediaQuery("(max-width: 768px)"); // Check for mobile screen size
  const [isVectorizing, setIsVectorizing] = useState(false); // State for schema vectorization
  const [vectorizeStatus, setVectorizeStatus] = useState<string | null>(null); // Status message for vectorization

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

  // Function to trigger schema vectorization - Moved from ConversationStatsView
  const handleVectorizeSchema = useCallback(async () => {
    setIsVectorizing(true);
    setVectorizeStatus("Vectorizing schema...");
    try {
      const { data, error } = await supabase.functions.invoke('vectorize-schema');

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setVectorizeStatus(data?.message || "Schema vectorization completed successfully.");
       toast({ title: "Schema Vectorization Success", description: data?.message });

    } catch (error) { // Explicitly type error as unknown or Error
      console.error("Error vectorizing schema:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setVectorizeStatus(`Error: ${errorMessage}`);
      toast({ title: "Schema Vectorization Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsVectorizing(false);
      // Optionally clear status message after a delay
      setTimeout(() => setVectorizeStatus(null), 5000);
    }
  }, []);


  if (section === 'billing') {
    return (
      <div className="p-6"> {/* Removed max-w-5xl mx-auto */}
        <BillingStats />
      </div>
    );
  }

  if (section === 'users') {
    return (
      <div className="p-4 md:p-6"> {/* Removed max-w-5xl mx-auto */}
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
    // Ensure integrationsTab and setIntegrationsTab are passed if they exist
    if (integrationsTab === undefined || setIntegrationsTab === undefined) {
      // Fallback or error handling if props are not passed, though they should be
      // This might indicate an issue with how props are threaded through
      console.error("Integrations tab state not provided to SettingsContent");
      return (
        <div className="p-4 md:p-6">
          Error: Integrations tab state missing.
        </div>
      );
    }
    return (
      <div className="p-4 md:p-6"> 
        <IntegrationsView 
          isActive={section === 'integrations'} 
          activeTab={integrationsTab} 
          setActiveTab={setIntegrationsTab} 
        />
      </div>
    );
  }

  if (section === 'access') {
    return (
      <div className="p-6"> {/* Removed max-w-5xl mx-auto */}
        <ProfileAccessManagement />
      </div>
    );
  }

  if (section === 'database') {
    return (
      <div className="p-6 space-y-4">
        {/* Title and subtitle removed */}

        {/* Vectorize Schema Button and Status */}
        <div className="pt-4 border-t">
          <h3 className="text-md font-medium mb-2">Schema Vectorization</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Update the vector embeddings for your database schema. This is used by AI features to understand your data structure.
          </p>
          <Button onClick={handleVectorizeSchema} disabled={isVectorizing} variant="outline" size="sm">
            {isVectorizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseZap className="mr-2 h-4 w-4" />}
            Vectorize Schema
          </Button>
          {/* Display vectorize status */}
          {vectorizeStatus && <p className={`text-sm ${vectorizeStatus.startsWith('Error') ? 'text-red-500' : 'text-green-600'} mt-2`}>{vectorizeStatus}</p>}
        </div>
      </div>
    );
  }

  // Default fallback for any other section
  return (
    <div className="p-6"> {/* Removed max-w-5xl mx-auto */}
      <h2 className="text-lg font-semibold">{section.charAt(0).toUpperCase() + section.slice(1)}</h2>
      <p className="text-muted-foreground">This section is under development.</p>
    </div>
  );
}
