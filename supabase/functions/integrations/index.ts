
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
    
    const { integration_id } = await req.json().catch(() => ({}));
    
    // Handle different functionality based on path segments and request method
    switch (path[0]) {
      // Instance management endpoints
      case undefined:
      case "":
        // For the base endpoint, fetch WhatsApp instances
        return handleFetchInstances(integration_id);
      
      case "instance":
        if (path[1] === "connectionState" && path[2]) {
          return handleConnectionState(path[2]);
        } else if (path[1] === "connect" && path[2]) {
          return handleConnect(path[2]);
        } else if (path[1] === "logout" && path[2]) {
          return handleLogout(path[2]);
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
