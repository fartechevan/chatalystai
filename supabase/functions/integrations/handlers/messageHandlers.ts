
import { corsHeaders } from "../../_shared/cors.ts";
import { EVO_API_BASE_URL, getEvolutionAPIOptions } from "../../_shared/evolution-api.ts";
import { getIntegrationConfig } from "../services/integrationService.ts";

// Handler for WhatsApp message sending
export async function handleSendWhatsAppMessage(req: Request) {
  try {
    const body = await req.json();
    console.log('Received request body:', body);
    
    // Extract parameters from the request body
    const { instanceId, number, text } = body;
    
    if (!number || !text) {
      console.error('Missing required parameters', { number, text });
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: number, or text' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Use the instanceId from the request if provided, otherwise use the one from integration config
    let actualInstanceId = instanceId;
    
    // Get API key from integration config
    const integration = await getIntegrationConfig();
    const apiKey = integration.api_key;

    // If no instanceId was provided in the request, use the one from integration config
    if (!actualInstanceId) {
      actualInstanceId = integration.instance_id;
      console.log('Using instance ID from integration config:', actualInstanceId);
    }

    // Prepare request to Evolution API
    const apiUrl = `${EVO_API_BASE_URL}/message/sendText/${actualInstanceId}`;
    console.log('Sending request to Evolution API:', apiUrl);
    
    // Construct the request body according to Evolution API's expected format
    const requestBody = {
      number: number,
      options: {
        delay: 1200
      },
      textMessage: {
        text: text
      }
    };

    console.log('Request body being sent to Evolution API:', JSON.stringify(requestBody, null, 2));
    
    const options = {
      ...getEvolutionAPIOptions(apiKey, 'POST'),
      body: JSON.stringify(requestBody)
    };

    console.log('Request options:', JSON.stringify(options, null, 2));
    
    // Send request to Evolution API
    const response = await fetch(apiUrl, options);
    const data = await response.json();
    
    console.log('Evolution API response:', data);
    
    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      }
    );
  } catch (error) {
    console.error('Error in handleSendWhatsAppMessage:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send WhatsApp message' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}
