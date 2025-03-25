
import { corsHeaders } from "../_shared/cors.ts";
import { handleFetchInstances, handleConnectionState, handleConnect, handleLogout } from "./handlers/instanceHandlers.ts";
import { handleFindChats, handleFindMessages } from "./handlers/chatHandlers.ts";
import { handleSendTextMessage } from "./handlers/messageHandlers.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").filter(Boolean);
    
    // Remove 'integrations' from path if present as the first segment
    if (path[0] === "integrations") {
      path.shift();
    }
    
    console.log(`Request method: ${req.method}, path segments:`, path);
    
    let requestBody = {};
    try {
      if (req.method !== "GET" && req.method !== "HEAD") {
        requestBody = await req.json();
        console.log('Request body:', requestBody);
      }
    } catch (e) {
      // If JSON parsing fails, continue with empty object
      console.log('No request body or invalid JSON');
    }
    
    const { integration_id, action, instanceId, apiKey } = requestBody as { 
      integration_id?: string;
      action?: string;
      instanceId?: string;
      apiKey?: string;
    };
    
    // Handle different functionality based on path segments and request method
    switch (path[0]) {
      // Instance management endpoints
      case undefined:
      case "":
        // For the base endpoint, fetch WhatsApp instances
        return handleFetchInstances(integration_id);
      
      case "instance":
        if (path[1] === "connectionState" && path[2]) {
          return handleConnectionState(path[2], apiKey);
        } else if (path[1] === "connect" && path[2]) {
          return handleConnect(path[2], apiKey);
        } else if (path[1] === "logout" && path[2]) {
          return handleLogout(path[2]);
        } else if (path[1] === "connectionState" && !path[2]) {
          // Handle the case where instanceId is in the body instead of path
          return handleConnectionState(instanceId || '', apiKey || '');
        }
        break;
      
      // Chat endpoints
      case "chat":
        if (path[1] === "findChats") {
          return handleFindChats(req);
        } else if (path[1] === "findMessages") {
          return handleFindMessages(req);
        }
        break;
      
      // Message endpoints
      case "message":
        if (path[1] === "sendText") {
          return handleSendTextMessage(req);
        }
        break;
    }
    
    // Handle action-based operations from request body
    if (action === "logout" && instanceId) {
      return handleLogout(instanceId);
    }
    
    // If no matching endpoint found
    return new Response(
      JSON.stringify({ error: "Endpoint not found" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
