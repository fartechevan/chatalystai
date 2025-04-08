import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast'; // Assuming you use Shadcn toast
import { Loader2 } from 'lucide-react';

export const EdgeFunctionTestButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const testInstanceId = 'test-instance'; // Placeholder ID for status check

  const handleTestClick = async () => {
    setIsLoading(true);
    console.log('--- Edge Function Test Start ---');
    let keyResult: unknown = null; // Use unknown instead of any
    let statusResult: unknown = null; // Use unknown instead of any
    let keyErrorMsg: string | null = null;
    let statusErrorMsg: string | null = null;

    const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlemR4eHF6emNqa3Vub2F4Y3hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzczODA2MjcsImV4cCI6MjA1Mjk1NjYyN30.ypX-5S8PCV_b-zbJiJW94aRsXd5lUO9TMjXXSdcE2Cw";
    const authHeader = { Authorization: `Bearer ${anonKey}` };

    // 1. Test get-evolution-key
    try {
      console.log('Testing get-evolution-key with explicit anon key header...');
      const { data, error } = await supabase.functions.invoke('get-evolution-key', {
        headers: authHeader, // Force use of anon key
      });
      if (error) {
        console.error('Error invoking get-evolution-key:', error);
        keyErrorMsg = `get-evolution-key Error: ${error.message || 'Unknown error'}`;
        if (error.context) console.error('get-evolution-key context:', error.context);
        keyResult = { error: error.message, context: error.context };
      } else {
        console.log('Success invoking get-evolution-key:', data);
        keyResult = data;
        // Only proceed if key retrieval was successful
        // 2. Test check-whatsapp-status
        try {
          console.log(`Testing check-whatsapp-status with instanceId: ${testInstanceId} and explicit anon key header...`);
          const { data: statusData, error: statusError } = await supabase.functions.invoke('check-whatsapp-status', {
            body: { instanceId: testInstanceId },
            headers: authHeader, // Force use of anon key
          });
          if (statusError) {
            console.error('Error invoking check-whatsapp-status:', statusError);
            statusErrorMsg = `check-whatsapp-status Error: ${statusError.message || 'Unknown error'}`;
            if (statusError.context) console.error('check-whatsapp-status context:', statusError.context);
            statusResult = { error: statusError.message, context: statusError.context };
          } else {
            console.log('Success invoking check-whatsapp-status:', statusData);
            statusResult = statusData;
          }
        } catch (e) {
          console.error('Exception during check-whatsapp-status call:', e);
          statusErrorMsg = `check-whatsapp-status Exception: ${e instanceof Error ? e.message : String(e)}`;
          statusResult = { exception: statusErrorMsg };
        }
      }
    } catch (e) {
      console.error('Exception during get-evolution-key call:', e);
      keyErrorMsg = `get-evolution-key Exception: ${e instanceof Error ? e.message : String(e)}`;
      keyResult = { exception: keyErrorMsg };
    }

    console.log('--- Edge Function Test End ---');
    setIsLoading(false);

    // Show toast summary
    toast({
      title: 'Edge Function Test Results',
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white text-xs whitespace-pre-wrap">
            {`get-evolution-key:\n${JSON.stringify(keyResult, null, 2)}\n\ncheck-whatsapp-status:\n${JSON.stringify(statusResult, null, 2)}`}
          </code>
        </pre>
      ),
      variant: (keyErrorMsg || statusErrorMsg) ? 'destructive' : 'default',
      duration: 15000, // Show longer for readability
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="fixed bottom-4 right-4 z-50 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
      onClick={handleTestClick}
      disabled={isLoading}
    >
      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Test Edge Functions
    </Button>
  );
};
