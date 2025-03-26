
import { supabase } from "@/integrations/supabase/client";

/**
 * Call the Evolution API through our Edge Function
 */
export async function callEvolutionApiViaEdgeFunction(
  endpoint: string,
  instanceId: string,
  apiKey: string,
  body: any = {}
) {
  console.log(`Calling ${endpoint} through Edge Function for instance ${instanceId}`);
  
  try {
    const response = await supabase.functions.invoke(`integrations/${endpoint}`, {
      body: {
        instanceId,
        apiKey,
        ...body,
        action: endpoint.includes('/') ? endpoint.split('/').pop() : endpoint
      }
    });
    
    // Log full response for debugging
    console.log(`Edge function response for ${endpoint}:`, JSON.stringify(response, null, 2));
    
    if (response.error) {
      console.error(`Error from edge function (${endpoint}):`, response.error);
      throw new Error(response.error.message || `Failed to call ${endpoint}`);
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error calling ${endpoint} via Edge Function:`, error);
    throw error;
  }
}

/**
 * Direct call to Evolution API as fallback
 */
export async function callEvolutionApiDirectly(
  baseUrl: string,
  endpoint: string,
  instanceId: string,
  apiKey: string,
  body: any = {}
) {
  // Get current session token for auth
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token || '';
  
  // Create full URL for API call
  const apiUrl = `${baseUrl}/${endpoint}/${instanceId}`;
  
  console.log(`Direct fetch to Evolution API: ${apiUrl}`);
  
  const directResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey || '',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(body)
  });
  
  if (!directResponse.ok) {
    console.error(`Direct API call failed with status: ${directResponse.status}`);
    const errorText = await directResponse.text();
    console.error('Error response:', errorText);
    throw new Error(`Failed to connect: ${directResponse.statusText}`);
  }
  
  return await directResponse.json();
}
