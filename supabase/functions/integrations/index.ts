
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { 
  handleFetchInstances,
  handleConnectionState, 
  handleConnect 
} from "./handlers/instanceHandlers.ts";
import { handleSendWhatsAppMessage } from "./handlers/messageHandlers.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request URL and path
    const url = new URL(req.url);
    const path = url.pathname;
    console.log('Request path:', path);

    // Route requests to appropriate handlers
    if (req.method === 'POST' && path.includes('/message/sendText')) {
      console.log("Routing to handleSendWhatsAppMessage");
      return await handleSendWhatsAppMessage(req);
    } else if (req.method === 'GET' && path.includes('/instance/fetchInstances')) {
      console.log("fetchInstances called");
      return await handleFetchInstances();
    } else if (req.method === 'GET' && path.includes('/instance/connectionState/')) {
      const instanceId = path.split('/').pop();
      return await handleConnectionState(instanceId || '');
    } else if (req.method === 'GET' && path.includes('/instance/connect/')) {
      const instanceId = path.split('/').pop();
      return await handleConnect(instanceId || '');
    } else {
      // Handle unknown routes
      console.error('Invalid request path or method:', path, req.method);
      return new Response(
        JSON.stringify({ error: 'Invalid request path or method' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
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
