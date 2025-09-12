import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Integration } from "../../types";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";

interface WhatsAppBusinessAuthorizationProps {
  selectedIntegration: Integration | null;
}

export function WhatsAppBusinessAuthorization({ selectedIntegration }: WhatsAppBusinessAuthorizationProps) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [editableApiKey, setEditableApiKey] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  // Fetch the API key when the component mounts or selectedIntegration changes
  useEffect(() => {
    const fetchApiKey = async () => {
      if (!selectedIntegration?.id) {
        setApiKey(null);
        setEditableApiKey("");
        setError("No integration selected.");
        return;
      }

      setIsLoading(true);
      setError(null);
      setApiKey(null);
      setEditableApiKey("");

      try {
        console.log(`Fetching API key for integration ID: ${selectedIntegration.id}`);
        const { data, error: dbError } = await supabase
          .from('integrations')
          .select('api_key')
          .eq('id', selectedIntegration.id)
          .single();

        if (dbError) {
          if (dbError.code === 'PGRST116') {
             console.warn("API key record not found for the selected integration.");
             setError("API key not configured for this integration.");
          } else {
            console.error("Error fetching API key:", dbError);
            throw new Error(dbError.message);
          }
        } else if (data?.api_key) {
          console.log("API key fetched successfully.");
          setApiKey(data.api_key);
          setEditableApiKey(data.api_key);
        } else {
           console.warn("API key data is null/empty for the selected integration.");
           setError("API key not found or is empty for this integration.");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
        console.error("Caught error fetching API key:", errorMessage);
        setError(`Failed to fetch API key: ${errorMessage}`);
        if (!errorMessage.includes('Resource Not Found')) {
            toast({
              title: "Error Fetching API Key",
              description: errorMessage,
              variant: "destructive",
            });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchApiKey();
  }, [selectedIntegration]);

  // Handle saving the edited API key
  const handleSaveApiKey = async () => {
    if (!selectedIntegration?.id) {
      toast({ title: "Error", description: "No integration selected.", variant: "destructive" });
      return;
    }
    if (editableApiKey === apiKey) {
      toast({ title: "No Changes", description: "API key hasn't changed.", variant: "default" });
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      console.log(`Updating API key for integration ID: ${selectedIntegration.id}`);
      const { error: updateError } = await supabase
        .from('integrations')
        .update({ api_key: editableApiKey })
        .eq('id', selectedIntegration.id);

      if (updateError) {
        console.error("Error updating API key:", updateError);
        throw new Error(updateError.message);
      }

      console.log("API key updated successfully.");
      setApiKey(editableApiKey);
      toast({ title: "Success", description: "API key updated successfully." });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      console.error("Caught error updating API key:", errorMessage);
      setError(`Failed to update API key: ${errorMessage}`);
      toast({
        title: "Error Saving API Key",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 flex-1">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">API Credentials</h3>
        <div className="flex items-start space-x-2">
          <div className="relative flex-grow">
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <>
                <Input
                  type={showApiKey ? "text" : "password"}
                  placeholder={error && !apiKey ? "" : "Enter API Key"}
                  value={editableApiKey}
                  onChange={(e) => setEditableApiKey(e.target.value)}
                  className={`w-full font-mono pr-10 ${error && !apiKey ? 'border-red-500' : ''}`}
                  disabled={isLoading || isSaving || (error && !apiKey)}
                />
                {!(error && !apiKey) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowApiKey(!showApiKey)}
                    disabled={isLoading || isSaving}
                    aria-label={showApiKey ? "Hide API Key" : "Show API Key"}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                )}
              </>
            )}
          </div>
          <Button
            onClick={handleSaveApiKey}
            disabled={isLoading || isSaving || editableApiKey === apiKey || (error && !apiKey)}
            className="flex-shrink-0"
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
        {error && (
           <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
         )}
      </div>
    </div>
  );
}
