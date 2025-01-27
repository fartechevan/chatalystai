import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function BigQuerySync() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    try {
      setIsLoading(true);
      console.log("Initiating BigQuery sync...");
      
      const { data, error } = await supabase.functions.invoke('sync-bigquery', {
        body: { timestamp: new Date().toISOString() }
      });
      
      if (error) {
        console.error('Sync error:', error);
        throw error;
      }
      
      console.log("Sync response:", data);
      
      toast({
        title: "Sync Successful",
        description: `Sync completed with ID: ${data.syncId}`,
      });
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync with BigQuery",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleSync} 
      disabled={isLoading}
      className="w-full md:w-auto"
    >
      {isLoading ? "Syncing..." : "Sync BigQuery Data"}
    </Button>
  );
}