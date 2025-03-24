
import { corsHeaders } from "../../_shared/cors.ts";
import { EVO_API_BASE_URL, getEvolutionAPIOptions } from "../../_shared/evolution-api.ts";

// Handler for fetching WhatsApp instances
export async function handleFetchInstances() {
  try {
    console.log('Starting handleFetchInstances');
    
    // Set up API request using the EVOLUTION_API_KEY from environment
    const options = getEvolutionAPIOptions();
    console.log('Fetching instances from Evolution API...');
    console.log(`URL: ${EVO_API_BASE_URL}/instance/fetchInstances`);
    
    const response = await fetch(`${EVO_API_BASE_URL}/instance/fetchInstances`, options);
    console.log(`Response status: ${response.status}`);
    
    // Check if the response is valid JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Invalid response format:', text);
      throw new Error('Invalid response format from API');
    }
    
    const data = await response.json();
    console.log('Instances data retrieved successfully');
    
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
    
    const options = getEvolutionAPIOptions();
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
    
    // We need to use POST method for connecting according to Evolution API docs
    const options = getEvolutionAPIOptions('POST');
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
