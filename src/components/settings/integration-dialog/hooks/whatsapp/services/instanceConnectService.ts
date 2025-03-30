import { supabase } from "@/integrations/supabase/client";

/**
 * Direct call to Evolution API as fallback
 */
export async function connectToInstance(
  baseUrl: string,
  instanceId: string,
  apiKey: string,
) {
  // Get current session token for auth
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token || '';
  
  // Create full URL for API call
  const apiUrl = `${baseUrl}/instance/connect/${instanceId}`;
  
  console.log(`Connecting to instance via Evolution API: ${apiUrl}`);
  
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey || '',
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    console.error(`Instance connection failed with status: ${response.status}`);
    const errorText = await response.text();
    console.error('Error response:', errorText);
    throw new Error(`Failed to connect: ${response.statusText}`);
  }
  
  return await response.json();
}
