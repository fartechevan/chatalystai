
import { corsHeaders } from "../../_shared/cors.ts";
import { EVO_API_BASE_URL, getEvolutionAPIOptions } from "../../_shared/evolution-api.ts";
import { getIntegrationConfig } from "../services/integrationService.ts";

// Handler for fetching WhatsApp instances
export async function handleFetchInstances() {
  try {
    const integration = await getIntegrationConfig();
    const apiKey = integration.api_key;
    
    const options = getEvolutionAPIOptions(apiKey);
    const response = await fetch(`${EVO_API_BASE_URL}/instance/fetchInstances`, options);
    const data = await response.json();
    
    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      }
    );
  } catch (error) {
    console.error('Error in handleFetchInstances:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

// Handler for checking connection state
export async function handleConnectionState(instanceId: string) {
  try {
    if (!instanceId) {
      throw new Error('Instance ID is required');
    }
    
    const integration = await getIntegrationConfig();
    const apiKey = integration.api_key;
    
    const options = getEvolutionAPIOptions(apiKey);
    const apiUrl = `${EVO_API_BASE_URL}/instance/connectionState/${instanceId}`;
    const response = await fetch(apiUrl, options);
    
    // Check if the response is valid JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Invalid response format:', text);
      throw new Error('Invalid response format from API');
    }
    
    const data = await response.json();
    
    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      }
    );
  } catch (error) {
    console.error('Error in handleConnectionState:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

// Handler for connecting to WhatsApp
export async function handleConnect(instanceId: string) {
  try {
    if (!instanceId) {
      throw new Error('Instance ID is required');
    }
    
    const integration = await getIntegrationConfig();
    const apiKey = integration.api_key;
    
    // We need to use POST method for connecting according to Evolution API docs
    const options = getEvolutionAPIOptions(apiKey, 'POST');
    const apiUrl = `${EVO_API_BASE_URL}/instance/connect/${instanceId}`;
    
    console.log(`Connecting to WhatsApp instance ${instanceId} at ${apiUrl}`);
    
    const response = await fetch(apiUrl, options);
    
    // Check if the response is valid JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Invalid response format:', text);
      throw new Error('Invalid response format from API');
    }
    
    const data = await response.json();
    console.log('WhatsApp connection response:', data);
    
    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      }
    );
  } catch (error) {
    console.error('Error in handleConnect:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}
