
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { 
  handleFetchInstances,
  handleConnectionState, 
  handleConnect 
} from "./handlers/instanceHandlers.ts";
import { handleSendWhatsAppMessage } from "./handlers/messageHandlers.ts";
import { handleFindChats, handleFindMessages } from "./handlers/chatHandlers.ts";

serve(async (req) => {
  console.log("Request received:", req.method, req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request URL and path
    const url = new URL(req.url);
    const path = url.pathname;
    console.log('Request path:', path);

    // Extract request body if present
    let requestBody = {};
    if (req.method === 'POST') {
      try {
        const bodyText = await req.text();
        if (bodyText) {
          requestBody = JSON.parse(bodyText);
          console.log('Request body:', requestBody);
        }
      } catch (error) {
        console.error('Error parsing request body:', error);
      }
    }

    // Route requests to appropriate handlers
    if (req.method === 'POST' && path.includes('/message/sendText')) {
      console.log("Routing to handleSendWhatsAppMessage");
      return await handleSendWhatsAppMessage(req);
    } else if (path.includes('/chat/findChats')) {
      console.log("Routing to handleFindChats");
      return await handleFindChats(req);
    } else if (path.includes('/chat/findMessages')) {
      console.log("Routing to handleFindMessages");
      return await handleFindMessages(req);
    } else if (path.includes('/instance/connectionState/')) {
      const instanceId = path.split('/').pop();
      console.log(`Routing to handleConnectionState for instance ${instanceId}`);
      return await handleConnectionState(instanceId || '');
    } else if (path.includes('/instance/connect/')) {
      const instanceId = path.split('/').pop();
      console.log(`Routing to handleConnect for instance ${instanceId}`);
      return await handleConnect(instanceId || '');
    } else {
      // Default handler for fetching instances
      console.log("Routing to handleFetchInstances");
      
      let integrationId = null;
      
      // Check different ways the integration_id might be provided
      if (req.method === 'POST' && requestBody && 'integration_id' in requestBody) {
        integrationId = requestBody.integration_id;
      } else if (url.searchParams.has('integration_id')) {
        integrationId = url.searchParams.get('integration_id');
      }
      
      console.log('Integration ID for fetchInstances:', integrationId);
      return await handleFetchInstances(integrationId || undefined);
    }
  } catch (error) {
    // Handle unhandled errors
    console.error('Unhandled error in request processing:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
