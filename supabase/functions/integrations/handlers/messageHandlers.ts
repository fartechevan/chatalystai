
import { corsHeaders } from "../../_shared/cors.ts";
import { getEvolutionAPIOptions, getInstanceApiUrl } from "../../_shared/evolution-api.ts";

export async function handleSendTextMessage(req: Request) {
  try {
    const requestData = await req.json();
    const { instanceId, number, text } = requestData;
    
    if (!instanceId || !number || !text) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: instanceId, number, or text" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log(`Sending text message from instance ${instanceId} to ${number}: ${text}`);
    
    // Format the API endpoint URL
    const apiUrl = getInstanceApiUrl('message/sendText', instanceId);
    
    // Set up request options
    const options = getEvolutionAPIOptions('POST', {
      number,
      options: { delay: 1200 },
      textMessage: { text }
    });
    
    console.log(`Making request to: ${apiUrl}`);
    
    // Send the message
    const response = await fetch(apiUrl, options);
    console.log(`Send message response status: ${response.status}`);
    
    // Check if the response is valid JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Invalid response format:', text);
      throw new Error('Invalid response format from API');
    }
    
    const data = await response.json();
    console.log('Send message response:', data);
    
    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      }
    );
  } catch (error) {
    console.error('Error in handleSendTextMessage:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}
