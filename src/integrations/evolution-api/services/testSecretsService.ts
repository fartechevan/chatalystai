import { supabase } from "@/integrations/supabase/client";

    async function testSecrets() {
      console.log("Invoking test-secrets Supabase function...");
      try {
        // Ensure the function name matches the deployed function directory
        const { data, error } = await supabase.functions.invoke('test-secrets');

        if (error) {
          console.error('Error invoking test-secrets function:', error);
          let errorDetails = error.message;
           if (typeof error === 'object' && error !== null && 'context' in error && typeof (error as { context: unknown }).context === 'object' && (error as { context: unknown }).context !== null && 'details' in (error as { context: { details: unknown } }).context) {
              errorDetails = (error as { context: { details: string } }).context.details || error.message;
          }
          console.error("test-secrets invocation error details:", errorDetails);
          // Use alert for immediate feedback in the UI
          alert(`Error invoking test-secrets: ${errorDetails}`); 
          return null;
        }

        console.log('Response from test-secrets function:', data);
        // Use alert to display the result directly in the UI
        alert(`Secrets Status:\nAPI Key: ${data.EVOLUTION_API_KEY}\nAPI URL: ${data.EVOLUTION_API_URL}`); 
        return data;

      } catch (err) {
        console.error('Error during testSecrets service call:', err);
        alert(`Failed to call test-secrets function: ${(err as Error).message}`);
        return null;
      }
    }

    export default testSecrets;
