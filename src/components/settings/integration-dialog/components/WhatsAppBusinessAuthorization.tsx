import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Integration } from "../../types";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react"; // Import icons

interface WhatsAppBusinessAuthorizationProps {
  selectedIntegration: Integration | null;
}

export function WhatsAppBusinessAuthorization({ selectedIntegration }: WhatsAppBusinessAuthorizationProps) {
  const [apiKey, setApiKey] = useState<string | null>(null); // Stores the fetched/saved key
  const [editableApiKey, setEditableApiKey] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false); // State to toggle visibility

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
      setApiKey(null); // Clear previous key
      setEditableApiKey(""); // Clear editable key

      try {
        console.log(`Fetching API key for integration ID: ${selectedIntegration.id}`);
        const { data, error: dbError } = await supabase
          .from('integrations')
          .select('api_key')
          .eq('id', selectedIntegration.id)
          .single();

        if (dbError) {
          // Handle case where row might not exist gracefully if needed
          if (dbError.code === 'PGRST116') { // PostgREST code for "Resource Not Found"
             console.warn("API key record not found for the selected integration.");
             setError("API key not configured for this integration.");
          } else {
            console.error("Error fetching API key:", dbError);
            throw new Error(dbError.message);
          }
        } else if (data?.api_key) {
          console.log("API key fetched successfully.");
          setApiKey(data.api_key);
          setEditableApiKey(data.api_key); // Initialize editable key
        } else {
           // This case might be redundant if PGRST116 is handled above, but good for safety
           console.warn("API key data is null/empty for the selected integration.");
           setError("API key not found or is empty for this integration.");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
        console.error("Caught error fetching API key:", errorMessage);
        setError(`Failed to fetch API key: ${errorMessage}`);
        // Avoid showing toast if it's just "not found"
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
    setError(null); // Clear previous save errors

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
      setApiKey(editableApiKey); // Update the internal 'saved' key state
      toast({ title: "Success", description: "API key updated successfully." });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      console.error("Caught error updating API key:", errorMessage);
      setError(`Failed to update API key: ${errorMessage}`); // Show save error
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
    <ScrollArea className="h-full">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Manage the API key for your WhatsApp connection.
        </p>

        <div className="space-y-4 mt-6">
          <h3 className="text-lg font-semibold">API Credentials</h3>
          {/* Input Group: Input + Show/Hide Button + Save Button */}
          <div className="flex items-start space-x-2"> {/* Use items-start for error message alignment */}
            {/* Container for Input and Show/Hide Button */}
            <div className="relative flex-grow">
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <>
                  <Input
                    type={showApiKey ? "text" : "password"}
                    placeholder={error && !apiKey ? "" : "Enter API Key"} // Clear placeholder if error shown instead
                    value={editableApiKey}
                    onChange={(e) => setEditableApiKey(e.target.value)}
                    className={`w-full font-mono pr-10 ${error && !apiKey ? 'border-red-500' : ''}`} // Add error border if needed
                    disabled={isLoading || isSaving || (error && !apiKey)} // Disable if error and no key
                  />
                  {/* Show/Hide Button - only render if not loading and not in error state without key */}
                  {!(error && !apiKey) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon" // Use size="icon" for better padding
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
            {/* Save Button */}
            <Button
              onClick={handleSaveApiKey}
              disabled={isLoading || isSaving || editableApiKey === apiKey || (error && !apiKey)} // Also disable if error and no key
              className="flex-shrink-0" // Prevent shrinking
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
          {/* Error Message Area */}
          {error && (
             <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
           )}
        </div>
        {/* Webhook Configuration section removed */}
      </div>
    </ScrollArea>
  );
}
