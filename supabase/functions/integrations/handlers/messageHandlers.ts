
import { corsHeaders } from "../../_shared/cors.ts";
import { EVO_API_BASE_URL, getEvolutionAPIOptions } from "../../_shared/evolution-api.ts";
import { getIntegrationConfig } from "../services/integrationService.ts";

// Handler for WhatsApp message sending
export async function handleSendWhatsAppMessage(req: Request) {
  try {
    const body = await req.json();
    console.log('Received request body:', body);
    
    // Extract parameters from the request body if provided, otherwise use default
    const { number, text, instanceId } = body;
    
    if (!number || !text || !instanceId) {
      console.error('Missing required parameters', { number, text, instanceId });
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: number, text, or instanceId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Prepare request to Evolution API
    const apiUrl = `${EVO_API_BASE_URL}/message/sendText/${instanceId}`;
    console.log('Sending request to Evolution API:', apiUrl);
    
    const options = {
      ...getEvolutionAPIOptions('POST'),
      body: JSON.stringify({
        number: number,
        text: text
      })
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
      })
  }
}
