import { corsHeaders } from "../../_shared/cors.ts";
import { EVO_API_BASE_URL, getEvolutionAPIOptions, getInstanceApiUrl } from "../../_shared/evolution-api.ts";
import { saveIntegrationConfigFromInstances } from "../services/integrationService.ts";

// Handler for fetching WhatsApp instances
export async function handleFetchInstances(integrationId?: string) {
  try {
    console.log('Starting handleFetchInstances with integrationId:', integrationId);
    
    // Set up API request using the EVOLUTION_API_KEY from environment
    const options = getEvolutionAPIOptions();
    console.log(`Fetching instances from Evolution API...`);
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
    
    const instances = await response.json();
    console.log('Instances data retrieved successfully:', instances);
    console.log('Number of instances:', Array.isArray(instances) ? instances.length : 'not an array');
    
    // Log full instance details for debugging
    if (Array.isArray(instances)) {
      instances.forEach((instance, index) => {
        console.log(`Instance ${index + 1}:`, JSON.stringify(instance));
      });
    }
    
    // Enhance instance information by fetching connection state for each
    const enhancedInstances = [];
    if (Array.isArray(instances)) {
      for (const instance of instances) {
        try {
          // Try to get instance details including ownerJid
          const instanceId = instance.id || instance.instance?.instanceId;
          if (instanceId) {
            console.log(`Fetching connection state for instance ${instanceId}`);
            const instanceStateResponse = await fetch(`${EVO_API_BASE_URL}/instance/connectionState/${instanceId}`, options);
            
            if (instanceStateResponse.ok) {
              const stateData = await instanceStateResponse.json();
              console.log(`Instance ${instanceId} state:`, stateData);
              
              // Merge the instance data with its state information
              enhancedInstances.push({
                ...instance,
                ...stateData,
                ownerJid: stateData.owner || stateData.instance?.owner || instance.owner
              });
            } else {
              console.warn(`Failed to get connection state for instance ${instanceId}:`, instanceStateResponse.status);
              enhancedInstances.push(instance);
            }
          } else {
            console.warn('Instance without ID:', instance);
            enhancedInstances.push(instance);
          }
        } catch (instanceError) {
          console.error('Error enhancing instance data:', instanceError);
          enhancedInstances.push(instance);
        }
      }
    }
    
    const finalInstances = enhancedInstances.length > 0 ? enhancedInstances : instances;
    console.log('Final instances to return:', finalInstances);
    
    // If an integrationId is provided, save the instances data to the database
    if (integrationId && Array.isArray(finalInstances)) {
      console.log(`Saving ${finalInstances.length} instances for integration ${integrationId} to database`);
      await saveIntegrationConfigFromInstances(integrationId, finalInstances);
    }
    
    return new Response(
      JSON.stringify(finalInstances),
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
    console.log(`Checking connection state for instance ${instanceId} at ${apiUrl}`);
    
    const response = await fetch(apiUrl, options);
    console.log(`Connection state response status: ${response.status}`);
    
    // Check if the response is valid JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Invalid response format:', text);
      throw new Error('Invalid response format from API');
    }
    
    const data = await response.json();
    console.log('Connection state response data:', data);
    
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
    console.log(`Connect response status: ${response.status}`);
    
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

// Handler for logging out WhatsApp instance
export async function handleLogout(instanceId: string) {
  try {
    if (!instanceId) {
      throw new Error('Instance ID is required');
    }
    
    // We need to use DELETE method for logout according to Evolution API docs
    const options = getEvolutionAPIOptions('DELETE');
    const apiUrl = getInstanceApiUrl('instance/logout', instanceId);
    
    console.log(`Logging out WhatsApp instance ${instanceId} at ${apiUrl}`);
    
    const response = await fetch(apiUrl, options);
    console.log(`Logout response status: ${response.status}`);
    
    // Check if the response is valid JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Invalid response format:', text);
      throw new Error('Invalid response format from API');
    }
    
    const data = await response.json();
    console.log('WhatsApp logout response:', data);
    
    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      }
    );
  } catch (error) {
    console.error('Error in handleLogout:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}
